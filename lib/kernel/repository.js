/**
 * repository.js
 *
 * Code jig repository
 */

const Log = require('./log')
const Bindings = require('./bindings')
const Sandbox = require('./sandbox')
const Snapshot = require('./snapshot')
const { _deepVisit, _deepClone } = require('./deep')
const { InstallFailedError } = require('./errors')
const {
  _kernel, _assert, _text, _parent, _isBasicObject, _isUndefined,
  _hasOwnProperty, _setOwnProperty, _sourceCode
} = require('./misc')

// ------------------------------------------------------------------------------------------------
// GLOBALS
// ------------------------------------------------------------------------------------------------

const TAG = 'Repository'

const REPOSITORIES = new Map() // Network -> (T <-> C)
const NATIVE_REPOSITORY = new Map() // (Location -> C)
const NATIVE_DEPS = new Set() // Location

const BINDINGS = ['location', 'origin', 'owner', 'satoshis']
const RESERVED = ['toString', 'upgrade', 'sync', 'destroy']

const ACTIVE_REPOSITORY = () => {
  const network = _kernel()._blockchain.network
  if (REPOSITORIES.has(network)) return REPOSITORIES.get(network)
  const repository = new Map()
  REPOSITORIES.set(network, repository)
  return repository
}

// The set of all code jigs, mapped to metadata about it.
// This is the easiest way for Code.instanceOf to work.
// Also, source code needs to be stored separately so it can be swapped.
const CODE_METADATA = new WeakMap() // C -> { _src }

// ------------------------------------------------------------------------------------------------
// _install
// ------------------------------------------------------------------------------------------------

// Options:
// - _repository: Map
// - _upgrade: { _T, _C }

function _install (T, options = {}) {
  const Membrane = require('./membrane')
  const Code = require('./code')
  const Command = require('./command')

  const kernel = _kernel()
  const repository = options._repository || ACTIVE_REPOSITORY()
  const network = kernel._blockchain.network
  const upgrading = options._upgrade && options._upgrade._T === T

  let C = null
  let metadata = null

  if (upgrading) {
    C = options._upgrade._C
    metadata = CODE_METADATA.get(C)

    Log._info(TAG, 'Upgrade', _text(C))

    checkValidUpgrade(C, T, network)

    // Track installs so we can deploy them dependencies
    _assert(!options._installs)
    options._installs = new Set()
  } else {
    if (_isNative(T)) return _getNativeDep(`native://${T.name}`)
  }

  // Always create the parent first
  const Parent = _parent(T)
  const ParentCode = Parent && _install(Parent, options)

  // Check if this code already exists. We must do this after installing the parent, in case
  // the parent references the child and already installed it.
  const PrevCode = _get(T)
  if (PrevCode) return PrevCode

  if (!upgrading) {
    Log._info(TAG, 'Install', _text(T))
  }

  checkValid(T, ParentCode, false /* native */)

  // Sandbox the code
  const env = {}
  if (ParentCode) { env[ParentCode.name] = ParentCode }
  const [S, SGlobal] = Sandbox._sandboxType(T, env)

  // Make Code the base of all jig classes like Function is for normal classes
  if (!ParentCode) {
    Object.setPrototypeOf(S, Code.prototype)
  }

  // Create the membrane and method table if not upgrading
  if (!upgrading) {
    // Create a secondary class that we'll use to enable updates
    const usrc = S.toString().startsWith('class') ? `class ${T.name} {}` : `function ${T.name} () { }`
    const [U] = Sandbox._evaluate(usrc, {})
    Object.setPrototypeOf(U, Object.getPrototypeOf(S))
    Object.setPrototypeOf(U.prototype, Object.getPrototypeOf(S.prototype))
    Object.getOwnPropertyNames(U.prototype).forEach(method => { delete U.prototype[method] })

    // Wrap the sandbox in a jig membrane
    const membrane = new Membrane()
    C = new Sandbox._intrinsics.Proxy(U, membrane)

    metadata = { _src: '', _membrane: membrane }

    // Enable upgrades
    // TODO: Sandbox
    const methodTable = {}
    // const methodAPI = new Proxy(methodTable, new MethodTableHandler())
    const methodAPI = methodTable

    const protoproto = Object.getPrototypeOf(U.prototype)
    Object.setPrototypeOf(methodTable, protoproto)
    Object.setPrototypeOf(U.prototype, methodAPI)

    // Freeze the prototype to the user
    Object.freeze(U.prototype)
  }

  // Save the old bindings so that we can reapply them on the new class
  const oldBindings = {}
  if (upgrading) {
    Membrane._sudo(() => Bindings._BINDINGS.forEach(x => { oldBindings[x] = C[x] }))
  }

  // Save a snapshot of the old class if upgrading
  const snapshot = upgrading && new Snapshot(C)

  // Update the source code and code object
  metadata._src = _sourceCode(S)
  metadata._membrane._init(S, C)

  // Update the method table with the new instance methods
  const methodTable = Object.getPrototypeOf(C.prototype)
  Object.getOwnPropertyNames(methodTable).forEach(method => { delete methodTable[method] })
  const methods = Object.getOwnPropertyNames(S.prototype)
  methods.forEach(name => {
    const desc = Object.getOwnPropertyDescriptor(S.prototype, name)
    Object.defineProperty(methodTable, name, desc)
  })
  methodTable.constructor = C

  let OldT = null

  // Add props. Rollback if fail.
  try {
    // Temporarily add the new code for dependencies, even though its not fully installed
    OldT = repository.get(C)
    repository.delete(OldT)
    repository.set(C, T)
    repository.set(T, C)
    CODE_METADATA.set(C, metadata)

    const props = Object.assign({}, T)

    // Recreate deps in the sandbox
    const makeCode = x => typeof x === 'function' ? _install(x, options) : undefined
    const Sprops = _deepClone(props, Sandbox._intrinsics, makeCode)

    if (ParentCode) {
      if (!Object.getOwnPropertyNames(Sprops).includes('deps')) {
        const desc = new Sandbox._intrinsics.Object()
        desc.enumerable = true
        desc.configurable = true
        desc.value = new Sandbox._intrinsics.Object()
        Object.defineProperty(Sprops, 'deps', desc)
      }
      Sprops.deps[Parent.name] = ParentCode
    }

    if (Object.getOwnPropertyNames(Sprops).includes('deps')) {
      Object.assign(SGlobal, Sprops.deps)
    }

    Membrane._sudo(() => {
      // Apply props, after statics like a class
      Object.assign(C, Sprops)
      delete C.presets

      if (hasPresets(T, network)) {
        Object.assign(C, Sprops.presets[network])
      }

      // Apply bindings
      if (upgrading) {
        Object.assign(C, oldBindings)
      } else {
        const presetLocation = preset('location', T, network)
        if (!presetLocation && !upgrading) Bindings._init(C)
      }
    })

    // If upgrading, deploy the new code
    if (upgrading) {
      const { _record, _recordMultiple } = require('./record')
      _recordMultiple(() => {
        // Install dependencies used to upgrade
        options._installs.forEach(I => _deploy(I))

        // Upgrade the class
        _record(record => Command._upgrade(record, C, snapshot))
      })
    }

    if (options._installs) options._installs.add(C)

    return C
  } catch (e) {
    if (upgrading) {
      // Load the old method table

      // TODO: Roll back
    } else {
      repository.delete(T)
      repository.delete(C)
      CODE_METADATA.delete(C)
    }

    throw e
  }
}

// ------------------------------------------------------------------------------------------------
// _installNative
// ------------------------------------------------------------------------------------------------

function _installNative (T, dep) {
  Log._debug(TAG, 'Install native', _text(T))

  // If native code was already installed, return it.
  const location = `native://${T.name}`
  const PrevCode = typeof T === 'function' && NATIVE_REPOSITORY.get(location)
  if (PrevCode) return PrevCode

  // Native code must be valid
  checkValid(T, undefined, true /* native */)

  // Parents not allowed
  _assert(!_parent(T))

  // Sandbox the code
  const [S, SGlobal] = Sandbox._sandboxType(T, {}, true /* native */)

  // Add native code
  NATIVE_REPOSITORY.set(location, S)
  if (dep) NATIVE_DEPS.add(location)

  // Native code cannot have props. Their deps are applied directly.
  Object.assign(SGlobal, T.deps || {})

  // Copy specific properties
  if (_hasOwnProperty(T, 'sealed')) _setOwnProperty(S, 'sealed', T.sealed)

  // Set bindings
  S.origin = location
  S.location = location
  S.nonce = 0
  S.owner = null
  S.satoshis = null

  const _src = `class ${T.name} { [native code] }`
  const metadata = { _src }

  // Make native code return hidden source
  S.toString = Sandbox._evaluate('() => src', { src: _src })[0]

  // Freeze the sandbox
  _deepVisit(S, x => Object.freeze(x))
  _deepVisit(S.prototype, x => Object.freeze(x))

  // Add our code jigs
  CODE_METADATA.set(S, metadata)

  return S
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
  if (!CsExtendedArr.length) return

  const { _record } = require('./record')
  const Command = require('./command')
  _record(record => Command._deploy(record, ...CsExtendedArr))
}

// ------------------------------------------------------------------------------------------------
// _setSourceCode
// ------------------------------------------------------------------------------------------------

function _setSourceCode (C, src) {
  const metadata = CODE_METADATA.get(C)
  metadata._src = src
}

// ------------------------------------------------------------------------------------------------
// _getSourceCode
// ------------------------------------------------------------------------------------------------

function _getSourceCode (C) {
  const metadata = CODE_METADATA.get(C)
  if (metadata) return metadata._src

  // Metadata might not be available during install
  return Function.prototype.toString.call(C)
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
// _getNativeDep
// ------------------------------------------------------------------------------------------------

function _getNativeDep (location) {
  _assert(NATIVE_DEPS.has(location), `${location} must not be a dependency`)
  return NATIVE_REPOSITORY.get(location)
}

// ------------------------------------------------------------------------------------------------
// _isCode
// ------------------------------------------------------------------------------------------------

function _isCode (C) {
  return CODE_METADATA.has(C)
}

// ------------------------------------------------------------------------------------------------
// _activate
// ------------------------------------------------------------------------------------------------

function _activate (network) {
  // TODO
  // Remove all props
  // Apply base props
  // Apply custom presets

  /*
    const net = _networkSuffix(network)

    this._installs.forEach((v, k) => {
      if (typeof k === 'string') return // location
      if (typeof k[`origin${net}`] !== 'undefined') {
        k.origin = k[`origin${net}`]
        v.origin = k[`origin${net}`]
      } else { delete k.origin; delete v.origin }
      if (typeof k[`location${net}`] !== 'undefined') {
        k.location = k[`location${net}`]
        v.location = k[`location${net}`]
      } else { delete k.location; delete v.location }
      if (typeof k[`owner${net}`] !== 'undefined') {
        k.owner = k[`owner${net}`]
        v.owner = k[`owner${net}`]
      } else { delete k.owner; delete v.owner }
    })
    */

  /*
  _defineCaller (global) {
    // Define our special "caller" property that is accessible in all jigs.
    // This should be done after all other deps are assigned, because any further sets will throw.
    // TODO: Sandboxing and this should move to Sandbox
    if (!('caller' in global)) {
      Object.defineProperty(global, 'caller', {
        get: () => JigControl._caller(),
        set: () => { throw new Error('Must not set caller') },
        configurable: true,
        enumerable: true
      })
    }
  }
  */
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

function checkValidUpgrade (C, T, network) {
  // Make sure we only upgrade to the same kind of type
  _assert(C.toString().startsWith('class') === T.toString().startsWith('class'),
    'Must only upgrade classes to classes and functions to functions')

  // Make sure there are no preset bindings
  if (_hasOwnProperty(T, 'presets')) {
    const npresets = T.presets[network]
    Bindings._BINDINGS.forEach(x => {
      _assert(!(x in npresets), 'Preset bindings not supported for upgrades')
    })
  }

  // Make sure no native code
  _assert(!_isNative(T), 'Cannot upgrade to native code')
  _assert(!_isNative(C), 'Native code may not be upgraded')

  // Only deployed code may be upgraded
  const Membrane = require('./membrane')
  const origin = Membrane._sudo(() => C.origin)
  _assert(origin !== Bindings._UNDEPLOYED, 'Cannot upgrade undeployed code')
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
        _assert(orig.txid && ('vout' in orig || 'vdel' in orig) && !('berry' in orig))
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
  if (_hasOwnProperty(T, 'sealed')) {
    switch (T.sealed) {
      case true:
      case false:
      case 'owner':
        break
      default:
        throw new Error(`Invalid sealed option: ${T.sealed}`)
    }
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
  _deploy,
  _setSourceCode,
  _getSourceCode,
  _get,
  _isNative,
  _getNativeDep,
  _isCode,
  _activate,
  _notify
}
