/**
 * state.js
 *
 * Captures and recreates jig and berry state for the cache
 */

const bsv = require('bsv')
const Log = require('../util/log')
const {
  _kernel, _assert, _parentName, _sameJig, _checkState, _text, _setOwnProperty,
  _deterministicJSONStringify
} = require('../util/misc')
const { StateError } = require('../util/errors')
const { _sudo } = require('../util/admin')
const Code = require('./code')
const Membrane = require('./membrane')
const Rules = require('./rules')
const Codec = require('../util/codec')
const Sandbox = require('../sandbox/sandbox')
const { _JIGS } = require('./universal')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'State'

// The version exists is for users to parse state cache entries not for consensus.
const STATE_VERSION = '04' // hex

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
// _captureJig
// ------------------------------------------------------------------------------------------------

async function _captureJig (jig, commit, timeout) {
  if (Log._debugOn) Log._debug(TAG, 'Capture', _text(jig))

  const after = commit._after.get(jig)
  _assert(after)

  // Load the previous state's references to use when we don't spend
  const refmap = await commit._buildRefmap(timeout)
  timeout._check()

  // Create the codec used to encode the state
  const codec = new Codec()._saveJigs(x => {
    const vout = commit._outputs.findIndex(y => _sameJig(x, y))
    if (vout >= 0) return `_o${vout + 1}`

    const vdel = commit._deletes.findIndex(y => _sameJig(x, y))
    if (vdel >= 0) return `_d${vdel}`

    const ref = commit._refs.find(y => _sameJig(x, y))
    if (ref) return commit._before.get(ref)._props.location

    const origin = _sudo(() => x.origin)
    if (origin.startsWith('native://')) return origin

    const beforeRefLocation = refmap[origin] && refmap[origin][0]
    _assert(beforeRefLocation)
    return beforeRefLocation
  })

  // Create the state data to encode. The order is always alphabetical:
  //
  //    [cls, kind, props, src, version]
  //
  // props too is also sorted in alphabetical order

  const state = {}

  // cls
  if (after._cls) state.cls = codec._encode(after._cls)

  // kind
  state.kind = after._kind

  // props
  const props = Object.assign({}, after._props)
  const vout = commit._outputs.findIndex(x => _sameJig(x, jig))
  const vdel = commit._deletes.findIndex(x => _sameJig(x, jig))
  const localLocation = vout === -1 ? `_d${vdel}` : `_o${vout + 1}`
  _assert(!props.origin.startsWith('commit://') || props.origin.startsWith(commit._id))
  if (props.origin.startsWith(commit._id) || props.origin.startsWith(commit._txid)) props.origin = localLocation
  props.location = localLocation
  state.props = codec._encode(props)

  // src
  if (after._src) state.src = after._src

  // version
  state.version = STATE_VERSION

  return state
}

// ------------------------------------------------------------------------------------------------
// _captureBerry
// ------------------------------------------------------------------------------------------------

function _captureBerry (berry) {
  // TODO
  return { }
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
  const state = await loader._kernel._cacheAPI().get(key)
  if (!state) return undefined

  if (Log._infoOn) Log._info(TAG, 'Recreate', key)

  // Check that the version is supported by this loader
  _checkState(state.version === STATE_VERSION, `Unsupported state version: ${state.version}`)

  // Check that the hash matches
  if (hash) {
    const stateString = _deterministicJSONStringify(state)
    const stateBuffer = new bsv.deps.Buffer(stateString, 'utf8')
    const stateHash = bsv.crypto.Hash.sha256(stateBuffer)
    const stateHashHex = stateHash.toString('hex')
    _checkState(stateHashHex === hash, `State hash mismatch for ${key}`)
  }

  // Get the referenced jigs out of the state by decoding with dummy jigs
  // Dummy jigs are classes so that setPrototypeOf works for arbitrary objects
  const refs = new Map()
  const makeDummyJig = x => { class A {}; A.location = x; return A }
  const codec = new Codec()
    ._toSandbox()
    ._loadJigs(x => { refs.set(x, null); return makeDummyJig(x) })

  // Extract referenced jigs from props
  const decodedProps = codec._decode(state.props)

  // Extract referenced jigs from the class
  if (state.cls) codec._decode(state.cls)

  // Extract the txid from the key
  const txid = key.split('//')[1].split('_')[0]

  switch (state.kind) {
    case 'code': return _recreateCode(state, decodedProps, refs, txid, loader)
    case 'jig': return _recreateJig(state, decodedProps, refs, txid, loader)
    case 'berry': return _recreateBerry(decodedProps, txid)
    default: throw new StateError(`Unknown jig kind: ${state.kind}`)
  }
}

// ------------------------------------------------------------------------------------------------

async function _recreateCode (state, decodedProps, refs, txid, loader) {
  const env = {}

  // Preload the parent if there is one
  const parentName = _parentName(state.src)
  if (parentName) {
    const parentLocation = decodedProps.deps[parentName].location
    const parentFullLocation = parentLocation.startsWith('_') ? txid + parentLocation : parentLocation
    const Parent = await loader._load(parentFullLocation, undefined, true)
    refs.set(parentLocation, Parent)
    env[parentName] = Parent
  }

  // Create the code without any properties
  const C = new Code()
  const T = Sandbox._evaluate(state.src, env)[0]
  const [S, SGlobal] = Code._makeSandbox(C, T)
  const local = false
  Code._editor(C)._install(S, local)

  // Finishing loading the jig in parallel in a completer
  const complete = async () => {
    // Load the remaining refs
    for (const ref of refs.keys()) {
      if (refs.get(ref)) continue
      const refFullLocation = ref.startsWith('_') ? txid + ref : ref
      const jig = await loader._load(refFullLocation, undefined, true)
      refs.set(ref, jig)
    }

    // Redecode the props with the partially loaded refs
    function jigLoader (x) {
      const jig = refs.get(x)
      const refFullLocation = x.startsWith('_') ? txid + x : x
      _checkState(jig, `Jig not loaded: ${refFullLocation}`)
      return jig
    }

    const codec = new Codec()
      ._toSandbox()
      ._loadJigs(jigLoader)

    const redecodedProps = codec._decode(state.props)

    // Apply the now loaded props to the code
    _sudo(() => {
      // Delete all the existing keys first. Particularly bindings. Otherwise, ordering bugs.
      Object.keys(C).forEach(key => { delete C[key] })
      Object.keys(redecodedProps).forEach(key => _setOwnProperty(C, key, redecodedProps[key]))
    })

    // Apply final bindings to the code
    _sudo(() => {
      if (C.origin.startsWith('_')) C.origin = txid + C.origin
      if (C.location.startsWith('_')) C.location = txid + C.location
    })

    // Make the deps update the globals in the sandbox as we'd expect
    _sudo(() => {
      const deps = Code._makeDeps(C, SGlobal, C.deps)
      _setOwnProperty(C, 'deps', deps)
      // Update the globals with the new dependencies using the new deps wrapper.
      Object.keys(redecodedProps.deps || {}).forEach(prop => {
        C.deps[prop] = redecodedProps.deps[prop]
      })
    })

    // Notify listeners
    loader._kernel._emit('load', C)
  }

  const promise = complete()

  return new _Partial(C, promise)
}

// ------------------------------------------------------------------------------------------------

async function _recreateJig (state, decodedState, refs, txid, loader) {
  // Wrap the decoded state in a jig membrane
  const rules = Rules._jigInstance()
  const jig = new Membrane(decodedState, rules)

  // Force it to be a jig
  _JIGS.add(jig)

  async function complete () {
    // Load the remaining refs
    for (const ref of refs.keys()) {
      if (refs.get(ref)) continue
      const refFullLocation = ref.startsWith('_') ? txid + ref : ref
      const jig = await loader._load(refFullLocation, undefined, true)
      refs.set(ref, jig)
    }

    // Assign the class onto the jig
    const C = refs.get(state.cls.$jig)
    _sudo(() => Object.setPrototypeOf(jig, C.prototype))

    // Redecode the props with the partially loaded refs
    function jigLoader (x) {
      const jig = refs.get(x)
      const refFullLocation = x.startsWith('_') ? txid + x : x
      _checkState(jig, `Jig not loaded: ${refFullLocation}`)
      return jig
    }

    const codec = new Codec()
      ._toSandbox()
      ._loadJigs(jigLoader)

    const redecodedProps = codec._decode(state.props)

    // Apply now loaded props to the code
    _sudo(() => {
      Object.keys(redecodedProps).forEach(key => {
        _setOwnProperty(jig, key, redecodedProps[key])
      })
    })

    // Apply final bindings to the code
    _sudo(() => {
      if (jig.origin.startsWith('_')) jig.origin = txid + jig.origin
      if (jig.location.startsWith('_')) jig.location = txid + jig.location
    })

    // Notify listeners
    loader._kernel._emit('load', jig)
  }

  const promise = complete()

  return new _Partial(jig, promise)
}

// ------------------------------------------------------------------------------------------------

async function _recreateBerry (decodedState, txid) {
  // TODO
  return new _Partial({ $berry: 123 }, Promise.resolve())
}

// ------------------------------------------------------------------------------------------------
// _hashState
// ------------------------------------------------------------------------------------------------

function _hashState (state) {
  const stateString = _deterministicJSONStringify(state)
  const stateBuffer = bsv.deps.Buffer.from(stateString, 'utf8')

  const stateHashBuffer = bsv.crypto.Hash.sha256(stateBuffer)
  const stateHashString = stateHashBuffer.toString('hex')

  return stateHashString
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _captureJig,
  _captureBerry,
  _recreate,
  _hashState
}
