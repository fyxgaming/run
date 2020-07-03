/**
 * repository.js
 *
 * Code jig repository
 */

const Log = require('./log')
const Bindings = require('./bindings')
const Sandbox = require('./sandbox')
const { _deepVisit, _deepClone } = require('./deep')
const { InstallFailedError } = require('./errors')
const { _kernel, _assert, _text, _parent, _isBasicObject, _isUndefined, _isBoolean } = require('./misc')

// ------------------------------------------------------------------------------------------------
// GLOBALS
// ------------------------------------------------------------------------------------------------

const TAG = 'Repository'

const REPOSITORIES = new Map() // Network -> (T <-> C)
const NATIVE_REPOSITORY = new Map() // (Location -> C)

const BINDINGS = ['location', 'origin', 'owner', 'satoshis']
const RESERVED = ['toString', 'upgrade', 'sync', 'destroy']

const ACTIVE_REPOSITORY = () => {
  const network = _kernel()._blockchain.network
  if (REPOSITORIES.has(network)) return REPOSITORIES.get(network)
  const repository = new Map()
  REPOSITORIES.set(network, repository)
  return repository
}

// The set of all code jigs. This is the easiest way for Code.instanceOf to work right now.
const CODE_JIGS = new WeakSet()

// ------------------------------------------------------------------------------------------------
// _install
// ------------------------------------------------------------------------------------------------

function _install (T, options = {}) {
  if (_isNative(T)) return _getNative(T)

  const kernel = _kernel()
  const repository = options._repository || ACTIVE_REPOSITORY()
  const network = kernel._blockchain.network

  // Always create the parent first
  const Parent = _parent(T)
  const ParentCode = Parent && _install(Parent, options)

  // Check if this code already exists. We must do this after installing the parent, in case
  // the parent references the child and already installed it.
  const presetLocation = preset('location', T, network)
  const PrevCode = _get(T)
  if (PrevCode) return PrevCode

  Log._info(TAG, 'Install', _text(T))

  checkValid(T, ParentCode, false)

  // Sandbox the code
  const env = {}
  if (ParentCode) { env[ParentCode.name] = ParentCode }
  const [S, SGlobal] = Sandbox._sandboxType(T, env)

  const Membrane = require('./membrane')
  const Code = require('./code')

  // Wrap the sandbox in a jig membrane
  const membrane = new Membrane()
  const C = new Sandbox._intrinsics.Proxy(S, membrane)
  membrane._init(S, C)

  // Make Code the base of all jig classes like Function is for normal classes
  if (!ParentCode) {
    Object.setPrototypeOf(S, Code)
  }

  /*
  _enableUpgrades () {
    const C = this._C
    Membrane._sudo(() => {
      // class MethodTableHandler {
      // set (target, prop, value) {
      // return false
      // }
      // }

      this._methodTable = {}
      // this._methodAPI = new Proxy(this._methodTable, new MethodTableHandler())
      this._methodAPI = this._methodTable

      // Move all properties from the prototype to the method table
      const methods = Object.getOwnPropertyNames(C.prototype)
      methods.forEach(name => {
        const desc = Object.getOwnPropertyDescriptor(C.prototype, name)
        Object.defineProperty(this._methodTable, name, desc)
        delete C.prototype[name]
      })

      // Hook up the method table in between the prototype and its parent
      const protoproto = Object.getPrototypeOf(C.prototype)
      Object.setPrototypeOf(this._methodTable, protoproto)
      Object.setPrototypeOf(C.prototype, this._methodAPI)

      // Freeze the prototype
      // TODO: Deep freeze method table properties too
      // freeze will make setPrototypeOf fail
      Object.freeze(C.prototype)

      this._methodTable.constructor = this._C
    })
  }
  */

  try {
    // Temporarily add the new code for dependencies, even though its not fully installed
    repository.set(T, C)
    repository.set(C, T)
    CODE_JIGS.add(C)

    const props = Object.assign({}, T)

    // Recreate deps in the sandbox
    const makeCode = x => typeof x === 'function' ? _install(x, options) : undefined
    const Sprops = _deepClone(props, Sandbox._intrinsics, makeCode)

    if (ParentCode) {
      if (!Object.getOwnPropertyNames(Sprops).includes('deps')) {
        const value = new Sandbox._intrinsics.Object()
        Object.defineProperty(Sprops, 'deps', { enumerable: true, configurable: true, value })
      }
      Sprops.deps[Parent.name] = ParentCode
    }

    if (Object.getOwnPropertyNames(Sprops).includes('deps')) {
      Object.assign(SGlobal, Sprops.deps)
    }

    Membrane._sudo(() => {
      Object.assign(C, Sprops)
      delete C.presets
    })

    if (hasPresets(T, network)) {
      Membrane._sudo(() => Object.assign(C, Sprops.presets[network]))
    }

    if (!presetLocation) {
      Membrane._sudo(() => Bindings._init(C))
    }

    return C
  } catch (e) {
    repository.delete(T)
    repository.delete(C)
    CODE_JIGS.delete(C)

    throw e
  }
}

// ------------------------------------------------------------------------------------------------
// _installNative
// ------------------------------------------------------------------------------------------------

function _installNative (T) {
  Log._debug(TAG, 'Install native', _text(T))

  // If native code was already installed, return it.
  const location = `native://${T.name}`
  const PrevCode = typeof T === 'function' && NATIVE_REPOSITORY.get(location)
  if (PrevCode) return PrevCode

  // Native code must be valid
  checkValid(T, undefined, true)

  // Parents not allowed
  _assert(!_parent(T))

  // Sandbox the code
  const [S, SGlobal] = Sandbox._sandboxType(T, {}, true /* native */)

  // Add native code
  NATIVE_REPOSITORY.set(location, S)

  // Native code cannot have props. Their deps are applied directly.
  Object.assign(SGlobal, T.deps || {})

  // Set bindings
  S.origin = location
  S.location = location
  S.nonce = 0
  S.owner = null
  S.satoshis = null

  // All native classes are utility classes
  S.utility = true

  // Freeze the sandbox
  _deepVisit(S, x => Object.freeze(x))

  // Add to our code jigs
  CODE_JIGS.add(S)

  return S
}

// ------------------------------------------------------------------------------------------------
// _get
// ------------------------------------------------------------------------------------------------

function _get (T) {
  const Code = require('./code')
  if (T instanceof Code) return T

  const repository = ACTIVE_REPOSITORY()
  if (repository.has(T)) return repository.get(T)
}

// ------------------------------------------------------------------------------------------------
// _isNative
// ------------------------------------------------------------------------------------------------

function _isNative (T) {
  if (typeof T !== 'function') return false
  const nativeLocation = `native://${T.name}`
  return NATIVE_REPOSITORY.has(nativeLocation)
}

// ------------------------------------------------------------------------------------------------
// _getNative
// ------------------------------------------------------------------------------------------------

function _getNative (location) {
  return NATIVE_REPOSITORY.get(location)
}

// ------------------------------------------------------------------------------------------------
// _isCode
// ------------------------------------------------------------------------------------------------

function _isCode (T) {
  return CODE_JIGS.has(T)
}

// ------------------------------------------------------------------------------------------------
// _deploy
// ------------------------------------------------------------------------------------------------

function _deploy (...Cs) {
  const CsExtended = new Set()

  Cs.forEach(C => {
    const Xs = whatNeedsToBeDeployed(C)

    Xs.forEach(X => CsExtended.add(X))
  })

  const CsExtendedArr = Array.from(CsExtended)

  const { _record } = require('./record')

  _record(record => record._deploy(...CsExtendedArr))
}

// ------------------------------------------------------------------------------------------------
// _activate
// ------------------------------------------------------------------------------------------------

function _activate (network) {
  // TODO
  // Remove all props
  // Apply base props
  // Apply custom presets
}

// ------------------------------------------------------------------------------------------------
// _hasOwnProperty
// ------------------------------------------------------------------------------------------------

function _hasOwnProperty (x, name) {
  return Object.getOwnPropertyNames(x).includes(name)
}

// ------------------------------------------------------------------------------------------------
// _setOwnProperty
// ------------------------------------------------------------------------------------------------

function _setOwnProperty (x, name, value) {
  Object.defineProperty(x, name, { enumerable: true, configurable: true, value })
}

// ------------------------------------------------------------------------------------------------
// _notify
// ------------------------------------------------------------------------------------------------

function _notify (jig) {
  const network = _kernel()._blockchain.network
  const repository = ACTIVE_REPOSITORY()
  const Membrane = require('./membrane')

  // If we aren't tracking this jig, then nothing to update
  const T = repository.get(jig)
  if (!T) return

  // If bindings are already set, don't add them
  if (_hasOwnProperty(T, 'location')) return

  // Create spots for the presets if they aren't there
  if (!_hasOwnProperty(T, 'presets')) _setOwnProperty(T, 'presets', {})
  if (!_hasOwnProperty(T.presets, network)) _setOwnProperty(T.presets, network, {})

  // Set each binding
  Membrane._sudo(() => {
    Bindings._BINDINGS.forEach(binding => {
      _setOwnProperty(T, binding, jig[binding])
      _setOwnProperty(T.presets[network], binding, jig[binding])
    })
  })
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

/**
 * Reads a preset property or returns undefined if it does not exist
 */
function preset (name, T, network) {
  if (typeof T !== 'function') return
  if (!Object.getOwnPropertyNames(T).includes('presets')) return
  const presets = T.presets
  if (typeof presets !== 'object' || !presets) return
  const npresets = presets[network]
  if (typeof npresets !== 'object' || !npresets) return
  return npresets[name]
}

// ------------------------------------------------------------------------------------------------

/**
 * Checks if T is valid to become a code jig
 */
function checkValid (T, ParentCode, native) {
  if (typeof T !== 'function') {
    throw new InstallFailedError(T, 'Only functions and classes may be deployed')
  }

  // Anonymous functions and classes cannot be jigs, because they are intended to be temporary.
  if (!T.name) {
    throw new InstallFailedError(T, 'Anonymous functions and classes cannot be jigs')
  }

  // Prototypal inheritance is not safe to use. The prototype object would need to be serialized.
  if (T.prototype && T.prototype.constructor !== T) {
    throw new InstallFailedError(T, 'Prototypal inheritance is not supported')
  }

  // Any built-in type will have native code. We should not deploy built-in types.
  if (T.toString().indexOf('[native code]') !== -1) {
    throw new InstallFailedError(T, 'This code object contains native code')
  }

  checkDeps(T, ParentCode)
  checkPresets(T)
  checkOptions(T)
  checkBindings(T)
  if (!native) checkReserved(T)
}

// ------------------------------------------------------------------------------------------------

/**
 * Check that the special deps property of code is valid
 */
function checkDeps (T, ParentCode) {
  if (!Object.getOwnPropertyNames(T).includes('deps')) return

  const deps = T.deps
  if (!_isBasicObject(deps)) throw new InstallFailedError(T, 'deps must be an object')

  if (ParentCode) {
    const DepParent = T.deps[ParentCode.name]
    const DepParentCode = _get(DepParent)
    if (DepParentCode !== ParentCode) {
      throw new InstallFailedError(T, 'Parent dependency mismatch')
    }
  }
}

// ------------------------------------------------------------------------------------------------

/**
 * Check that the special presets property of code is valid
 */
function checkPresets (T) {
  if (!Object.getOwnPropertyNames(T).includes('presets')) return

  const presets = T.presets
  if (!_isBasicObject(presets)) throw new InstallFailedError(T, 'presets must be an object')

  for (const network of Object.keys(presets)) {
    const npresets = presets[network]
    if (!_isBasicObject(npresets)) throw new InstallFailedError(T, `${network} presets must be an object`)

    const anyBindings = Bindings._BINDINGS.some(prop => !_isUndefined(npresets[prop]))
    const allBindings = !Bindings._BINDINGS.some(prop => _isUndefined(npresets[prop]))
    if (anyBindings && !allBindings) {
      throw new InstallFailedError(T, `${network} presets are not fully defined`)
    }

    if (anyBindings) {
      try {
        const loc = Bindings._location(npresets.location)
        _assert(loc.txid && ('vout' in loc || 'vdel' in loc) && !('berry' in loc))
        const orig = Bindings._location(npresets.origin)
        _assert(loc.orig && ('vout' in orig || 'vdel' in orig) && !('berry' in orig))
        Bindings._nonce(npresets.nonce)
        Bindings._owner(npresets.owner)
        Bindings._satoshis(npresets.satoshis)
      } catch (e) {
        throw new InstallFailedError(T, e.message)
      }
    }

    // Check for reserved words
    if ('deps' in npresets) throw new InstallFailedError(T, `${network} presets must not contain deps`)
    if ('presets' in npresets) throw new InstallFailedError(T, `${network} presets must not contain presets`)
    checkReserved(npresets)
  }
}

// ------------------------------------------------------------------------------------------------

function hasPresets (T, network) {
  return Object.getOwnPropertyNames(T).includes('presets') && !!T.presets[network]
}

// ------------------------------------------------------------------------------------------------

function checkBindings (T) {
  const props = Object.getOwnPropertyNames(T)

  for (const binding of BINDINGS) {
    if (props.includes(binding)) {
      throw new InstallFailedError(T, `Must not have any bindings: ${binding}`)
    }
  }
}

// ------------------------------------------------------------------------------------------------

function checkReserved (T) {
  const props = Object.getOwnPropertyNames(T)

  for (const reserved of RESERVED) {
    if (props.includes(reserved)) {
      throw new InstallFailedError(T, `Must not have any reserved names: ${reserved}`)
    }
  }
}

// ------------------------------------------------------------------------------------------------

function checkOptions (T) {
  if (Object.getOwnPropertyNames(T).includes('utility')) {
    _assert(_isBoolean(T.utility), 'utility must be a boolean')
  }
}

// ------------------------------------------------------------------------------------------------

function whatNeedsToBeDeployed (C, set = new Set()) {
  const Jig = require('./jig')
  const Berry = require('./berry')
  const Code = require('./code')
  const Membrane = require('./membrane')

  _assert(C instanceof Code)

  if (set.has(C)) return

  const location = Membrane._sudo(() => C.location)
  const { undeployed } = Bindings._location(location)

  if (!undeployed) return set

  set.add(C)

  const Parent = _parent(C)
  if (Parent) whatNeedsToBeDeployed(Parent, set)

  const props = Membrane._sudo(() => Object.assign({}, C))

  _deepVisit(props, x => {
    if (x instanceof Code) whatNeedsToBeDeployed(x, set)
    return !(x instanceof Code || x instanceof Jig || x instanceof Berry)
  })

  return set
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _install,
  _installNative,
  _get,
  _isNative,
  _getNative,
  _isCode,
  _deploy,
  _activate,
  _notify
}
