/**
 * state.js
 *
 * Captures and recreates jig and berry state for the cache
 */

const bsv = require('bsv')
const Log = require('../util/log')
const { _kernel, _assert, _parentName, _sameJig, _hasJig, _checkState, _text } = require('../util/misc')
const { _deepVisit } = require('../util/deep')
const { StateError } = require('../util/errors')
const Code = require('./code')
const Codec = require('../util/codec')
const Sandbox = require('../util/sandbox')
const Membrane = require('./membrane')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'State'

const STATE_VERSION = '01' // hex

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
async function _recreate (key, hash, loader) {
  // Create a loader if there is none
  const Loader = require('./loader')
  loader = loader || new Loader(_kernel())

  // Get the state from the cache if it exists
  const state = await loader._kernel._cache.get(key)
  if (!state) return undefined

  Log._info(TAG, 'Recreate', key)

  // Check that the version is supported by this loader
  _checkState(state.version === STATE_VERSION, `Unsupported state version: ${state.version}`)

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
  const C = new Code(S, false /* local */)

  // Finishing loading the jig in parallel in a completer
  const complete = async () => {
    // Load the remaining refs
    for (const ref of refs.keys()) {
      if (refs.get(ref)) continue
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

    // Apply the props to the code
    Membrane._sudo(() => {
      Object.assign(C, redecodedState.props)
      if (C.origin.startsWith('_')) C.origin = txid + C.origin
      if (C.location.startsWith('_')) C.location = txid + C.location
    })
  }

  const promise = complete()

  return new _Partial(C, promise)
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
// _capture
// ------------------------------------------------------------------------------------------------

async function _capture (jig, commit) {
  Log._debug(TAG, 'Capture', _text(jig))

  const after = commit._after.get(jig)
  _assert(after)

  // Create the state to encode
  const state = { }
  state.version = STATE_VERSION
  state.kind = after._kind
  state.props = Object.assign({}, after._props)
  if (after._cls) state.cls = after._cls
  if (after._innerType) state.src = after._innerType.toString()

  // Localize origin and location
  const vout = commit._outputs.findIndex(x => _sameJig(x, jig))
  const vdel = commit._deletes.findIndex(x => _sameJig(x, jig))
  const localLocation = vout === -1 ? `_d${vdel}` : `_o${vout + 1}`

  if (state.props.origin.startsWith(commit._id)) state.props.origin = localLocation
  state.props.location = localLocation

  // Load the previous state's references to use when we don't spend
  const referenceMap = await createReferenceMap(jig, commit)

  // Create the codec used to encode the state
  const codec = new Codec()._saveJigs(x => {
    const vout = commit._outputs.findIndex(y => _sameJig(x, y))
    if (vout >= 0) return `_o${vout + 1}`

    const vdel = commit._deletes.findIndex(y => _sameJig(x, y))
    if (vdel >= 0) return `_d${vdel}`

    const ref = commit._refs.find(y => _sameJig(x, y))
    if (ref) return commit._before.get(ref)._props.location

    const origin = Membrane._sudo(() => x.origin)
    if (origin.startsWith('native://')) return origin

    const referenceLocation = referenceMap.get(origin)
    _assert(referenceLocation)
    return referenceLocation
  })

  // Encode the state with local locations
  const encodedState = codec._encode(state)

  return encodedState
}

// ------------------------------------------------------------------------------------------------

async function createReferenceMap (jig, commit) {
  if (_hasJig(commit._creates, jig)) return new Map()

  const location = commit._before.get(jig)._props.location

  // Load the jig before. Ideally, with no inners.
  const Loader = require('./loader')
  const loader = new Loader(commit._kernel, commit._importLimit)
  const prev = await loader._load(location)

  const map = new Map()

  const Jig = require('./jig')
  const Berry = require('./berry')
  const Code = require('./code')

  // Map all inner origins to locations
  _deepVisit(prev, x => {
    if (x instanceof Jig || x instanceof Code || x instanceof Berry) {
      Membrane._sudo(() => map.set(x.origin || x.location, x.location))
    }
  })

  return map
}

// ------------------------------------------------------------------------------------------------

function _hash (state) {
  const stateString = JSON.stringify(state)
  const stateBuffer = bsv.deps.Buffer.from(stateString, 'utf8')

  const stateHashBuffer = bsv.crypto.Hash.sha256(stateBuffer)
  const stateHashString = stateHashBuffer.toString('hex')

  return stateHashString
}

// ------------------------------------------------------------------------------------------------

module.exports = { _recreate, _capture, _hash }
