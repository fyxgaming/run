/**
 * state.js
 *
 * Captures and recreates jig and berry state for the cache
 */

const bsv = require('bsv')
const Log = require('../util/log')
const {
  _kernel, _assert, _parentName, _text, _setOwnProperty,
  _deterministicJSONStringify, _defined, _JIGS, _BERRIES
} = require('../util/misc')
const { _location, _compileLocation } = require('../util/bindings')
const { StateError } = require('../util/errors')
const { _sudo } = require('../util/admin')
const { _sha256 } = require('../util/bsv')
const Editor = require('./editor')
const Membrane = require('./membrane')
const Rules = require('./rules')
const Codec = require('../util/codec')
const Sandbox = require('../sandbox/sandbox')
const { _getStateVersion, _parseStateVersion } = require('../util/version')

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
// _captureJig
// ------------------------------------------------------------------------------------------------

async function _captureJig (jig, commit, outputIndices, deleteIndices, timeout) {
  if (Log._debugOn) Log._debug(TAG, 'Capture', _text(jig))

  const record = commit._record

  const after = commit._after.get(jig)
  _assert(after)

  // Load the previous state's references to use when we don't spend
  const refmap = await commit._buildRefmap(timeout)
  timeout._check()

  // Create the codec used to encode the state
  const codec = new Codec()._saveJigs(x => {
    const vout = outputIndices.get(x)
    if (_defined(vout)) return `_o${vout + 1}`

    const vdel = deleteIndices.get(x)
    if (_defined(vdel)) return `_d${vdel}`

    const ref = record._refs._get(x)
    if (ref) return record._before.get(ref)._props.location

    const origin = _sudo(() => x.origin)
    if (origin.startsWith('native://')) return origin

    const beforeRefLocation = refmap[origin] && refmap[origin][0]
    _assert(beforeRefLocation)
    return beforeRefLocation
  })

  // Create the state, which is order-independent
  const state = {}

  // cls
  if (after._cls) state.cls = codec._encode(after._cls)

  // kind
  state.kind = after._kind

  // props
  const props = Object.assign({}, after._props)
  const vout = outputIndices.get(jig)
  const vdel = deleteIndices.get(jig)
  const localLocation = _defined(vout) ? `_o${vout + 1}` : `_d${vdel}`
  props.location = localLocation
  _assert(!props.origin.startsWith('record://') || props.origin.startsWith(`record://${record._id}`))
  if (props.origin.startsWith(`record://${record._id}`)) props.origin = localLocation
  state.props = codec._encode(props)

  // src
  if (after._src) state.src = after._src

  // version
  state.version = _getStateVersion(commit._version)

  return state
}

// ------------------------------------------------------------------------------------------------
// _captureBerry
// ------------------------------------------------------------------------------------------------

function _captureBerry (berry, version) {
  // The codec assumes all referenced jigs are fixed in location and deployed
  const codec = new Codec()._saveJigs(x => {
    const xLocation = _sudo(() => x.location)
    const loc = _location(xLocation)
    _assert(_defined(loc._txid) && !_defined(loc._record) && !_defined(loc._error))
    return xLocation
  })

  // Create the state, which is order-independent
  const state = {}

  // cls
  state.cls = codec._encode(berry.constructor)

  // kind
  state.kind = 'berry'

  // props
  const props = _sudo(() => Object.assign({}, berry))
  state.props = codec._encode(props)

  // version
  state.version = _getStateVersion(version)

  return state
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
  _parseStateVersion(state.version)

  // Check that the hash matches

  let stateHashHex = null

  if (state.kind === 'berry' || (hash && !loader._kernel._trustlist.has('cache'))) {
    const stateString = _deterministicJSONStringify(state)
    const stateBuffer = new bsv.deps.Buffer(stateString, 'utf8')
    const stateHash = await _sha256(stateBuffer)
    stateHashHex = stateHash.toString('hex')

    if (hash && stateHashHex !== hash) throw new StateError(`State hash mismatch for ${key}`)
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

  switch (state.kind) {
    case 'code': {
      const txid = key.split('//')[1].split('_')[0]
      return _recreateCode(state, decodedProps, refs, txid, loader)
    }

    case 'jig': {
      const txid = key.split('//')[1].split('_')[0]
      return _recreateJig(state, decodedProps, refs, txid, loader)
    }

    case 'berry': {
      return _recreateBerry(state, decodedProps, refs, stateHashHex, loader)
    }

    default: throw new StateError(`Unknown jig kind: ${state.kind}`)
  }
}

// ------------------------------------------------------------------------------------------------

async function _recreateCode (state, decodedProps, refs, txid, loader) {
  const env = {}

  // If the state is code, make sure it is trusted. For state cache, we trust any code loaded from its
  // origin. This is not ideal, but it is necessary in the v5 protocol, because state cache entries have
  // no reference to which transaction the code was deployed.
  const origintxid = decodedProps.origin.startsWith('_') ? txid : decodedProps.origin.slice(0, 64)
  const kernel = loader._kernel
  try {
    await kernel._checkTrusted(origintxid, 'cache')
  } catch (e) {
    await kernel._checkTrusted(txid, 'cache')
  }

  // Preload the parent if there is one
  const parentName = _parentName(state.src)
  if (parentName) {
    const parentLocation = decodedProps.deps[parentName].location
    const parentFullLocation = _compileLocation(Object.assign({ _txid: txid }, _location(parentLocation)))
    const Parent = await loader._load(parentFullLocation, undefined, true)
    refs.set(parentLocation, Parent)
    env[parentName] = Parent
  }

  // Create the code without any properties
  const C = Editor._createCode()

  // Sandbox and load the code
  const T = Sandbox._evaluate(state.src, env)[0]
  const [S, SGlobal] = Editor._makeSandbox(C, T)
  const local = false
  Editor._get(C)._install(S, local)

  // Finishing loading the jig in parallel in a completer
  const complete = async () => {
    // Load the remaining refs
    for (const ref of refs.keys()) {
      if (refs.get(ref)) continue
      const fullLocation = _compileLocation(Object.assign({ _txid: txid }, _location(ref)))
      const jig = await loader._load(fullLocation, undefined, true)
      refs.set(ref, jig)
    }

    // Redecode the props with the partially loaded refs
    function jigLoader (x) {
      const jig = refs.get(x)
      const fullLocation = _compileLocation(Object.assign({ _txid: txid }, _location(x)))
      if (!jig) throw new StateError(`Jig not loaded: ${fullLocation}`)
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
      C.location = _compileLocation(Object.assign({ _txid: txid }, _location(C.location)))
      C.origin = _compileLocation(Object.assign({ _txid: txid }, _location(C.origin)))
    })

    // Make the deps update the globals in the sandbox as we'd expect
    _sudo(() => {
      const deps = Editor._makeDeps(C, SGlobal, C.deps)
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
  const initialized = true
  const rules = Rules._jigObject(initialized)
  const jig = new Membrane(decodedState, rules)

  // Force it to be a jig
  _JIGS.add(jig)

  async function complete () {
    // Load the remaining refs
    for (const ref of refs.keys()) {
      if (refs.get(ref)) continue
      const fullLocation = _compileLocation(Object.assign({ _txid: txid }, _location(ref)))
      const jig = await loader._load(fullLocation, undefined, true)
      refs.set(ref, jig)
    }

    // Assign the class onto the jig
    const C = refs.get(state.cls.$jig)
    _sudo(() => Object.setPrototypeOf(jig, C.prototype))

    // Redecode the props with the partially loaded refs
    function jigLoader (x) {
      const jig = refs.get(x)
      const fullLocation = _compileLocation(Object.assign({ _txid: txid }, _location(x)))
      if (!jig) throw new StateError(`Jig not loaded: ${fullLocation}`)
      return jig
    }

    const codec = new Codec()
      ._toSandbox()
      ._loadJigs(jigLoader)

    const redecodedProps = codec._decode(state.props)

    // Apply now loaded props to the jig
    _sudo(() => {
      Object.keys(redecodedProps).forEach(key => {
        _setOwnProperty(jig, key, redecodedProps[key])
      })
    })

    // Apply final bindings to the jig
    _sudo(() => {
      jig.location = _compileLocation(Object.assign({ _txid: txid }, _location(jig.location)))
      jig.origin = _compileLocation(Object.assign({ _txid: txid }, _location(jig.origin)))
    })

    // Notify listeners
    loader._kernel._emit('load', jig)
  }

  const promise = complete()

  return new _Partial(jig, promise)
}

// ------------------------------------------------------------------------------------------------

async function _recreateBerry (state, decodedState, refs, hash, loader) {
  // Wrap the decoded state in a berry membrane
  const initialized = true
  const rules = Rules._berryObject(initialized)
  const berry = new Membrane(decodedState, rules)

  // Force it to be a berry
  _BERRIES.add(berry)

  async function complete () {
    // Load the remaining refs
    for (const ref of refs.keys()) {
      if (refs.get(ref)) continue
      const fullLocation = _compileLocation(Object.assign({ _hash: hash }, _location(ref)))
      const jig = await loader._load(fullLocation, undefined, true)
      refs.set(ref, jig)
    }

    // Assign the class onto the berry
    const B = refs.get(state.cls.$jig)
    _sudo(() => Object.setPrototypeOf(berry, B.prototype))

    // Redecode the props with the partially loaded refs
    function jigLoader (x) {
      const jig = refs.get(x)
      const fullLocation = _compileLocation(Object.assign({ _hash: hash }, _location(x)))
      if (!jig) throw new StateError(`Jig not loaded: ${fullLocation}`)
      return jig
    }

    const codec = new Codec()
      ._toSandbox()
      ._loadJigs(jigLoader)

    const redecodedProps = codec._decode(state.props)

    // Apply now loaded props to the berry
    _sudo(() => {
      Object.keys(redecodedProps).forEach(key => {
        _setOwnProperty(berry, key, redecodedProps[key])
      })
    })

    // Apply final bindings to the berry
    _sudo(() => {
      berry.location = _compileLocation(Object.assign({ _hash: hash }, _location(berry.location)))
      berry.origin = _compileLocation(Object.assign({ _hash: hash }, _location(berry.origin)))
    })

    // Notify listeners
    loader._kernel._emit('load', berry)
  }

  const promise = complete()

  return new _Partial(berry, promise)
}

// ------------------------------------------------------------------------------------------------
// _hashState
// ------------------------------------------------------------------------------------------------

async function _hashState (state) {
  const stateString = _deterministicJSONStringify(state)
  const stateBuffer = bsv.deps.Buffer.from(stateString, 'utf8')

  const stateHashBuffer = await _sha256(stateBuffer)
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
