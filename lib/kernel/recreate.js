/**
 * recreate.js
 *
 * Recreates jig and berries from cached state
 */

const bsv = require('bsv')
const Log = require('./log')
const { _assert, _parentName, _setOwnProperty, _JIGS, _BERRIES } = require('./misc')
const { _deterministicJSONStringify } = require('./determinism')
const { _location, _compileLocation } = require('./bindings')
const { _sudo } = require('./admin')
const { _sha256 } = require('../util/bsv')
const Editor = require('./editor')
const Membrane = require('./membrane')
const Rules = require('./rules')
const Codec = require('./codec')
const Sandbox = require('./sandbox')
const { _parseStateVersion } = require('./version')
const { TrustError } = require('../util/errors')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Recreate'

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
 * @returns {?_Partial} A partial load if the state doesn't exist in the cache
 */
async function _recreate (location, state, hash, kernel, session, timeout) {
  if (Log._infoOn) Log._info(TAG, 'Recreate', location)

  // Check that the version is supported
  _parseStateVersion(state.version)

  // Check that the hash matches

  let stateHashHex = null

  if (state.kind === 'berry' || (hash && !kernel._trustlist.has('cache'))) {
    const stateString = _deterministicJSONStringify(state)
    const stateBuffer = new bsv.deps.Buffer(stateString, 'utf8')
    const stateHash = await _sha256(stateBuffer)
    stateHashHex = stateHash.toString('hex')

    if (hash && stateHashHex !== hash) throw new Error(`State hash mismatch for ${location}`)
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
      const txid = location.split('_')[0]
      return _recreateCode(state, decodedProps, refs, txid, kernel, session, timeout)
    }

    case 'jig': {
      const txid = location.split('_')[0]
      return _recreateJig(state, decodedProps, refs, txid, kernel, session, timeout)
    }

    case 'berry': {
      return _recreateBerry(state, decodedProps, refs, stateHashHex, kernel, session, timeout)
    }

    default: throw new Error(`Unknown jig kind: ${state.kind}`)
  }
}

// ------------------------------------------------------------------------------------------------

async function _recreateCode (state, decodedProps, refs, txid, kernel, session, timeout) {
  const env = {}

  // If the state is code, make sure it is trusted. For state cache, we trust any code loaded from its
  // origin. This is not ideal, but it is necessary in the v5 protocol, because state cache entries have
  // no reference to which transaction the code was deployed.
  const origintxid = decodedProps.origin.startsWith('_') ? txid : decodedProps.origin.slice(0, 64)
  try {
    if (!(await kernel._trusted(origintxid, 'cache'))) throw new TrustError(origintxid, 'cache')
  } catch (e) {
    if (!(await kernel._trusted(txid, 'cache'))) throw new TrustError(txid, 'cache')
  }

  // Preload the parent if there is one
  const parentName = _parentName(state.src)
  if (parentName) {
    const parentLocation = decodedProps.deps[parentName].location
    const parentFullLocation = _compileLocation(Object.assign({ _txid: txid }, _location(parentLocation)))
    const _load = require('./load')
    const Parent = await _load(parentFullLocation, undefined, kernel, session, timeout, false)
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
      const _load = require('./load')
      const jig = await _load(fullLocation, undefined, kernel, session, timeout, false)
      refs.set(ref, jig)
    }

    // Redecode the props with the partially loaded refs
    function jigLoader (x) {
      const jig = refs.get(x)
      const fullLocation = _compileLocation(Object.assign({ _txid: txid }, _location(x)))
      if (!jig) throw new Error(`Jig not loaded: ${fullLocation}`)
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
    kernel._emit('load', C)
  }

  const promise = complete()

  return new _Partial(C, promise)
}

// ------------------------------------------------------------------------------------------------

async function _recreateJig (state, decodedState, refs, txid, kernel, session, timeout) {
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
      const _load = require('./load')
      const jig = await _load(fullLocation, undefined, kernel, session, timeout, false)
      refs.set(ref, jig)
    }

    // Assign the class onto the jig
    const C = refs.get(state.cls.$jig)
    _sudo(() => Object.setPrototypeOf(jig, C.prototype))

    // Redecode the props with the partially loaded refs
    function jigLoader (x) {
      const jig = refs.get(x)
      const fullLocation = _compileLocation(Object.assign({ _txid: txid }, _location(x)))
      if (!jig) throw new Error(`Jig not loaded: ${fullLocation}`)
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
    kernel._emit('load', jig)
  }

  const promise = complete()

  return new _Partial(jig, promise)
}

// ------------------------------------------------------------------------------------------------

async function _recreateBerry (state, decodedState, refs, hash, kernel, session, timeout) {
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
      const _load = require('./load')
      const jig = await _load(fullLocation, undefined, kernel, session, timeout, false)
      refs.set(ref, jig)
    }

    // Assign the class onto the berry
    const B = refs.get(state.cls.$jig)
    _sudo(() => Object.setPrototypeOf(berry, B.prototype))

    // Redecode the props with the partially loaded refs
    function jigLoader (x) {
      const jig = refs.get(x)
      const fullLocation = _compileLocation(Object.assign({ _hash: hash }, _location(x)))
      if (!jig) throw new Error(`Jig not loaded: ${fullLocation}`)
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
    kernel._emit('load', berry)
  }

  const promise = complete()

  return new _Partial(berry, promise)
}

// ------------------------------------------------------------------------------------------------

module.exports = _recreate
