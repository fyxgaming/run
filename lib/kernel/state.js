/**
 * state.js
 *
 * Captures and recreates jig and berry state for the cache
 */

const bsv = require('bsv')
const Log = require('../util/log')
const { _kernel, _assert, _parentName, _checkState } = require('../util/misc')
const { StateError } = require('../util/errors')
const File = require('./file')
const Codec = require('../util/codec')
const Sandbox = require('../util/sandbox')
const Membrane = require('./membrane')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'State'

// ------------------------------------------------------------------------------------------------
// _Partial
// ------------------------------------------------------------------------------------------------

/**
 * A partially loaded jig or berry from the state cache.
 *
 * The completer finishes the load but it may be referenced before then.
 */
class _Partial {
  constructor (value, completer) {
    _assert(completer instanceof Promise)
    this._value = value
    this._completer = completer
  }
}

// ------------------------------------------------------------------------------------------------
// _recreate
// ------------------------------------------------------------------------------------------------

/**
 * Recreates a jig or berry from the cache
 *
 * @returns {?_Partial} A partial load or undefined if the state doesn't exist in the cache
 */
async function _recreate (key, hash = undefined, loader = undefined) {
  Log._debug(TAG, 'Recreate', key)

  // Create a loader if there is none
  const Loader = require('./loader')
  loader = loader || new Loader(_kernel())

  // Get the state from the cache if it exists
  const state = await loader._kernel._cache.get(key)
  if (!state) return undefined

  // Check that the version is supported by this loader
  const { _PROTOCOL_VERSION } = require('./commit')
  const version = Buffer.from(_PROTOCOL_VERSION).toString('hex')
  _checkState(state.version === version, `Unsupported state version: ${state.version}`)

  // Check that the hash matches
  if (hash) {
    const stateString = JSON.stringify(state)
    const stateBuffer = new bsv.deps.Buffer(stateString, 'utf8')
    const stateHash = bsv.crypto.Hash.sha256(stateBuffer)
    const stateHashHex = stateHash.toString('hex')
    _checkState(stateHashHex === hash, `State hash mismatch for ${key}`)
  }

  // Get the referenced jigs out of the state by decoding with dummy jigs
  // Dummy jigs are classes so that setPrototypeOf works for arbitrary objects
  const refs = new Map()
  const makeDummyJig = x => { class A {}; A.location = x; return A }
  const codec = new Codec()._loadJigs(x => { refs.set(x, null); return makeDummyJig(x) })
  const decodedState = codec._decode(state)

  // Extract the txid from the key
  const txid = key.split('//')[1].split('_')[0]

  switch (decodedState.kind) {
    case 'code': return _recreateCode(state, decodedState, refs, txid, loader)
    case 'jig': return _recreateJig(decodedState, txid)
    case 'berry': return _recreateBerry(decodedState, txid)
    default: throw new StateError(`Unknown jig kind: ${decodedState.kind}`)
  }
}

// ------------------------------------------------------------------------------------------------

async function _recreateCode (state, decodedState, refs, txid, loader) {
  const env = {}

  // Preload the parent if there is one
  const parentName = _parentName(decodedState.src)
  if (parentName) {
    const parentLocation = decodedState.props.deps[parentName].location
    const parentFullLocation = parentLocation.startsWith('_') ? txid + parentLocation : parentLocation
    const Parent = await loader._load(parentFullLocation)
    refs.set(parentLocation, Parent)
    env[parentName] = Parent
  }

  // Create the code without any properties
  const [S, SGlobal] = Sandbox._evaluate(decodedState.src, env)
  const file = new File(S, false /* local */)

  // Finishing loading the jig in parallel in a completer
  const complete = async () => {
    // Load the remaining refs
    for (const ref of refs.keys()) {
      if (refs.has(ref)) continue
      const refFullLocation = ref.startsWith('_') ? txid + ref : ref
      const jig = await loader._load(refFullLocation)
      refs.set(ref, jig)
    }

    // Redecode the state with the partially loaded refs
    const codec = new Codec()._loadJigs(x => {
      const jig = refs.get(x)
      const refFullLocation = x.startsWith('_') ? txid + x : x
      _checkState(jig, `Jig not loaded: ${refFullLocation}`)
      return jig
    })
    const redecodedState = codec._decode(state)

    // Update the code with the new dependencies
    Object.assign(SGlobal, redecodedState.props.deps)

    const C = file._jig

    // Apply the props to the code
    Membrane._sudo(() => {
      Object.assign(C, redecodedState.props)
      if (C.origin.startsWith('_')) C.origin = txid + C.origin
      if (C.location.startsWith('_')) C.location = txid + C.location
    })
  }

  const promise = complete()

  return new _Partial(file._jig, promise)
}

// ------------------------------------------------------------------------------------------------

async function _recreateJig (decodedState, txid) {
// TODO
  return new _Partial({ $jig: 123 }, Promise.resolve())
}

// ------------------------------------------------------------------------------------------------

async function _recreateBerry (decodedState, txid) {
// TODO
  return new _Partial({ $berry: 123 }, Promise.resolve())
}

// ------------------------------------------------------------------------------------------------

module.exports = { _recreate }
