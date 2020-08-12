/**
 * code.js
 *
 * A base class like Jig for tokenized classes and functions
 */

const {
  _text, _kernel, _checkArgument, _checkState, _parent, _isAnonymous, _isUndefined,
  _isBasicObject, _hasOwnProperty, _setOwnProperty, _assert
} = require('../util/misc')
const Dynamic = require('../util/dynamic')
const Log = require('../util/log')
const { _deepClone, _deepVisit } = require('../util/deep')
const Bindings = require('../util/bindings')
const { _BINDINGS, _location, _nonce, _owner, _satoshis } = Bindings
const Sandbox = require('../util/sandbox')
const Snapshot = require('../util/snapshot')
const SI = Sandbox._intrinsics

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Code'

// Mapping of code to their editors
const EDITOR = new WeakMap() // Code -> Editor

// Mapping of local types to their network-specific code
const REPOSITORY = {} // { [network]: Map<T, C> }

// Map of names to native code
const NATIVE = {} // { [name]: Code }

// Reserved properties
const RESERVED = [
  // Code methods
  'upgrade', 'sync', 'auth', 'destroy', 'toString',
  // Future properties
  'encryption', 'blockhash', 'blocktime', 'blockheight'
]

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * Code is to a code jig as Function is to a standard class
 *
 * Unlike Function, Code instances will not extend from this prototype but their methods will
 * be made available and instanceof checks will pass. Code is publicly available to the user.
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
    Log._debug(TAG, 'Create')

    // Check if T is already installed as code
    const prevCode = lookupByType(T)
    if (prevCode) return prevCode

    // Create a new dynamic type that allows for upgrades
    const D = new Dynamic()

    // Also create an editor that allows us to store metadata and act on this code
    const editor = new Editor()

    // Create a membrane that enforces the ownership rules for users
    const Membrane = require('./membrane')
    const membrane = new Membrane()

    // Wrap the dynamic type in the membrane to create the code
    const C = new Proxy(D, membrane)

    // Configure the membrane for the code.
    // Native code will need to have its kind changed below.
    membrane._init(Membrane._KIND_CODE, C, D)

    // Make the dynamic's outer type, its constructor, be the new code
    Dynamic._setOuterType(D, C)

    // Initialize the editor with the code jig and also the dynamic type
    editor._init(C, D, membrane)

    // Install T if it was provided
    if (T) editor._install(T, local, newCode)

    // Add the code and editor enabling instanceof checks and other lookups
    EDITOR.set(C, editor)

    // Also add ourselves to the new code list
    newCode.push(C)

    // Return the code jig, not this instance, to the caller.
    // The membrane will hook up the methods below.
    return C
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

    // Can't sync a non-jig child class
    const editor = EDITOR.get(this)
    _checkState(editor, 'Sync unavailable')

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
    const CURRENT_RECORD = Record._CURRENT_RECORD

    Log._debug(TAG, 'Upgrade', _text(this), 'to', _text(T))

    // Non-jig child classes and native code cannot be upgraded. Errors.
    const editor = EDITOR.get(this)
    _checkState(editor && !editor._native, 'Upgrade unavailable')

    // Save a snapshot in case we need to rollback
    const snapshot = new Snapshot(this)

    try {
      // Install the new type on our code to upgrade it
      const newCode = []
      editor._install(T, local, newCode)

      // Log potentially multiple actions for upgrade
      CURRENT_RECORD._multiple(() => {
        // Deploy each new code needed to upgrade
        if (newCode.length) deployMultiple(...newCode)

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
    const editor = EDITOR(this)
    _checkState(editor && !editor._native, 'Auth unavailable')

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
    const editor = EDITOR(this)
    _checkState(editor && !editor._native, 'Destroy unavailable')

    // Record a destroy action
    const Action = require('./action')
    Action._destroy(this)

    // Return self for chaining
    return this
  }

  // --------------------------------------------------------------------------

  static [Symbol.hasInstance] (x) {
    // Having an editor means it must be code. No other way.
    return EDITOR.has(x)
  }
}

// ------------------------------------------------------------------------------------------------
// Editor
// ------------------------------------------------------------------------------------------------

/**
 * Every code jig has an editor that may be used to perform internal operations
 */
class Editor {
  _init (C, D, membrane) {
    this._L = undefined // Local type
    this._C = C // Code type
    this._D = D // Dynamic type
    this._membrane = membrane // Proxy membrane
    this._installed = false // Whether anything was installed
    this._network = '' // Network, if non-native
    try { this._network = _kernel()._blockchain._network } catch (e) { }
    this._native = undefined // Whether a native type
    this._internal = false // Whether internal-only if native
  }

  // --------------------------------------------------------------------------

  /**
   * Sets the inner type of this code jig and ensures it is valid for a jig
   *
   * This is used by both deploy and upgrade.
   */
  _install (T, local = true, newCode = []) {
    Log._debug(TAG, 'Install', _text(T))

    // Native code cannot be upgraded
    _assert(!this._native)

    // Save the old inner type that we're replacing, in case of a rollback
    const oldInnerType = Dynamic._getInnerType(this._D)

    // Create a repository for the network if one doesn't exist
    REPOSITORY[this._network] = REPOSITORY[this._network] || new Map()

    // Pre-emptively add the new type to the repository if its local
    REPOSITORY[this._network].delete(this._L)
    if (local) REPOSITORY[this._network].set(T, this._C)

    try {
      // Check if T is an installable class or function
      checkType(T)

      // Create the parent first
      const Parent = _parent(T)
      const ParentCode = Parent && new Code(Parent)

      // Check properties
      checkDeps(T, ParentCode)
      checkPresets(T)
      checkOptions(T)
      checkNoBindings(T)
      checkUpgradable(T, this)

      // Create the sandbox if T is not sandboxed
      const S = local ? makeSandbox(T, local, newCode, ParentCode) : T

      // Set the sandboxed type to the jig
      Dynamic._setInnerType(this._D, S)

      // Apply presets onto the sandbox
      if (_hasOwnProperty(S, 'presets')) {
        const npresets = S.presets[this._network]
        const presetNames = Object.getOwnPropertyNames(npresets || {})
        presetNames.forEach(name => _setOwnProperty(S, name, npresets[name]))

        // Remove presets from code jigs. They are for local types only.
        delete S.presets
      }

      if (this._installed) {
        // Upgrade. Copy over bindings.
        _BINDINGS.forEach(name => _setOwnProperty(S, name, oldInnerType[name]))
      } else {
        // New install. Setup first-time bindings if no presets.
        if (!_hasOwnProperty(S, 'location')) Bindings._init(S)
      }

      // Success. Update the editor.
      if (local) this._L = T
      this._installed = true
      this._native = false
      this._internal = false
    } catch (e) {
      // Failure. Set the repository back to storing the old local type
      REPOSITORY[this._network].delete(T)
      if (this._L) REPOSITORY[this._network].set(this._L, this._C)

      // Set back the old local type onto the dynamic
      Dynamic._setInnerType(this._D, oldInnerType)

      // Rethrow
      throw e
    }
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
    const [S, SGlobal] = Sandbox._sandboxType(T, env, native)
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

    // Change the membrane kind
    const Membrane = require('./membrane')
    this._membrane._kind = Membrane._KIND_NATIVE

    // Set editor properties
    this._L = T
    this._installed = true
    this._native = true
    this._internal = internal
  }

  // --------------------------------------------------------------------------

  _deploy () {
    Log._info(TAG, 'Deploy', _text(this._C))

    // Native code cannot be deployed
    _checkState(!this._native, 'Cannot deploy native code')

    // Use our deploy helper with only ourselves
    deployMultiple(this._C)
  }

  // --------------------------------------------------------------------------

  _copyBindingsToLocalType () {
    // If not a local type, nothing to copy
    const T = this._L
    if (!T) return

    // Create slots for the presets if they aren't there
    if (!_hasOwnProperty(T, 'presets')) _setOwnProperty(T, 'presets', {})
    if (!_hasOwnProperty(T.presets, this._network)) _setOwnProperty(T.presets, this._network, {})

    // If we already have top-level bindings, then we'll just add presets
    const onlySetPresets = _hasOwnProperty(T, 'location')

    // Set each binding
    const Membrane = require('./membrane')
    Membrane._sudo(() => {
      _BINDINGS.forEach(x => {
        _setOwnProperty(T.presets[this._network], x, this._C[x])
        if (!onlySetPresets) _setOwnProperty(T, x, this._C[x])
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
  _checkArgument(T.toString().indexOf('[native code]') === -1, `Cannot install intrinsic: ${_text(T)}`)
  _checkArgument(T !== Code, 'The Code class cannot be used in jigs')
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
    _checkArgument(DepParentCode && DepParentCode === ParentCode, 'Parent dependency mismatch')
  }
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
      _owner(npresets.owner)
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
  const badWord = RESERVED.find(word => propNames.includes(word))
  _checkArgument(!badWord, `Must not have any reserved words: ${badWord}`)
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
  const Membrane = require('./membrane')
  const origin = Membrane._sudo(() => editor._C.origin)
  _checkState(origin !== Bindings._UNDEPLOYED, 'Cannot upgrade undeployed code')
}

// ------------------------------------------------------------------------------------------------

function makeSandbox (T, local, newCode, ParentCode) {
  // Create the sandbox type with no dependencies or properties except the parent
  const env = {}
  if (ParentCode) env[ParentCode.name] = ParentCode
  const native = false
  const [S, SGlobal] = Sandbox._sandboxType(T, env, native)

  // Recreate deps in the sandbox
  const props = Object.assign({}, T)
  const makeCode = x => typeof x === 'function' ? new Code(x, local, newCode) : undefined
  const Sprops = _deepClone(props, SI, makeCode)

  // If the sandbox code does not have deps, create it. Then add the implicit parent.
  if (ParentCode) {
    Sprops.deps = Sprops.deps || new SI.Object()
    Sprops.deps[ParentCode.name] = ParentCode
  }

  // Assign deps as globals
  Object.assign(SGlobal, Sprops.deps)

  // Assign props on sandbox
  Object.keys(Sprops).forEach(name => _setOwnProperty(S, name, Sprops[name]))

  // Create special caller property
  defineCaller(SGlobal)

  return S
}

// ------------------------------------------------------------------------------------------------

function defineCaller (SGlobal) {
  // If caller is already a global, don't override
  if ('caller' in SGlobal) return

  const Record = require('./record')

  // Define our special "caller" property that is accessible in all jigs.
  Object.defineProperty(SGlobal, 'caller', {
    get: () => Record._CURRENT_RECORD._caller(),
    set: () => { throw new Error('Must not set caller') },
    configurable: true,
    enumerable: true
  })
}

// ------------------------------------------------------------------------------------------------
// Deploy helpers
// ------------------------------------------------------------------------------------------------

function deployMultiple (...jigs) {
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
  const Jig = require('./jig')
  const Berry = require('./berry')
  const Membrane = require('./membrane')

  _assert(jig instanceof Code)

  if (set.has(jig)) return

  // Check if we should add this jig to the set
  const location = Membrane._sudo(() => jig.location)
  const { undeployed } = _location(location)
  if (!undeployed) return set
  set.add(jig)

  // Check if the parent needs to be deployed
  const Parent = _parent(jig)
  if (Parent) whatNeedsToBeDeployed(Parent, set)

  const props = Membrane._sudo(() => Object.assign({}, jig))

  // Check each inner property to find code to deploy
  _deepVisit(props, x => {
    if (x instanceof Code) whatNeedsToBeDeployed(x, set)
    return !(x instanceof Code || x instanceof Jig || x instanceof Berry)
  })

  return set
}

// ------------------------------------------------------------------------------------------------
// Code Lookup
// ------------------------------------------------------------------------------------------------

function lookupByType (T) {
  // If T is already code, return it
  if (EDITOR.has(T)) return T

  // If T is a local type, return its code
  let network = ''
  try { network = _kernel()._blockchain._network } catch (e) { }
  const prevCode = REPOSITORY[network] && REPOSITORY[network].get(T)
  if (prevCode) return prevCode
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
// Activate
// ------------------------------------------------------------------------------------------------

function activate () {
  // Get the repository for the network being activated
  let network = ''
  try { network = _kernel()._blockchain.network } catch (e) { }
  if (!REPOSITORY[network]) return

  // Set bindings for each local type from their presets
  function activateBindings (T) {
    _BINDINGS.forEach(name => {
      const preset = _hasOwnProperty(T, 'presets') && _hasOwnProperty(T.presets, network) &&
        T.presets[network][name]
      _setOwnProperty(T, name, preset)
    })
  }

  // When local classes extends from Code classes, we still need to sudo
  const Membrane = require('./membrane')
  Membrane._sudo(() => REPOSITORY[network].forEach(activateBindings))
}

// ------------------------------------------------------------------------------------------------

Code._lookupByType = lookupByType
Code._lookupByNativeId = lookupByNativeId
Code._activate = activate
Code._editor = C => EDITOR.get(lookupByType(C))

module.exports = Code
