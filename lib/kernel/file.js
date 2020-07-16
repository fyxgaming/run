/**
 * file.js
 *
 * A manager and container for a particular code jig
 */

const Log = require('../util/log')
const Bindings = require('../util/bindings')
const { _BINDINGS, _location, _nonce, _owner, _satoshis } = Bindings
const Sandbox = require('../util/sandbox')
const { _deepClone, _deepVisit } = require('../util/deep')
const {
  _kernel, _assert, _text, _parent, _isBasicObject, _isUndefined, _hasOwnProperty,
  _setOwnProperty, _sourceCode
} = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// GLOBALS
// ------------------------------------------------------------------------------------------------

const TAG = 'File'

// Our empty file code before installing
const BASE_SRC = 'function Base() {}'

// All of our files. Indexed, by network, then type.
const DIRECTORY = {} // Network -> WeakMap<Local|Code, File>

// Map of installed local code. Used to change presets on activate().
const LOCALS = new Set()

// Map of natives for quick lookups
const NATIVES = new Map() // Name -> File

// ------------------------------------------------------------------------------------------------
// File
// ------------------------------------------------------------------------------------------------

class File {
  /**
   * Creates a file
   *
   *  - If a file for T exists and it is not internal-only, returns that file
   *  - If a file for T does not exist, install T into a new file
   *  - If T is undefined, create an empty base file
   *
   * This means `new File(T)._jig` can be used to get jig dependencies.
   */
  constructor (T = undefined) {
    // Check if this file was created and not internal
    try {
      const network = _kernel().blockchain.network
      const directory = DIRECTORY[network]
      const prev = directory && directory.get(T)
      if (prev) _assert(!prev._internal)
      if (prev) return prev
    } catch (e) { /* no-op */ }

    const Membrane = require('./membrane')
    const Sandbox = require('../util/sandbox')

    // Create the unique base class for this code jig
    const [BASE] = Sandbox._evaluate(BASE_SRC)

    // Delete all methods from the base
    const deleteMethod = method => { delete BASE.prototype[method] }
    Object.getOwnPropertyNames(BASE.prototype).forEach(deleteMethod)

    // Setup a method table that allows us to completely replace the base behavior
    const methodTable = {}
    // TODO
    // const methodAPI = new Proxy(methodTable, new MethodTableHandler())
    const methodAPI = methodTable

    // Insert the method table in between our base and its prototype.
    // Code instances now will have two prototypes, the base and the method table.
    // This is because we can't proxy the base prototype, but we can proxy our insertion.
    const protoproto = Object.getPrototypeOf(BASE.prototype)
    Object.setPrototypeOf(methodTable, protoproto)
    Object.setPrototypeOf(BASE.prototype, methodAPI)

    // Freeze the base prototype to the user
    Object.freeze(BASE.prototype)

    // Create the code jig
    this._membrane = new Membrane()
    this._jig = new Sandbox._intrinsics.Proxy(BASE, this._membrane)

    // Our code is not native nor internal by default, and we don't know its network yet
    this._native = false
    this._internal = false
    this._network = null

    // If the type was specified, install it
    if (T) this._installLocal(T)
  }

  /**
   * Installs a new local type onto the file and the directory. Installs dependencies as needed.
   */
  _installLocal (T) {
    Log._info(TAG, 'Install', _text(T))

    _assert(!this._local, 'Code cannot be installed twice')

    try {
      this._network = _kernel()._blockchain.network
      this._local = T

      // Pre-emptively install the child to the directory assuming it will work.
      // Even though we don't have the code yet, it lets us hook up dependencies.
      DIRECTORY[this._network] = (DIRECTORY[this._network] || new WeakMap())
      DIRECTORY[this._network].set(this._local, this)
      DIRECTORY[this._network].set(this._jig, this)
      LOCALS.add(this._local)

      // Create the parent first
      const Parent = _parent(T)
      const ParentCode = Parent && new File(Parent)._jig

      // Check if T is valid
      _assert(typeof T === 'function', 'Only functions and classes may be deployed')
      _assert(T.name, 'Anonymous functions and classes cannot be jigs')
      _assert(!T.prototype || T.prototype.constructor === T, 'Prototypal inheritance not supported')
      _assert(T.toString().indexOf('[native code]') === -1, 'Cannot install native code')

      // Check deps are valid
      if (_hasOwnProperty(T, 'deps')) {
        _assert(_isBasicObject(T.deps), 'deps must be an object')
        if (ParentCode) {
          const DepParent = T.deps[ParentCode.name]
          const DepParentFile = File._find(DepParent)
          _assert(DepParentFile && DepParentFile._jig === DepParent, 'Parent dependency mismatch')
        }
      }

      // Check presets are valid
      if (_hasOwnProperty(T, 'presets')) {
        const presets = T.presets
        _assert(_isBasicObject(presets), 'presets must be an object')

        for (const network of Object.keys(presets)) {
          const npresets = presets[network]
          _assert(_isBasicObject(npresets), `${network} presets must be an object`)

          // Check that either presets have all bindings or none at all
          const anyBindings = _BINDINGS.some(prop => !_isUndefined(npresets[prop]))
          const allBindings = !_BINDINGS.some(prop => _isUndefined(npresets[prop]))
          _assert(!anyBindings || allBindings, `${network} presets are not fully defined`)

          // Check that the preset bindings are valid if they exist
          if (anyBindings) {
            const loc = _location(npresets.location)
            _assert(loc.txid && ('vout' in loc || 'vdel' in loc) && !('berry' in loc))
            const orig = _location(npresets.origin)
            _assert(orig.txid && ('vout' in orig || 'vdel' in orig) && !('berry' in orig))
            _nonce(npresets.nonce)
            _owner(npresets.owner)
            _satoshis(npresets.satoshis)
          }

          // Check for reserved words
          _assert(!('deps' in npresets), `${network} presets must not contain deps`)
          _assert(!('presets' in npresets), `${network} presets must not contain presets`)
          checkForReservedCodeWords(npresets)
        }
      }

      // Check options are valid
      if (_hasOwnProperty(T, 'sealed')) {
        const badSealed = `Invalid sealed option: ${T.sealed}`
        _assert(T.sealed === true || T.sealed === false || T.sealed === 'owner', badSealed)
      }

      // Check bindings are valid
      const props = Object.getOwnPropertyNames(T)
      const badBinding = _BINDINGS.find(binding => props.includes(binding))
      _assert(!badBinding, `Must not have any bindings: ${badBinding}`)

      // Check for reserved words
      checkForReservedCodeWords(props)

      // Sandbox T
      const env = {}
      if (ParentCode) env[Parent.name] = ParentCode
      const [S, SGlobal] = Sandbox._sandboxType(T, env)

      // Set the inner type to the sandbox
      this._setInnerType(S)

      // Recreate deps in the sandbox
      const makeCode = x => typeof x === 'function' ? new File(x)._jig : undefined
      const Sprops = _deepClone(props, Sandbox._intrinsics, makeCode)

      // If the sandbox code does not have deps, create it. Then add the implicit parent.
      if (ParentCode) {
        if (!_hasOwnProperty(Sprops, 'deps')) {
          const desc = new Sandbox._intrinsics.Object()
          desc.enumerable = true
          desc.configurable = true
          desc.value = new Sandbox._intrinsics.Object()
          Object.defineProperty(Sprops, 'deps', desc)
        }
        Sprops.deps[Parent.name] = ParentCode
      }

      // Assign deps as globals
      Object.assign(SGlobal, Sprops.deps)

      // Copy sandbox props onto the jig
      Object.assign(S, Sprops)

      // Apply presets down
      delete S.presets
      if (_hasOwnProperty(T, 'presets') && T.presets[this._network]) {
        Object.assign(S, Sprops.presets[this._network])
      }

      // Apply initial undeployed bindings
      const presetLocation = preset(T, 'location', this._network)
      if (!presetLocation) Bindings._init(S)
    } catch (e) {
      console.log(e, DIRECTORY[this._network], this._network)
    } finally {
      // There was an error installing. Revert the install.
      DIRECTORY[this._network].delete(this._local)
      DIRECTORY[this._network].delete(this._jig)
      LOCALS.delete(this._local)
      this._local = null
    }
  }

  /**
   * Installs a code as a native jig
   */
  _installNative (T, internal = false) {
    Log._debug(TAG, 'Install native', _text(T))

    // Parents not allowed
    _assert(!_parent(T))

    // Cannot install the native twice
    _assert(!NATIVES.has(T.name))

    // Sandbox the code
    const [S, SGlobal] = Sandbox._sandboxType(T, {}, true)

    // Setup the code
    this._local = T
    this._membrane = null
    this._jig = S
    this._native = true
    this._src = `class ${T.name} { [native code] }`
    this._network = null
    this._internal = internal

    // Add the code to our natives
    NATIVES.set(T.name, this)

    // Native code cannot have props. Their deps are applied directly.
    Object.assign(SGlobal, T.deps)

    // If in cover mode, after installing the code and deps, delete the props.
    // Because S === T and otherwise the deps cause problems.
    if (process.env.COVER) {
      Object.keys(S).forEach(key => { delete S[key] })
    }

    // Copy specific properties
    if (_hasOwnProperty(T, 'sealed')) _setOwnProperty(S, 'sealed', T.sealed)

    // Set bindings
    S.origin = `native://${T.name}`
    S.location = `native://${T.name}`
    S.nonce = 0
    S.owner = null
    S.satoshis = null

    // Non-internal native code must still have Code prototype to allow Jig and Berry extensions
    if (!this._internal) {
      const Code = require('./code')
      Object.setPrototypeOf(S, Code.prototype)
    } else {
      S.toString = () => this._src
    }

    // Freeze the sandbox
    _deepVisit(S, x => Object.freeze(x))
    _deepVisit(S.prototype, x => Object.freeze(x))

    return this
  }

  /**
   * Deploys the code onto the blockchain
   */
  _deploy () {
    return this
  }

  /**
   * Upgrades the code in an action on the blockchain
   */
  _upgrade (T) {
    const Code = require('./code')

    Log._info(TAG, 'Upgrade', _text(T))

    // Make sure we only upgrade to the same kind of type
    const wasClass = this._jig.toString().startsWith('class')
    const willBeClass = T.toString().startsWith('class')
    const badUpgradeError = 'Must only upgrade classes to classes and functions to functions'
    _assert(wasClass !== willBeClass, badUpgradeError)

    // Make sure there are no presets for upgrades. This isn't supported.
    if (_hasOwnProperty(T, 'presets')) {
      const npresets = T.presets[this._network]
      const noPresetsError = 'Preset bindings not supported for upgrades'
      const checkNoPresets = x => _assert(!(x in npresets), noPresetsError)
      Bindings._BINDINGS.forEach(x => checkNoPresets(x))
    }

    // Disallow upgrading native code
    _assert(!this._native)

    // Disallow upgrading to a different jig
    _assert(!(T instanceof Code), 'Cannot upgrade to a code jig')

    // Undeployed code cannot be upgraded. We need an origin even if its a record.
    const Membrane = require('./membrane')
    const origin = Membrane._sudo(() => this._jig.origin)
    _assert(origin !== Bindings._UNDEPLOYED, 'Cannot upgrade undeployed code')

    return this
  }

  /**
   * Directly changes the class or function for the code jig.
   *
   * This is a bit dangerous but has its uses (ie. rollbacks).
   */
  _setInnerType (T) {
    // Native code cannot change their type
    _assert(!this._native)

    // Update properties
    this._src = _sourceCode(T)
    this._membrane._init(T, this._jig)

    // We insert the Code prototype at the top of the food chain to give it jig behavior
    const Code = require('./code')
    if (!_parent(T) && !this._internal) Object.setPrototypeOf(T, Code.prototype)

    // Delete all methods from the method table
    const methodTable = Object.getPrototypeOf(this._jig.prototype)
    const deleteMethod = method => { delete methodTable[method] }
    Object.getOwnPropertyNames(methodTable).forEach(deleteMethod)

    // Copy over the new methods to the method table
    const methods = Object.getOwnPropertyNames(T.prototype)
    methods.forEach(method => {
      const desc = Object.getOwnPropertyDescriptor(T.prototype, method)
      Object.defineProperty(methodTable, method, desc)
    })

    // Make sure to point the constructor back to the code jig
    methodTable.constructor = this._jig
  }

  /**
   * Applies the current jig bindings to the local
   */
  _setLocalBindings () {
    const T = this._local
    const network = this._network

    // If we already have a binding, then nothing to set
    if (!_hasOwnProperty(T, 'location')) return

    // Create spots for the presets if they aren't there
    if (!_hasOwnProperty(T, 'presets')) _setOwnProperty(T, 'presets', {})
    if (!_hasOwnProperty(T.presets, network)) _setOwnProperty(T.presets, network, {})

    // Set each binding
    const Membrane = require('./membrane')
    Membrane._sudo(() => {
      _BINDINGS.forEach(x => {
        _setOwnProperty(T.presets[network], x, this._jig[x])
        _setOwnProperty(T, x, this._jig[x])
      })
    })
  }

  /**
   * Gets the File from its code jig or local type
   */
  static _find (T) {
    // Check if native
    const file = NATIVES.get(T.name)
    if (file && file._jig === T) return file

    // Get the code
    const network = _kernel()._blockchain.network
    if (!(network in DIRECTORY)) return
    return DIRECTORY[network].get(T)
  }

  /**
   * Gets a native code by its name
   */
  static _findNative (name) {
    return NATIVES.get(name)
  }

  /**
   * Updates the presets on all of the files
   */
  static _updateLocalBindings () {
    // When local classes extends from Code classes, we still need to sudo
    const Membrane = require('./membrane')
    Membrane._sudo(() => {
      const network = _kernel()._blockchain.network
      const updateBinding = (T, x) => _setOwnProperty(T, x, preset(T, x, network))
      LOCALS.forEach(T => _BINDINGS.forEach(x => updateBinding(T, x)))
    })
  }
}

// ------------------------------------------------------------------------------------------------
// Repository
// ------------------------------------------------------------------------------------------------

/*
class Repository {
  constructor (network) {
    this._network = network
    this._localToCode = new Map() // T -> C
    this._sandboxToCode = new Map() // S -> C
  }

  // --------------------------------------------------------------------------
  // _install
  // --------------------------------------------------------------------------

  // Options:
  // - _upgrade: { _T, _C }
  _install (T, options = {}) {
    const Membrane = require('./membrane')
    const Code = require('./code')
    const Command = require('./command')

    const upgrading = options._upgrade && options._upgrade._T === T

    let C = null
    let metadata = null

    if (upgrading) {
      C = options._upgrade._C
      metadata = CODE_METADATA.get(C)

      _assert(metadata._repository === this, 'Cannot upgrade: wrong network')

      Log._info(TAG, 'Upgrade', _text(C))

      this._checkValidUpgrade(C, T)

      // Track installs so we can deploy them dependencies
      _assert(!options._installs)
      options._installs = new Set()
    } else {
      const NativeCode = Repository._native()._get(T)
      if (NativeCode) {
        const isDep = Repository._native()._isDep(T)
        _assert(isDep, `${_text(T)} cannot be a dependency`)
        return NativeCode
      }
    }

    // Always create the parent first
    const Parent = _parent(T)
    const ParentCode = Parent && this._install(Parent, options)

    // Check if this code already exists. We must do this after installing the parent, in case
    // the parent references the child and already installed it.
    const PrevCode = this._get(T)
    if (PrevCode) return PrevCode

    if (!upgrading) {
      Log._info(TAG, 'Install', _text(T))
    }

    this._checkValid(T, ParentCode)

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
      // Create a secondary class that we'll use to enable upgrades
      const usrc = S.toString().startsWith('class') ? `class ${T.name}$BASE {}` : `function ${T.name} () { }`
      const [U] = Sandbox._evaluate(usrc, {})
      Object.setPrototypeOf(U, Object.getPrototypeOf(S))
      Object.setPrototypeOf(U.prototype, Object.getPrototypeOf(S.prototype))
      Object.getOwnPropertyNames(U.prototype).forEach(method => { delete U.prototype[method] })

      // Wrap the sandbox in a jig membrane
      const membrane = new Membrane()
      C = new Sandbox._intrinsics.Proxy(U, membrane)

      metadata = { _src: '', _membrane: membrane, _native: false }

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
    const OldT = metadata._T
    const OldS = metadata._S

    try {
      // Add props. Rollback if fail.
      // Temporarily add the new code for dependencies, even though its not fully installed
      this._localToCode.delete(OldT)
      this._sandboxToCode.delete(OldS)
      this._localToCode.set(T, C)
      this._sandboxToCode.set(S, C)
      CODE_METADATA.set(C, metadata)

      // Apply the methods to the Code
      Repository._setCodeTarget(C, S)

      // Update the metadata
      metadata._T = T
      metadata._S = S
      metadata._repository = this

      // Update the method table with the new instance methods
      const methodTable = Object.getPrototypeOf(C.prototype)
      Object.getOwnPropertyNames(methodTable).forEach(method => { delete methodTable[method] })
      const methods = Object.getOwnPropertyNames(S.prototype)
      methods.forEach(name => {
        const desc = Object.getOwnPropertyDescriptor(S.prototype, name)
        Object.defineProperty(methodTable, name, desc)
      })
      methodTable.constructor = C

      const props = Object.assign({}, T)

      // Recreate deps in the sandbox

      const makeCode = x => typeof x === 'function' ? this._install(x, options) : undefined
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

        if (hasPresets(T, this._network)) {
          Object.assign(C, Sprops.presets[this._network])
        }

        // Apply bindings
        if (upgrading) {
          Object.assign(C, oldBindings)
        } else {
          const presetLocation = preset(T, 'location', this._network)
          if (!presetLocation && !upgrading) Bindings._init(C)
        }
      })

      // If upgrading, deploy the new code
      if (upgrading) {
        const { _record, _recordMultiple } = require('./record')
        _recordMultiple(() => {
          // Install dependencies used to upgrade
          options._installs.forEach(I => this._deploy(I))

          // Upgrade the class
          _record(record => Command._upgrade(record, C, snapshot))
        })
      }

      if (options._installs) options._installs.add(C)

      return C
    } catch (e) {
      if (upgrading) {
        snapshot._rollback()
        this._localToCode.delete(T)
        this._localToCode.set(OldT, C)
        this._sandboxToCode.set(OldS, C)
      } else {
        this._localToCode.delete(T)
        this._sandboxToCode.delete(S)
        CODE_METADATA.delete(C)
      }

      throw e
    }
  }

  // --------------------------------------------------------------------------
  // _deploy
  // --------------------------------------------------------------------------

  _deploy (...Cs) {
    const CsExtended = new Set()

    Cs.forEach(C => {
      const metadata = CODE_METADATA.get(C)
      _assert(metadata, 'Missing metadata')
      _assert(metadata._repository === this, 'Cannot deploy: wrong network')

      const Xs = whatNeedsToBeDeployed(C)

      Xs.forEach(X => CsExtended.add(X))
    })

    const CsExtendedArr = Array.from(CsExtended)
    if (!CsExtendedArr.length) return

    const { _record } = require('./record')
    const Command = require('./command')
    _record(record => Command._deploy(record, ...CsExtendedArr))
  }

  // --------------------------------------------------------------------------
  // _destroy
  // --------------------------------------------------------------------------

  _destroy (C) {
    const metadata = CODE_METADATA.get(C)
    _assert(metadata, 'Missing metadata')
    _assert(metadata._repository === this, 'Cannot destroy: wrong network')

    const { _record } = require('./record')
    const Command = require('./command')
    _record(record => Command._destroy(record, C))
  }

  // --------------------------------------------------------------------------
  // _auth
  // --------------------------------------------------------------------------

  _auth (C) {
    const metadata = CODE_METADATA.get(C)
    _assert(metadata, 'Missing metadata')
    _assert(metadata._repository === this, 'Cannot auth: wrong network')

    const { _record } = require('./record')
    const Command = require('./command')
    _record(record => Command._auth(record, C))
  }
*/

// ------------------------------------------------------------------------------------------------
// NativeRepository
// ------------------------------------------------------------------------------------------------

/*
class NativeRepository extends Repository {
  constructor () {
    super('[native]')

    this._locationToCode = new Map() // Location -> C
    this._deps = new Set() // Location
  }

  // Options:
  //  -dep: true/false, whether can be used as a dependency
  _install (T, options = {}) {
    Log._debug(TAG, 'Install native', _text(T))

    // If native code was already installed, return it.
    const location = `native://${T.name}`
    const PrevCode = typeof T === 'function' && this._locationToCode.get(location)
    if (PrevCode) return PrevCode

    // Native code must be valid
    this._checkValid(T, undefined)

    // Parents not allowed
    _assert(!_parent(T))

    // Sandbox the code
    const [S, SGlobal] = Sandbox._sandboxType(T, {}, true)

    const _src = `class ${T.name} { [native code] }`
    const metadata = { _src, _T: T, _S: S, _repository: this, _native: true }

    // Add native code
    this._locationToCode.set(location, S)
    this._localToCode.set(T, S)
    this._sandboxToCode.set(S, S)
    if (options._dep) this._deps.add(location)
    CODE_METADATA.set(S, metadata)

    // Native code cannot have props. Their deps are applied directly.
    Object.assign(SGlobal, T.deps)

    // If in cover mode, after installing the code and deps, delete the props
    if (process.env.COVER) {
      Object.keys(S).forEach(key => { delete S[key] })
    }

    // Copy specific properties
    if (_hasOwnProperty(T, 'sealed')) _setOwnProperty(S, 'sealed', T.sealed)

    // Set bindings
    S.origin = location
    S.location = location
    S.nonce = 0
    S.owner = null
    S.satoshis = null

    // Native code must still have Code prototype to allow Jig and Berry extensions
    if (options._dep) {
      const Code = require('./code')
      Object.setPrototypeOf(S, Code.prototype)
    } else {
      S.toString = () => _src
    }

    // Freeze the sandbox
    _deepVisit(S, x => Object.freeze(x))
    _deepVisit(S.prototype, x => Object.freeze(x))

    return S
  }

  _isDep (T) {
    return this._deps.has(T.location) && this._locationToCode.get(T.location) === T
  }

  _getByLocation (location) {
    return this._locationToCode.get(location)
  }
}
*/

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

/**
 * Reads a preset property or returns undefined if it does not exist
 */
function preset (T, name, network) {
  if (typeof T !== 'function') return
  if (!Object.getOwnPropertyNames(T).includes('presets')) return
  const presets = T.presets
  if (typeof presets !== 'object' || !presets) return
  const npresets = presets[network]
  if (typeof npresets !== 'object' || !npresets) return
  return npresets[name]
}

// ------------------------------------------------------------------------------------------------

function checkForReservedCodeWords (props) {
  const Code = require('./code')
  const reserved = Object.getOwnPropertyNames(Code.prototype)
  const badWord = reserved.find(word => props.includes(word))
  _assert(!badWord, `Must not have any reserved words: ${badWord}`)
}

// ------------------------------------------------------------------------------------------------

/*
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

module.exports = File
