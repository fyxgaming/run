/**
 * file.js
 *
 * General code jig manager
 */

const Log = require('../util/log')
const Bindings = require('../util/bindings')
const { _BINDINGS, _location, _nonce, _owner, _satoshis } = Bindings
const Sandbox = require('../util/sandbox')
const Snapshot = require('../util/snapshot')
const { _deepClone, _deepVisit } = require('../util/deep')
const {
  _kernel, _assert, _text, _parent, _isBasicObject, _isUndefined, _hasOwnProperty,
  _setOwnProperty, _sandboxSourceCode, _checkState, _checkArgument
} = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// GLOBALS
// ------------------------------------------------------------------------------------------------

const TAG = 'File'

// All of our files. Indexed, by network, then type.
// { <network>: WeakMap<Local | Code, File> }
const DIRECTORY = {}

// Installed local code. This is used to change presets in activate().
const LOCALS = new Set()

// Map of native code for quick lookups
// Code -> File
const NATIVES = new Map()

// ------------------------------------------------------------------------------------------------
// File
// ------------------------------------------------------------------------------------------------

/**
 * A manager and container for a particular code jig
 */
class File {
  // --------------------------------------------------------------------------
  // Properties
  // --------------------------------------------------------------------------

  // _src: ?string
  // _jig: ?Code
  // _membrane: ?Membrane
  // _native: ?boolean
  // _internal: ?boolean
  // _network: ?string
  // _local: ?Function

  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  /**
   * Creates a file
   *
   *  - If a file for T exists and it is not internal-only, returns that file
   *  - If a file for T does not exist, install T into a new file
   *  - If T is undefined, create an empty base file
   *
   * This means `new File(T)._jig` can be used to get jig dependencies.
   */
  constructor (T = undefined, local = true, installs = new Set()) {
    // Check if this file was created and not internal
    try {
      const prev = File._find(T)
      if (prev) _assert(!prev._internal)
      if (prev) return prev
    } catch (e) { /* no-op */ }

    const Membrane = require('./membrane')
    const Sandbox = require('../util/sandbox')

    // Create the unique base class for this code jig
    const BASE_SRC = 'function Base() {}'
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
    if (T) this._installLocal(T, local, installs)
  }

  // --------------------------------------------------------------------------
  // _installLocal
  // --------------------------------------------------------------------------

  /**
   * Installs a new local type onto the file and the directory. Installs dependencies as needed.
   */
  _installLocal (T, local = true, installs = new Set()) {
    Log._info(TAG, 'Install', _text(T))

    _checkState(!this._local, 'Code cannot be installed twice')

    // Check if T is valid
    checkInstallable(T)

    // Get the network and directory
    this._network = _kernel()._blockchain.network
    DIRECTORY[this._network] = DIRECTORY[this._network] || new WeakMap()
    const directory = DIRECTORY[this._network]

    try {
      // Set the local now that we know it
      this._local = T

      // Pre-emptively the source code so that it is available in Code.prototype.toString()
      this._src = _sandboxSourceCode(T.toString(), T)

      // Pre-emptively install the child to the directory assuming it will work.
      // Even though we don't have the code yet, it lets us hook up dependencies.
      directory.set(this._local, this)
      directory.set(this._jig, this)
      if (local) LOCALS.add(this._local)

      // Create the parent first
      const Parent = _parent(T)
      const ParentCode = Parent && new File(Parent, local, installs)._jig

      // Check properties
      checkDeps(T, ParentCode)
      checkPresets(T)
      checkOptions(T)
      checkBindings(T)
      checkForReservedCodeWords(T)

      // Sandbox T
      const env = {}
      if (ParentCode) env[Parent.name] = ParentCode
      const [S, SGlobal] = Sandbox._sandboxType(T, env)

      // Set the inner type to the sandbox
      this._setInnerType(S)

      // Recreate deps in the sandbox
      const props = Object.assign({}, T)
      const makeCode = x => typeof x === 'function' ? new File(x, local, installs)._jig : undefined
      const Sprops = _deepClone(props, Sandbox._intrinsics, makeCode)

      // If the sandbox code does not have deps, create it. Then add the implicit parent.
      if (ParentCode) {
        if (!_hasOwnProperty(Sprops, 'deps')) {
          const desc = new Sandbox._intrinsics.Object()
          desc.enumerable = true
          desc.configurable = true
          desc.writable = true
          desc.value = new Sandbox._intrinsics.Object()
          Object.defineProperty(Sprops, 'deps', desc)
        }
        Sprops.deps[Parent.name] = ParentCode
      }

      // Assign deps as globals
      Object.assign(SGlobal, Sprops.deps)

      // Copy sandbox props onto the jig
      Object.keys(Sprops).forEach(name => {
        _setOwnProperty(S, name, Sprops[name])
      })

      // Apply presets down
      delete S.presets
      if (_hasOwnProperty(T, 'presets') && T.presets[this._network]) {
        const npresets = Sprops.presets[this._network]
        Object.getOwnPropertyNames(npresets).forEach(x => _setOwnProperty(S, x, npresets[x]))
      }

      // Apply initial undeployed bindings
      const presetLocation = preset(T, 'location', this._network)
      if (!presetLocation) Bindings._init(S)

      // We've finished installing it
      installs.add(this)
    } catch (e) {
      // There was an error installing. Revert the install.
      directory.delete(this._local)
      directory.delete(this._jig)
      LOCALS.delete(this._local)
      this._local = null

      // Rethrow back to user
      throw e
    }
  }

  // --------------------------------------------------------------------------
  // _installNative
  // --------------------------------------------------------------------------

  /**
   * Installs a code as a native jig
   */
  _installNative (T, internal = false) {
    Log._debug(TAG, 'Install native', _text(T))

    // Parents not allowed
    _assert(!_parent(T))

    // Cannot install the native twice
    const nativeFiles = Array.from(NATIVES.values())
    _assert(!nativeFiles.some(file => file._getInnerType().name === T.name))

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
    NATIVES.set(this._jig, this)

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
      S.sync = () => { }
      S.upgrade = () => { }
      S.destroy = () => { }
      S.auth = () => { }
    }

    // Freeze the sandbox
    _deepVisit(S, x => Object.freeze(x))
    _deepVisit(S.prototype, x => Object.freeze(x))

    return this
  }

  // --------------------------------------------------------------------------
  // _upgrade
  // --------------------------------------------------------------------------

  /**
   * Upgrades the code in an action on the blockchain
   */
  _upgrade (T, local = true) {
    const Code = require('./code')

    Log._info(TAG, 'Upgrade', _text(T))

    // Check if T is valid
    checkInstallable(T)

    // Make sure we only upgrade to the same kind of type
    const wasClass = this._jig.toString().startsWith('class')
    const willBeClass = T.toString().startsWith('class')
    const badUpgradeError = 'Must only upgrade classes to classes and functions to functions'
    _checkArgument(wasClass === willBeClass, badUpgradeError)

    // Make sure there are no presets for upgrades. This isn't supported.
    if (_hasOwnProperty(T, 'presets')) {
      const npresets = T.presets[this._network]
      const noPresetsError = 'Preset bindings not supported for upgrades'
      const checkNoPresets = x => _assert(!(x in npresets), noPresetsError)
      Bindings._BINDINGS.forEach(x => checkNoPresets(x))
    }

    // Disallow upgrading native code
    _checkState(!this._native, 'Cannot upgrade native code')

    // Disallow upgrading to a different jig
    _checkArgument(!(T instanceof Code), 'Cannot upgrade to a code jig')

    // Undeployed code cannot be upgraded. We need an origin even if its a record.
    const Membrane = require('./membrane')
    const origin = Membrane._sudo(() => this._jig.origin)
    _checkState(origin !== Bindings._UNDEPLOYED, 'Cannot upgrade undeployed code')

    // Get the directory
    const directory = DIRECTORY[this._network]

    // Save the old local in case we need to roll back
    const oldLocal = this._local

    // Save the old bindings so that we can reapply them on the new class
    const oldBindings = {}
    Membrane._sudo(() => _BINDINGS.forEach(x => { oldBindings[x] = this._jig[x] }))

    // Save a snapshot of the old class
    const snapshot = new Snapshot(this._jig)

    try {
      // Save the new source code so we can sandbox
      this._src = _sandboxSourceCode(T.toString(), T)

      // Set the local now that we've saved the old one
      this._local = T
      directory.delete(oldLocal)
      directory.set(this._local, this)
      if (local) LOCALS.add(this._local)

      // Track our fresh installs, because we'll deploy them
      const installs = new Set()

      // Always create the parent first
      const Parent = _parent(T)
      const ParentCode = Parent && new File(Parent, local, installs)._jig

      // Check properties
      checkDeps(T, ParentCode)
      checkPresets(T)
      checkOptions(T)
      checkBindings(T)
      checkForReservedCodeWords(T)

      // Sandbox the code
      const env = {}
      if (ParentCode) { env[ParentCode.name] = ParentCode }
      const [S, SGlobal] = Sandbox._sandboxType(T, env)

      // Set the inner type to the sandbox
      this._setInnerType(S)

      // Recreate deps in the sandbox
      const props = Object.assign({}, T)
      const makeCode = x => typeof x === 'function' ? new File(x, local, installs)._jig : undefined
      const Sprops = _deepClone(props, Sandbox._intrinsics, makeCode)

      // If the sandbox code does not have deps, create it. Then add the implicit parent.
      if (ParentCode) {
        if (!_hasOwnProperty(Sprops, 'deps')) {
          const desc = new Sandbox._intrinsics.Object()
          desc.enumerable = true
          desc.configurable = true
          desc.writable = true
          desc.value = new Sandbox._intrinsics.Object()
          Object.defineProperty(Sprops, 'deps', desc)
        }
        Sprops.deps[Parent.name] = ParentCode
      }

      // Assign deps as globals
      Object.assign(SGlobal, Sprops.deps)

      // Copy sandbox props onto the jig
      Object.keys(Sprops).forEach(name => {
        _setOwnProperty(S, name, Sprops[name])
      })

      // Apply presets down
      delete S.presets
      if (_hasOwnProperty(T, 'presets') && T.presets[this._network]) {
        const npresets = Sprops.presets[this._network]
        Object.getOwnPropertyNames(npresets).forEach(x => _setOwnProperty(S, x, npresets[x]))
      }

      // Apply old bindings
      Membrane._sudo(() => {
        Object.keys(oldBindings).forEach(x => _setOwnProperty(S, x, oldBindings[x]))
      })

      const Action = require('./action')
      const CURRENT_RECORD = require('./record')

      // Deploy the new code
      CURRENT_RECORD._multiple(() => {
        // Deploy each fresh install
        installs.forEach(x => x._deploy())

        // Upgrade the class
        Action._upgrade(this._jig, snapshot)
      })

      return this
    } catch (e) {
      snapshot._rollback()

      directory.delete(this._local)
      directory.set(oldLocal, this)

      LOCALS.delete(this._local)
      LOCALS.add(oldLocal, this)

      this._local = oldLocal

      throw e
    }
  }

  // --------------------------------------------------------------------------
  // _deploy
  // --------------------------------------------------------------------------

  /**
   * Deploys the code onto the blockchain
   */
  _deploy () {
    // Check that there is code to deploy
    _assert(this._local)

    // Deploy this class
    File._deployMultiple(this._jig)

    return this
  }

  // --------------------------------------------------------------------------
  // _destroy
  // --------------------------------------------------------------------------

  _destroy () {
    const { _record } = require('./commit')
    const Command = require('./command')
    _record(record => Command._destroy(record, this._jig))
  }

  // --------------------------------------------------------------------------
  // _auth
  // --------------------------------------------------------------------------

  _auth () {
    const { _record } = require('./commit')
    const Command = require('./command')
    _record(record => Command._auth(record, this._jig))
  }

  // --------------------------------------------------------------------------
  // _setInnerType
  // --------------------------------------------------------------------------

  /**
   * Directly changes the class or function for the code jig.
   *
   * This is a bit dangerous but has its uses (ie. rollbacks).
   */
  _setInnerType (T) {
    // Native code cannot change their type
    _assert(!this._native)

    // Update properties
    this._src = _sandboxSourceCode(T.toString(), T)
    this._membrane._init(T, this._jig)

    // We insert the Code prototype at the top of the food chain to give it jig behavior
    const Code = require('./code')
    if (!_parent(T) && !this._internal) Object.setPrototypeOf(T, Code.prototype)

    // Delete all methods from the method table
    const methodTable = Object.getPrototypeOf(this._jig.prototype)
    const deleteMethod = method => { delete methodTable[method] }
    Object.getOwnPropertyNames(methodTable).forEach(deleteMethod)

    // Update the prototype of the method table
    const parentPrototype = Object.getPrototypeOf(T.prototype)
    Object.setPrototypeOf(methodTable, parentPrototype)

    // Copy over the new methods to the method table
    const methods = Object.getOwnPropertyNames(T.prototype)
    methods.forEach(method => {
      const desc = Object.getOwnPropertyDescriptor(T.prototype, method)
      Object.defineProperty(methodTable, method, desc)
    })

    // Make sure to point the constructor back to the code jig
    methodTable.constructor = this._jig
  }

  // --------------------------------------------------------------------------
  // _getInnerType
  // --------------------------------------------------------------------------

  /**
   * Gets the actual class represented by the code jig
   */
  _getInnerType () {
    return this._native ? this._jig : this._membrane._target
  }

  // --------------------------------------------------------------------------
  // _setLocalBindings
  // --------------------------------------------------------------------------

  /**
   * Applies the current jig bindings to the local
   */
  _setLocalBindings () {
    const T = this._local
    const network = this._network

    // If we already have a binding, then nothing to set
    if (_hasOwnProperty(T, 'location')) return

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

  // --------------------------------------------------------------------------
  // static _deployMultiple
  // --------------------------------------------------------------------------

  /**
   * Deploys multiple jigs and all their dependencies together
   */
  static _deployMultiple (...jigs) {
    const Action = require('./action')

    const deploySet = new Set()

    // Find all dependent jigs to deploy
    jigs.forEach(jig => {
      const file = File._find(jig)
      const dependentJigs = whatNeedsToBeDeployed(file._jig)
      dependentJigs.forEach(jig => deploySet.add(jig))
    })

    // Check if there is anything to deploy
    if (!deploySet.size) return

    // Create the action
    Action._deploy([...deploySet])
  }

  // --------------------------------------------------------------------------
  // static _find
  // --------------------------------------------------------------------------

  /**
   * Gets the File from its code jig or local type
   *
   * Note: We must not read T at all here. Only look it up by its object.
   */
  static _find (T) {
    // Check if native
    const file = NATIVES.get(T)
    if (file) return file

    // Get the code
    const network = _kernel()._blockchain.network
    if (!(network in DIRECTORY)) return
    return DIRECTORY[network].get(T)
  }

  // --------------------------------------------------------------------------
  // static _findNativeById
  // --------------------------------------------------------------------------

  /**
   * Gets a native code by its id (ie. native://Jig)
   */
  static _findNativeById (id) {
    _assert(id.startsWith('native://'))
    const name = id.slice('native://'.length)
    for (const [, file] of NATIVES) {
      if (file._getInnerType().name === name) {
        return file
      }
    }
  }

  // --------------------------------------------------------------------------
  // static _updateLocalBindings
  // --------------------------------------------------------------------------

  /**
   * Updates the presets on all of the files
   */
  static _updateLocalBindings () {
    let network = ''
    try { network = _kernel()._blockchain.network } catch (e) { }

    // When local classes extends from Code classes, we still need to sudo
    const Membrane = require('./membrane')
    Membrane._sudo(() => {
      const updateBinding = (T, x) => _setOwnProperty(T, x, preset(T, x, network))
      LOCALS.forEach(T => _BINDINGS.forEach(x => updateBinding(T, x)))
    })
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function checkInstallable (T) {
  _checkArgument(typeof T === 'function', 'Only functions and classes are supported')
  _checkArgument(T.name, 'Anonymous functions and classes cannot be jigs')
  _checkArgument(!T.prototype || T.prototype.constructor === T, 'Prototypal inheritance not supported')
  _checkArgument(T.toString().indexOf('[native code]') === -1, 'Cannot install native code')
}

// ------------------------------------------------------------------------------------------------

function checkDeps (T, ParentCode) {
  // Check deps are valid
  if (_hasOwnProperty(T, 'deps')) {
    _checkArgument(_isBasicObject(T.deps), 'deps must be an object')
    if (ParentCode) {
      const DepParent = T.deps[ParentCode.name]
      const DepParentFile = File._find(DepParent)
      _checkArgument(DepParentFile && DepParentFile._jig === DepParent, 'Parent dependency mismatch')
    }
  }
}

// ------------------------------------------------------------------------------------------------

function checkPresets (T) {
  // Check presets are valid
  if (_hasOwnProperty(T, 'presets')) {
    const presets = T.presets
    _checkArgument(_isBasicObject(presets), 'presets must be an object')

    for (const network of Object.keys(presets)) {
      const npresets = presets[network]
      _checkArgument(_isBasicObject(npresets), `${network} presets must be an object`)

      // Check that either presets have all bindings or none at all
      const anyBindings = _BINDINGS.some(prop => !_isUndefined(npresets[prop]))
      const allBindings = !_BINDINGS.some(prop => _isUndefined(npresets[prop]))
      _checkArgument(!anyBindings || allBindings, `${network} presets are not fully defined`)

      // Check that the preset bindings are valid if they exist
      if (anyBindings) {
        const loc = _location(npresets.location)
        _checkArgument(loc.txid && ('vout' in loc || 'vdel' in loc) && !('berry' in loc), 'Bad location')
        const orig = _location(npresets.origin)
        _checkArgument(orig.txid && ('vout' in orig || 'vdel' in orig) && !('berry' in orig), 'Bad origin')
        _nonce(npresets.nonce)
        _owner(npresets.owner)
        _satoshis(npresets.satoshis)
      }

      // Check for reserved words
      _checkArgument(!('deps' in npresets), `${network} presets must not contain deps`)
      _checkArgument(!('presets' in npresets), `${network} presets must not contain presets`)
      checkForReservedCodeWords(npresets)
    }
  }
}

// ------------------------------------------------------------------------------------------------

function checkOptions (T) {
  // Check options are valid
  if (_hasOwnProperty(T, 'sealed')) {
    const badSealed = `Invalid sealed option: ${T.sealed}`
    _checkArgument(T.sealed === true || T.sealed === false || T.sealed === 'owner', badSealed)
  }
}

// ------------------------------------------------------------------------------------------------

function checkBindings (T) {
  // Check bindings are valid
  const propNames = Object.getOwnPropertyNames(T)
  const badBinding = _BINDINGS.find(binding => propNames.includes(binding))
  _checkArgument(!badBinding, `Must not have any bindings: ${badBinding}`)
}

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
  const propNames = Object.getOwnPropertyNames(props)
  const reserved = Object.getOwnPropertyNames(Code.prototype)
  const badWord = reserved.find(word => propNames.includes(word))
  _checkArgument(!badWord, `Must not have any reserved words: ${badWord}`)
}

// ------------------------------------------------------------------------------------------------

function whatNeedsToBeDeployed (jig, set = new Set()) {
  const Jig = require('./jig')
  const Berry = require('./berry')
  const Code = require('./code')
  const Membrane = require('./membrane')

  _assert(jig instanceof Code)

  if (set.has(jig)) return

  const location = Membrane._sudo(() => jig.location)
  const { undeployed } = _location(location)

  if (!undeployed) return set

  set.add(jig)

  const Parent = _parent(jig)
  if (Parent) whatNeedsToBeDeployed(Parent, set)

  const props = Membrane._sudo(() => Object.assign({}, jig))

  _deepVisit(props, x => {
    if (x instanceof Code) whatNeedsToBeDeployed(x, set)
    return !(x instanceof Code || x instanceof Jig || x instanceof Berry)
  })

  return set
}

// ------------------------------------------------------------------------------------------------

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
