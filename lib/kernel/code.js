/**
 * code.js
 *
 * A base class like Jig but for classes and functions
 */

const {
  _text, _kernel, _checkArgument, _checkState, _parent, _isAnonymous, _isUndefined,
  _isBasicObject, _hasOwnProperty, _setOwnProperty, _assert, _extendsFrom,
  _deanonymizeSourceCode, _RESERVED_PROPS, _RESERVED_METHODS
} = require('../util/misc')
const Dynamic = require('../util/dynamic')
const Log = require('../util/log')
const { _deepClone, _deepVisit } = require('../util/deep')
const Bindings = require('../util/bindings')
const { _sudo } = require('../util/admin')
const { _BINDINGS, _location, _nonce, _owner, _satoshis } = Bindings
const Rules = require('./rules')
const Universal = require('./universal')
const Sandbox = require('../util/sandbox')
const Snapshot = require('../util/snapshot')
const Proxy2 = require('../util/proxy2')
const SI = Sandbox._intrinsics

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Code'

// Mapping of code to their editors
const EDITOR = new WeakMap() // Code -> Editor

// Mapping of local types to their network-specific code
const REPOSITORY = {} // { [network]: Map<T, C> }

// Preinstalls that will move into an actual repository once run is activated
const PREINSTALLS = new Map() // T -> C

// Map of names to native code
const NATIVE = {} // { [name]: Code }

// Some Jig methods that cannot be overridden. Except toString, destroy, and auth.
const JIG_NONOVERRIDABLE_PROPS = [Symbol.hasInstance]
const JIG_NONOVERRIDABLE_PROTOTYPE_PROPS = ['auth', 'sync', ..._BINDINGS]

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * Code is to a code jig as Function is to a standard class
 *
 * Unlike Function, Code instances will not extend from this prototype but their methods will
 * be made available via the membrane and instanceof checks will pass.
 */
class Code {
  /**
   * Creates a blank code jig
   *
   * Notes
   *  - This is intended only to be called internally.
   *  - If T is specified, the Code will automatically create Code for T.
   *  - If local is true, T will be sandboxed and its bindings updated.
   */
  constructor (T, local = true, newCode = []) {
    // Check if T is already installed as code
    const prevCode = lookupByType(T)
    if (prevCode) return prevCode

    // Create a new dynamic type that allows for upgrades
    const D = new Dynamic()

    // Also create an editor that allows us to store metadata and act on this code
    const editor = new Editor()

    // Wrap the dynamic type in the membrane to create the code
    const Membrane = require('./membrane')
    const C = new Membrane(D)

    // Make the dynamic's outer type, its constructor, be the new code
    Dynamic._setOuterType(D, C)

    // Initialize the editor with the code jig and also the dynamic type
    editor._init(C, D)

    // Add the code and editor enabling instanceof checks and other lookups
    EDITOR.set(C, editor)

    // Add the code to the universal jig's instance set
    Universal._CODE.add(C)

    // Install T if it was provided
    if (T) editor._install(T, local, newCode)

    // Also add ourselves to the new code list
    newCode.push(C)

    // Return the code jig, not this instance, to the caller.
    // The membrane will hook up the methods below.
    return C
  }

  // --------------------------------------------------------------------------

  /**
   * Gets the source code
   */
  toString () {
    // Non-code children have their source code calculated intact
    const editor = EDITOR.get(this)
    if (!editor) return _sudo(() => this.toString())

    // Get the source code
    const D = editor._D
    const src = _deanonymizeSourceCode(D.toString(), editor._T.name)

    // If non-native, return the source code directly
    if (!editor._native) return src

    // Otherwise, modify the source code to be clearly native code
    if (src.startsWith('class')) {
      return `class ${D.name} { [native code] }`
    } else {
      return `function ${D.name}() { [native code] }`
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Updates the jig to its latest state
   *
   * @param {?object} options
   * @param {boolean} options.forward Whether to forward sync or just wait for pending updates. Default true.
   * @param {boolean} options.inner Whether to forward sync inner jigs if forward syncing. Default true.
   */
  async sync (options = {}) {
    Log._debug(TAG, 'Sync', _text(this))

    // Can't sync a non-code child class
    const editor = EDITOR.get(this)
    _checkState(editor, 'sync unavailable')

    // Nothing to sync if native. Not an error.
    if (editor._native) return

    // Sync it
    const sync = require('./sync')
    await sync(this, options)

    // Return self for chaining
    return this
  }

  // --------------------------------------------------------------------------

  upgrade (T, local = true) {
    const Action = require('./action')
    const Record = require('./record')

    Log._debug(TAG, 'Upgrade', _text(this), 'to', _text(T))

    // Upgrade can only be called externally
    if (Record._CURRENT_RECORD._stack.length) throw new Error('upgrade unavailable')

    // Non-jig child classes and native code cannot be upgraded. Errors.
    const editor = EDITOR.get(this)
    _checkState(editor && !editor._native, 'upgrade unavailable')

    // Save a snapshot in case we need to rollback
    const snapshot = new Snapshot(this)

    try {
      // Install the new type on our code to upgrade it
      const newCode = []
      editor._install(T, local, newCode)

      // Log potentially multiple actions for upgrade
      Record._CURRENT_RECORD._capture(() => {
        // Deploy each new code needed to upgrade
        if (newCode.length) _deployMultiple(...newCode)

        // Upgrade the code
        Action._upgrade(this, snapshot)
      })
    } catch (e) {
      snapshot._rollback()
      throw e
    }

    // Return self for chaining
    return this
  }

  // --------------------------------------------------------------------------

  auth () {
    Log._debug(TAG, 'Auth', _text(this))

    // Non-jig child classes and native code cannot be authorized. Errors.
    const editor = EDITOR.get(this)
    _checkState(editor && !editor._native, 'auth unavailable')

    // Record a auth action
    const Action = require('./action')
    Action._auth(this)

    // Return self for chaining
    return this
  }

  // --------------------------------------------------------------------------

  destroy () {
    Log._debug(TAG, 'Destroy', _text(this))

    // Non-jig child classes and native code cannot be destroyed. Errors.
    const editor = EDITOR.get(this)
    _checkState(editor && !editor._native, 'destroy unavailable')

    // Record a destroy action
    const Action = require('./action')
    Action._destroy(this)

    // Return self for chaining
    return this
  }

  // --------------------------------------------------------------------------

  static [Symbol.hasInstance] (x) {
    return Universal._CODE.has(x)
  }
}

// ------------------------------------------------------------------------------------------------
// Editor
// ------------------------------------------------------------------------------------------------

/**
 * Every code jig has an editor that may be used to perform internal operations
 */
class Editor {
  _init (C, D) {
    this._T = undefined // Installed type, which changes with upgrades
    this._D = D // Dynamic type
    this._C = C // Code type
    this._preinstalled = false // Whether this class was partially installed
    this._installed = false // Whether anything was installed
    this._local = false // Whether code is a local type
    this._network = '' // Network, if non-native and installed
    try { this._network = _kernel()._blockchain.network } catch (e) { }
    this._native = undefined // Whether a native type
    this._internal = false // Whether internal-only if native
  }

  // --------------------------------------------------------------------------

  /**
   * Sets the inner type of this code jig and ensures it is valid for a jig
   *
   * This is used by both deploy and upgrade.
   *
   * If local is false, then T is assumed to already be sandboxed via makeSandbox.
   */
  _install (T, local = true, newCode = []) {
    Log._debug(TAG, 'Install', _text(T))

    // If preinstalled, finish installing
    if (this._preinstalled) {
      _assert(T === this._T)
      return this._postinstall()
    }

    // Native code cannot be upgraded
    _assert(!this._native)

    // Save the old inner type that we're replacing, in case of a rollback
    const oldInnerType = Dynamic._getInnerType(this._D)

    // Create a repository for the network if one doesn't exist
    REPOSITORY[this._network] = REPOSITORY[this._network] || new Map()

    // Pre-emptively add the new type to the repository if its local
    REPOSITORY[this._network].delete(this._T)
    if (local) REPOSITORY[this._network].set(T, this._C)

    try {
      this._setupBehavior(T, local, newCode)
      this._setupPresets()
      this._setupBindings(this._installed ? oldInnerType : null)

      // Success. Update the editor.
      this._T = T
      this._local = local
      this._preinstalled = false
      this._installed = true
      this._native = false
      this._internal = false
    } catch (e) {
      // Failure. Set the repository back to storing the old local type
      REPOSITORY[this._network].delete(T)
      if (this.local) REPOSITORY[this._network].set(this._T, this._C)

      // Set back the old local type onto the dynamic
      Dynamic._setInnerType(this._D, oldInnerType)

      // Rethrow
      throw e
    }
  }

  // --------------------------------------------------------------------------

  _preinstall (T) {
    // If already preinstalled, nothing to do
    if (this._preinstalled) return

    // If we've already activated run and have a network, then just install
    let active = true
    try { _kernel() } catch (e) { active = false }
    if (active) { this._install(T); return }

    Log._debug(TAG, 'Preinstall', _text(T))

    // Make sure user is not preinstalling an already installed class
    if (this._installed || this._native) throw new Error(`Cannot preinstall ${_text(T)}`)

    // Save this class into our preinstall set
    PREINSTALLS.set(T, this._C)

    try {
      // Setup our behavior. We don't setup presets or bindings.
      this._setupBehavior(T, true)

      // Success. Update the editor.
      this._T = T
      this._local = true
      this._preinstalled = true
      this._installed = false
      this._native = false
      this._internal = false
    } catch (e) {
      PREINSTALLS.delete(T)

      // Rethrow
      throw e
    }
  }

  // --------------------------------------------------------------------------

  _postinstall () {
    if (!this._preinstalled) return

    Log._debug(TAG, 'Postinstall', _text(this._T))

    // Try getting the new network
    this._network = _kernel()._blockchain.network

    try {
      // Remove from the preinstall set
      PREINSTALLS.delete(this._T)

      // Create a repository for the network if one doesn't exist
      REPOSITORY[this._network] = REPOSITORY[this._network] || new Map()

      // Pre-emptively add the new type to the repository if its local
      REPOSITORY[this._network].set(this._T, this._C)

      // Finish configuring the code with our now-known network
      this._setupPresets()
      this._setupBindings()

      // Update the editor
      this._preinstalled = false
      this._installed = true
    } catch (e) {
      PREINSTALLS.set(this._T, this._C)
      REPOSITORY[this._network].delete(this._T)
      this._network = ''
      throw e
    }
  }

  // --------------------------------------------------------------------------

  _setupBehavior (T, local = false, newCode = []) {
    // Create the sandbox if T is not sandboxed
    const S = local ? makeSandbox(this._C, T, local, newCode)[0] : T

    // Configure the membrane rules depending on whether the static code or jig code
    const Jig = require('./jig')
    const rules = _extendsFrom(T, Jig) ? Rules._code() : Rules._staticCode()
    Proxy2._getHandler(this._C)._rules = rules

    // Make sure we only upgrade jigs to jigs, and non-jigs to non-jigs
    if (this._installed) {
      const beforeJig = _extendsFrom(this._T, Jig)
      const afterJig = _extendsFrom(T, Jig)
      _checkState(beforeJig === afterJig, 'Cannot change staticness of code in upgrade')
    }

    // Turn the prototype methods into membranes
    const methods = Object.getOwnPropertyNames(S.prototype).filter(x => x !== 'constructor')
    methods.forEach(method => {
      const Membrane = require('./membrane')
      const methodRules = Rules._childProperty(this._C, true, true)
      S.prototype[method] = new Membrane(S.prototype[method], methodRules)
    })

    // Set the sandboxed type to the jig
    Dynamic._setInnerType(this._D, S)
  }

  // --------------------------------------------------------------------------

  _setupPresets () {
    _sudo(() => {
      // Apply presets onto the sandbox
      if (_hasOwnProperty(this._C, 'presets')) {
        const npresets = this._C.presets[this._network]
        const presetNames = Object.getOwnPropertyNames(npresets || {})
        presetNames.forEach(name => _setOwnProperty(this._C, name, npresets[name]))

        // Remove presets from code jigs. They are for local types only.
        delete this._C.presets
      }
    })
  }

  // --------------------------------------------------------------------------

  _setupBindings (bindingsToCopy) {
    _sudo(() => {
      if (bindingsToCopy) {
        // Upgrade. Copy over bindings.
        _BINDINGS.forEach(name => _setOwnProperty(this._C, name, bindingsToCopy[name]))
      } else {
        // New install. Setup first-time bindings if no presets.
        if (!_hasOwnProperty(this._C, 'location')) Bindings._init(this._C)
      }
    })
  }

  // --------------------------------------------------------------------------

  _installNative (T, internal = false) {
    Log._debug(TAG, 'Install native', _text(T))

    // Cannot install non-native code to native code
    _assert(this._native === undefined)

    // Parents not allowed
    _assert(!_parent(T))

    // Only one name allowed for native code
    _assert(!(T.name in NATIVE))

    // Sandbox the native code. Props not copied.
    const env = {}
    const native = true
    const anonymize = false
    const [S, SGlobal] = Sandbox._sandboxType(T, env, native, anonymize)
    Object.assign(SGlobal, T.deps)

    // Save allowed options in case we delete them in the next line
    const sealed = T.sealed

    // If in cover mode, delete the props. Because otherwise when S === T deps cause problems.
    if (process.env.COVER) Object.keys(S).forEach(key => { delete S[key] })

    // Copy allowed options onto sandbox
    if (_hasOwnProperty(S, 'sealed')) _setOwnProperty(S, 'sealed', sealed)

    // Set the sandboxed type to the code
    Dynamic._setInnerType(this._D, S)

    // Set native bindings
    S.origin = `native://${T.name}`
    S.location = `native://${T.name}`
    S.nonce = 0
    S.owner = null
    S.satoshis = null

    // Add this as a native type
    NATIVE[T.name] = this._C

    // Configure the membrane for native code
    Proxy2._getHandler(this._C)._rules = Rules._nativeCode()

    // Set editor properties
    this._T = T
    this._preinstalled = false
    this._installed = true
    this._local = true
    this._native = true
    this._internal = internal
  }

  // --------------------------------------------------------------------------

  _deploy () {
    Log._info(TAG, 'Deploy', _text(this._C))

    // Post install if necessary
    this._postinstall()

    // Native code cannot be deployed
    _checkState(!this._native, 'Cannot deploy native code')

    // Use our deploy helper with only ourselves
    _deployMultiple(this._C)
  }

  // --------------------------------------------------------------------------

  // For easy of use, local types that are not sandboxed nor jigs are still assigned locations
  // after their code is deployed. This allows local code to check locations and origins
  // easily. However, it is not fully reliable because updated props are not copied over.
  // As a jig is updated, these local types are not updated with them. We save just the
  // initial deployment bindings.
  _copyBindingsToLocalType () {
    // If not a local type, nothing to copy
    if (!this._local) return
    const T = this._T

    // Create slots for the presets if they aren't there
    if (!_hasOwnProperty(T, 'presets')) _setOwnProperty(T, 'presets', {})
    if (!_hasOwnProperty(T.presets, this._network)) _setOwnProperty(T.presets, this._network, {})

    // Set each binding only once if we don't have it
    _sudo(() => {
      _BINDINGS.forEach(x => {
        const presets = T.presets[this._network]
        if (!_hasOwnProperty(presets, x)) _setOwnProperty(presets, x, this._C[x])
        if (!_hasOwnProperty(T, x)) _setOwnProperty(T, x, this._C[x])
      })
    })
  }
}

// ------------------------------------------------------------------------------------------------
// Install helpers
// ------------------------------------------------------------------------------------------------

function checkType (T) {
  _checkArgument(typeof T === 'function', `Only functions and classes are supported: ${_text(T)}`)
  // Check for reserved words early. In particular, toString(), since it causes problems.
  checkNoReservedWords(T)
  _checkArgument(!T.prototype || T.prototype.constructor === T, `Prototypal inheritance not supported: ${_text(T)}`)
  _checkArgument(!_isAnonymous(T), `Anonymous types not supported: ${_text(T)}`)
  _checkArgument(T !== Code, 'The Code class itself cannot be used in code')
  _checkArgument(T.toString().indexOf('[native code]') === -1, `Cannot install intrinsic: ${_text(T)}`)
  checkNoOverrideJigMethods(T)
  checkNoSymbolMethods(T)
  checkNoAccessors(T)
}

// ------------------------------------------------------------------------------------------------

function checkDeps (T, ParentCode) {
  if (!_hasOwnProperty(T, 'deps')) return

  // Deps must be an object if it exists
  _checkArgument(_isBasicObject(T.deps), 'deps must be a basic object')

  // Ensure that if there is a parent, it matches what's actually the parent
  if (ParentCode) {
    const DepParent = T.deps[ParentCode.name]
    const DepParentCode = lookupByType(DepParent)
    _checkArgument(!DepParent || DepParentCode === ParentCode, 'Parent dependency mismatch')
  }

  // Ensure there are no dependencies named T
  _checkArgument(!(T.name in T.deps), 'Illegal dependency')
}

// ------------------------------------------------------------------------------------------------

function checkPresets (T) {
  if (!_hasOwnProperty(T, 'presets')) return

  const presets = T.presets
  _checkArgument(_isBasicObject(presets), 'presets must be a basic object')

  for (const network of Object.keys(presets)) {
    const npresets = presets[network]
    _checkArgument(_isBasicObject(npresets), `Presets for ${network} network must be an object`)

    // Check that either presets have all bindings or none at all
    const anyBindings = _BINDINGS.some(prop => !_isUndefined(npresets[prop]))
    const allBindings = !_BINDINGS.some(prop => _isUndefined(npresets[prop]))
    _checkArgument(!anyBindings || allBindings, `${network} presets not fully defined`)

    // Check that the preset bindings are valid if they exist
    if (anyBindings) {
      const loc = _location(npresets.location)
      _checkArgument(loc.txid && ('vout' in loc || 'vdel' in loc) && !('berry' in loc), 'Bad location')
      const orig = _location(npresets.origin)
      _checkArgument(orig.txid && ('vout' in orig || 'vdel' in orig) && !('berry' in orig), 'Bad origin')
      _nonce(npresets.nonce)
      _owner(npresets.owner, true)
      _satoshis(npresets.satoshis)
    }

    // Check for reserved words in presets
    _checkArgument(!('deps' in npresets), `${network} presets must not contain deps`)
    _checkArgument(!('presets' in npresets), `${network} presets must not contain presets`)
    checkNoReservedWords(npresets)
  }
}

// ------------------------------------------------------------------------------------------------

function checkOptions (T) {
  if (_hasOwnProperty(T, 'sealed')) {
    const badSealed = `Invalid sealed option: ${T.sealed}`
    _checkArgument(T.sealed === true || T.sealed === false || T.sealed === 'owner', badSealed)
  }
}

// ------------------------------------------------------------------------------------------------

function checkNoBindings (T) {
  const propNames = Object.getOwnPropertyNames(T)
  const badBinding = _BINDINGS.find(binding => propNames.includes(binding))
  _checkArgument(!badBinding, `Must not have any bindings: ${badBinding}`)
}

// ------------------------------------------------------------------------------------------------

function checkNoReservedWords (props) {
  const propNames = Object.getOwnPropertyNames(props)
  const badWord = _RESERVED_PROPS.find(word => propNames.includes(word)) ||
   _RESERVED_METHODS.find(word => propNames.includes(word))
  _checkArgument(!badWord, `Must not have any reserved words: ${badWord}`)
}

// ------------------------------------------------------------------------------------------------

function checkNoSymbolMethods (T) {
  const error = 'Symbol methods not supported'
  _sudo(() => {
    _checkState(!Object.getOwnPropertySymbols(T).length, error)
    _checkState(!Object.getOwnPropertySymbols(T.prototype).length, error)
  })
}

// ------------------------------------------------------------------------------------------------

function checkNoAccessors (T) {
  const error = 'Getters and setters not supported'
  const check = desc => _checkState(!('get' in desc || 'set' in desc), error)
  _sudo(() => {
    Object.getOwnPropertyNames(T)
      .map(name => Object.getOwnPropertyDescriptor(T, name))
      .forEach(desc => check(desc))
    Object.getOwnPropertyNames(T.prototype)
      .map(name => Object.getOwnPropertyDescriptor(T.prototype, name))
      .forEach(desc => check(desc))
  })
}

// ------------------------------------------------------------------------------------------------

function checkNoOverrideJigMethods (T) {
  const Jig = require('./jig')
  if (!_extendsFrom(T, Jig)) return
  const error = 'Cannot override Jig methods or properties'
  JIG_NONOVERRIDABLE_PROPS.forEach(prop => {
    _checkState(!Object.getOwnPropertyNames(T).includes(prop), error)
    _checkState(!Object.getOwnPropertySymbols(T).includes(prop), error)
  })
  JIG_NONOVERRIDABLE_PROTOTYPE_PROPS.forEach(prop => {
    _checkState(!Object.getOwnPropertyNames(T.prototype).includes(prop), error)
    _checkState(!Object.getOwnPropertySymbols(T.prototype).includes(prop), error)
  })
}

// ------------------------------------------------------------------------------------------------

function checkUpgradable (T, editor) {
  // Only run these checks if we're upgrading
  if (!editor._installed) return

  // Disallow upgrading native code
  _checkState(!editor._native, 'Cannot upgrade native code')

  // Disallow upgrading to a jig
  _checkArgument(!(T instanceof Code), 'Cannot upgrade to a code jig')

  // Check no presets. Upgrading with presets is not supported.
  if (_hasOwnProperty(T, 'presets')) {
    const npresets = T.presets[editor._network]
    const noPresetsError = 'Preset bindings not supported for upgrades'
    const checkNoPresets = x => _checkState(!(x in npresets), noPresetsError)
    Bindings._BINDINGS.forEach(x => checkNoPresets(x))
  }

  // Undeployed code cannot be upgraded because there needs to be an output to spend
  const origin = _sudo(() => editor._C.origin)
  _checkState(origin !== Bindings._UNDEPLOYED, 'Cannot upgrade undeployed code')
}

// ------------------------------------------------------------------------------------------------

function makeSandbox (C, T, local = false, newCode = undefined) {
  // Check if T is an installable class or function
  checkType(T)
  checkUpgradable(T, EDITOR.get(C))

  // Create the parent first
  const Parent = _parent(T)
  const ParentCode = Parent && new Code(Parent, local, newCode)
  if (ParentCode) Code._editor(ParentCode)._postinstall()

  // Check properties
  checkDeps(T, ParentCode)
  checkPresets(T)
  checkOptions(T)
  checkNoBindings(T)

  // Create the sandbox type with no dependencies or properties except the parent
  const env = {}
  if (ParentCode) env[ParentCode.name] = ParentCode
  const native = false
  const anonymize = true
  const [S, SGlobal] = Sandbox._sandboxType(T, env, native, anonymize)

  // Since anonymized, add the name back in
  Object.defineProperty(S, 'name', { value: T.name, configurable: true })

  // Recreate deps in the sandbox
  const props = Object.assign({}, T)
  const makeCode = x => typeof x === 'function' ? new Code(x, local, newCode) : undefined
  const Sprops = _deepClone(props, SI, makeCode)

  // If the sandbox code does not have deps, create it. Add the implicit parent
  if (ParentCode) {
    Sprops.deps = Sprops.deps || new SI.Object()
    Sprops.deps[ParentCode.name] = ParentCode
  }

  // Assign deps as globals
  Object.assign(SGlobal, Sprops.deps)

  // Add the proxy because we strip out the source code name
  SGlobal[T.name] = C

  // Assign props on sandbox
  Object.keys(Sprops).forEach(name => _setOwnProperty(S, name, Sprops[name]))

  // Create special caller property
  defineCaller(SGlobal)

  return [S, SGlobal]
}

// ------------------------------------------------------------------------------------------------

function preinstall (T) {
  const C = new Code()
  Code._editor(C)._preinstall(T)
  return C
}

// ------------------------------------------------------------------------------------------------

function defineCaller (SGlobal) {
  // If caller is already a global, don't override
  if ('caller' in SGlobal) return

  const Record = require('./record')

  // Define our special "caller" property that is accessible in all jigs.
  Object.defineProperty(SGlobal, 'caller', {
    get: () => Record._CURRENT_RECORD._caller(),
    set: () => { throw new Error('Cannot set caller') },
    configurable: true,
    enumerable: true
  })
}

// ------------------------------------------------------------------------------------------------
// Deploy helpers
// ------------------------------------------------------------------------------------------------

function _deployMultiple (...jigs) {
  const Action = require('./action')
  const deploySet = new Set()

  // Find all inner jigs to deploy
  jigs.forEach(jig => {
    // Must only deploy non-native code
    const editor = EDITOR.get(jig)
    _assert(!editor._native)

    jig = lookupByType(jig)
    const innerJigs = whatNeedsToBeDeployed(jig)
    innerJigs.forEach(jig => deploySet.add(jig))
  })

  // Check if there is anything to deploy
  if (!deploySet.size) return

  // Create the action
  Action._deploy([...deploySet])
}

// ------------------------------------------------------------------------------------------------

function whatNeedsToBeDeployed (jig, set = new Set()) {
  _assert(jig instanceof Code)

  if (set.has(jig)) return

  // Check if we should add this jig to the set
  const location = _sudo(() => jig.location)
  const { undeployed } = _location(location)
  if (!undeployed) return set

  // Check if the parent needs to be deployed
  const Parent = _parent(jig)
  if (Parent) whatNeedsToBeDeployed(Parent, set)

  // Add the current jig
  set.add(jig)

  const props = _sudo(() => Object.assign({}, jig))

  // Check each inner property to find code to deploy
  const Universal = require('./universal')
  _deepVisit(props, x => {
    if (x instanceof Code) whatNeedsToBeDeployed(x, set)
    return !(x instanceof Universal)
  })

  return set
}

// ------------------------------------------------------------------------------------------------
// Code Lookup
// ------------------------------------------------------------------------------------------------

function lookupByType (T) {
  // If T is already code, return it
  if (EDITOR.has(T)) return T

  // Find the repository for this network
  let network = ''
  try { network = _kernel()._blockchain.network } catch (e) { }
  const repository = REPOSITORY[network]
  if (!repository) return

  // Check if T is a local type with code already installed
  if (repository.has(T)) return repository.get(T)

  // If that didn't work, try finding C by its preset
  const presetLocation =
    _hasOwnProperty(T, 'presets') &&
    _hasOwnProperty(T.presets, network) &&
    T.presets[network].location
  if (!presetLocation) return

  for (const C of repository.values()) {
    if (_sudo(() => C.location) === presetLocation) return C
  }
}

// ------------------------------------------------------------------------------------------------

function lookupByNativeId (id) {
  // Find the native code
  _assert(id.startsWith('native://'))
  const name = id.slice('native://'.length)
  const C = NATIVE[name]
  if (!C) return undefined

  // Internal native code cannot be looked up. It must be known internally.
  _assert(!EDITOR.get(C)._internal)

  return C
}

// ------------------------------------------------------------------------------------------------
// Deactivate
// ------------------------------------------------------------------------------------------------

function deactivate () {
  let network = ''
  try { network = _kernel()._blockchain.network } catch (e) { }

  // Get the repository for the network being deactivated
  Log._info(TAG, 'Deactivate', network, 'bindings')

  if (!REPOSITORY[network]) return

  // Remove bindings from each local type
  function deactivateBindings (C, T) {
    _BINDINGS.forEach(name => { delete T[name] })
  }

  // When local classes extends from Code classes, we still need to sudo
  _sudo(() => REPOSITORY[network].forEach(deactivateBindings))
}

// ------------------------------------------------------------------------------------------------
// Activate
// ------------------------------------------------------------------------------------------------

function activate () {
  let network = ''
  try { network = _kernel()._blockchain.network } catch (e) { }

  Log._info(TAG, 'Activate', network, 'bindings')

  // Get the repository for the network being activated
  if (!REPOSITORY[network]) return

  // Set bindings for each local type from their presets
  function activateBindings (C, T) {
    _BINDINGS.forEach(name => {
      const preset = _hasOwnProperty(T, 'presets') && _hasOwnProperty(T.presets, network) &&
        T.presets[network][name]
      _setOwnProperty(T, name, preset)
    })
  }

  // When local classes extends from Code classes, we still need to sudo
  _sudo(() => REPOSITORY[network].forEach(activateBindings))

  // Install all preinstalls now that we know the network
  for (const C of PREINSTALLS.values()) {
    Code._editor(C)._postinstall()
  }
  PREINSTALLS.clear()
}

// ------------------------------------------------------------------------------------------------

Code._deployMultiple = _deployMultiple
Code._lookupByType = lookupByType
Code._lookupByNativeId = lookupByNativeId
Code._deactivate = deactivate
Code._activate = activate
Code._makeSandbox = makeSandbox
Code._preinstall = preinstall
Code._editor = C => EDITOR.get(lookupByType(C))

module.exports = Code
