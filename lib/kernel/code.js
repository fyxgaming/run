/**
 * code.js
 */

const Dynamic = require('../util/dynamic')
const Log = require('../util/log')
const {
  _text, _kernel, _checkArgument, _checkState, _parent, _isAnonymous, _isUndefined,
  _isBasicObject, _hasOwnProperty, _setOwnProperty, _assert
} = require('../util/misc')
const Bindings = require('../util/bindings')
const { _BINDINGS, _location, _nonce, _owner, _satoshis } = Bindings
const Sandbox = require('../util/sandbox')
const { _deepClone, _deepVisit } = require('../util/deep')
const SI = Sandbox._intrinsics

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Code'

// Mapping of code to their editors
const CODE_EDITOR = new WeakMap()

// Mapping of local types to code
const REPOSITORY = {} // { [network]: Map<T, C> }

// Map of native code for quick lookups
const NATIVE = {} // { [name]: Code }

// Reserved properties
const RESERVED = [
  // Code methods
  'constructor', 'toString', 'upgrade', 'sync', 'auth', 'destroy',
  // Future properties
  'encryption'
]

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * Code API is to Code as Function is to a standard class
 *
 * Unlike Function, Code instances will not extend from this prototype, but its methods will
 * be made available and instanceof will pass. Code is publicly available to the user.
 */
class Code {
  /**
   * Creates a blank code jig
   *
   * If T is specified, the Code will automatically create Code for T
   * If local is true, T will be sandboxed. Otherwise, not.
   */
  constructor (T, local = true, newCode = []) {
    Log._debug(TAG, 'New', _text(T))

    // Check if T is already installed as code
    const prevCode = lookupByType(T)
    if (prevCode) return prevCode

    // Create a new dynamic type that allows for upgrades
    const D = new Dynamic()

    // Also create an editor that allows us to store metadata and act on this code
    const editor = new Editor()

    // Create a membrane that enforces the code usage rules for uses
    const membrane = {}

    // Wrap the dynamic type in the membrane
    const C = new Proxy(D, membrane)

    // Initialize the editor with the code jig
    editor._init(C)

    // Install T if it was provided
    if (T) editor._install(T, local, newCode)

    // Add ourselves to the general code set for instanceof checks
    CODE_EDITOR.set(C, editor)

    // Also add ourselves to the new code list
    newCode.push(C)

    // Return the code jig to the user, not this instance
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
    // Can't sync a non-jig child class
    const editor = CODE_EDITOR.get(this)
    _checkState(editor, 'sync unavailable')

    // Native code has nothing to sync
    if (editor._native) return

    // Sync
    const sync = require('./sync')
    await sync(this, options)

    // Return this for chaining
    return this
  }

  // --------------------------------------------------------------------------

  /**
   * Upgrades this code jig to a completely new class or function
   */
  upgrade (T, local = true) {
    Log._debug(TAG, 'Upgrade', _text(T))

    const editor = CODE_EDITOR.get(this)
    _checkState(editor && !editor._native, 'upgrade unavailable')

    const newCode = []

    editor._install(T, local, newCode)

    /*
    const file = CodeDeps._File._find(this)
    // Upgrade not available for native code
    if (file._native) return
    // Upgrade the code
    file._upgrade(T)
    // Not available inside jig code
    // TODO
    return this
    */

    // TODO: Upgrade action
    // What if fail?

    /*
      const Action = require('./action')
      const Record = require('./record')
      const CURRENT_RECORD = Record._CURRENT_RECORD

      // Deploy the new code
      CURRENT_RECORD._multiple(() => {
        // Deploy each fresh install
        installs.forEach(x => x._deploy())

        // Upgrade the class
        Action._upgrade(this._jig, snapshot)
      })
      */
  }

  // --------------------------------------------------------------------------

  /**
   * Spends this code jig, effectively authorizing its ownership
   */
  auth () {
    // TODO
    // Auth not available for native code
    // if (file._native) return
    // const { _record } = require('./commit')
    // const Command = require('./command')
    // _record(record => Command._auth(record, this._jig))
  }

  // --------------------------------------------------------------------------

  /*
   * Destroys this code jig
   */
  destroy () {
    // TODO
    // Destroy not available for native code
    // if (file._native) return
    // const { _record } = require('./commit')
    // const Command = require('./command')
    // _record(record => Command._destroy(record, this._jig))
  }

  // --------------------------------------------------------------------------

  static [Symbol.hasInstance] (x) {
    return CODE_EDITOR.has(x)
  }
}

// ------------------------------------------------------------------------------------------------
// Editor
// ------------------------------------------------------------------------------------------------

/**
 * Every code jig has an editor that may be used to perform internal operations
 */
class Editor {
  _init (C) {
    this._T = undefined
    this._C = C
    this._network = ''
    try { this._network = _kernel()._blockchain._network } catch (e) { }
    this._native = undefined
    this._internal = false
    this._installed = false

    // Create a repository for the network if it doesn't exist
    REPOSITORY[this._network] = REPOSITORY[this._network] || new Map()
  }

  // --------------------------------------------------------------------------

  /**
   * Sets the inner type of this code jig and ensures it is valid for a jig
   *
   * This is used by both deploy and upgrade.
   */
  _install (T, local, newCode) {
    const Membrane = require('./membrane')

    _assert(!this._native)

    Log._debug(TAG, 'Install', _text(T))

    // Save the old inner type that we're replacing, in case of a rollback
    const oldInnerType = Membrane._sudo(() => this._C.__type__)

    // Pre-emptively set the new type
    REPOSITORY[this._network].delete(this._T)
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
      checkNoReservedWords(T)
      this._checkUpgradable(T)

      // Create the sandbox if T is not sandboxed
      const S = local ? this._sandbox(T, ParentCode, newCode) : T

      // Set the sandboxed type to the jig
      Membrane._sudo(() => { this._C.__type__ = S })

      // Apply presets down
      if (_hasOwnProperty(S, 'presets') && S.presets[this._network]) {
        const npresets = S.presets[this._network]
        Object.getOwnPropertyNames(npresets).forEach(x => _setOwnProperty(S, x, npresets[x]))
        delete S.presets
      }

      // Assign bindings
      if (this._installed) {
        // First install. No presets? New bindings!
        if (!_hasOwnProperty(S, 'location')) Bindings._init(S)
      } else {
        // Upgrade. Copy.
        _BINDINGS.forEach(name => _setOwnProperty(S, name, oldInnerType[name]))
      }

      // Store new settings
      if (local) this._T = T
      this._native = false
      this._installed = true
    } catch (e) {
      // Set back the old local type, then rethrow
      REPOSITORY[this._network].delete(T)
      if (this._T) REPOSITORY[this._network].set(this._T, this._C)

      Membrane._sudo(() => { this._C.__type__ = oldInnerType })

      // Rethrow
      throw e
    }
  }

  // --------------------------------------------------------------------------

  _installNative (T, internal = false) {
    Log._debug(TAG, 'Install native', _text(T))

    // Cannot upgrade native code
    _assert(this._native === undefined)

    // Parents not allowed
    _assert(!_parent(T))

    // Only one name allowed for native code
    _assert(!(T.name in NATIVE))

    // Sandbox the native code
    const [S, SGlobal] = Sandbox._sandboxType(T)
    Object.assign(SGlobal, T.deps)

    // Apply the sandbox to the code jig
    const Membrane = require('./membrane')
    Membrane._sudo(() => { this._C.__type__ = S })

    // Set native bindings
    S.origin = `native://${T.name}`
    S.location = `native://${T.name}`
    S.nonce = 0
    S.owner = null
    S.satoshis = null

    // Set editor properties
    this._T = T
    this._native = true
    this._internal = internal
    this._installed = true

    // Add this as a native type
    NATIVE[T.name] = this._C

    // TODO: Membrane._init with each install
    // Membrane ... native code cannot change
    // Membrane ... native code does not have code methods
    // No, code methods are not callable

    /*
    // Native code cannot have props. Their deps are applied directly.
    Object.assign(SGlobal, T.deps)

    // If in cover mode, after installing the code and deps, delete the props.
    // Because S === T and otherwise the deps cause problems.
    if (process.env.COVER) {
      Object.keys(S).forEach(key => { delete S[key] })
    }

    // Copy specific properties
    if (_hasOwnProperty(T, 'sealed')) _setOwnProperty(S, 'sealed', T.sealed)

    return this
    */
  }

  // --------------------------------------------------------------------------

  _deploy () {
    deployMultiple(this._C)
  }

  // --------------------------------------------------------------------------

  _copyBindingsToLocalType () {
    // If not a local type, nothing to copy
    const T = this._T
    if (!T) return

    // If we already have a binding, then nothing to set
    if (_hasOwnProperty(T, 'location')) return

    // Create spots for the presets if they aren't there
    if (!_hasOwnProperty(T, 'presets')) _setOwnProperty(T, 'presets', {})
    if (!_hasOwnProperty(T.presets, this._network)) _setOwnProperty(T.presets, this._network, {})

    // Set each binding
    const Membrane = require('./membrane')
    Membrane._sudo(() => {
      _BINDINGS.forEach(x => {
        _setOwnProperty(T.presets[this._network], x, this._C[x])
        _setOwnProperty(T, x, this._C[x])
      })
    })
  }

  // --------------------------------------------------------------------------

  _sandbox (T, ParentCode, newCode) {
    // Create the sandboxed with no dependencies or props except the parent
    const env = {}
    if (ParentCode) env[ParentCode.name] = ParentCode
    const [S, SGlobal] = Sandbox._sandboxType(T, env)

    // Recreate deps in the sandbox
    const props = Object.assign({}, T)
    const makeCode = x => typeof x === 'function' ? new Code(x, false, newCode) : undefined
    const Sprops = _deepClone(props, SI, makeCode)

    // If the sandbox code does not have deps, create it. Then add the implicit parent.
    if (ParentCode) {
      Sprops.deps = Sprops.deps || new SI.Object()
      Sprops.deps[ParentCode.name] = ParentCode
    }

    // Assign deps as globals
    Object.assign(SGlobal, Sprops.deps)

    // Assign props
    Object.keys(Sprops).forEach(name => _setOwnProperty(S, name, Sprops[name]))

    return S
  }

  // --------------------------------------------------------------------------

  _checkUpgradable (T) {
    // If no existing type, then we're not upgrading
    if (!this._installed) return

    // Make sure there are no presets for upgrades. This isn't supported.
    if (_hasOwnProperty(T, 'presets')) {
      const npresets = T.presets[this._network]
      const noPresetsError = 'Preset bindings not supported for upgrades'
      const checkNoPresets = x => _checkState(!(x in npresets), noPresetsError)
      Bindings._BINDINGS.forEach(x => checkNoPresets(x))
    }

    // Disallow upgrading native code
    _checkState(!this._native, 'Cannot upgrade native code')

    // Disallow upgrading to a different jig
    _checkArgument(!(T instanceof Code), 'Cannot upgrade to a code jig')

    // Undeployed code cannot be upgraded. We need an origin even if its a record.
    const Membrane = require('./membrane')
    const origin = Membrane._sudo(() => this._C.origin)
    _checkState(origin !== Bindings._UNDEPLOYED, 'Cannot upgrade undeployed code')
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function checkType (T) {
  _checkArgument(typeof T === 'function', 'Only functions and classes are supported')
  _checkArgument(!_isAnonymous(T), 'Anonymous functions and classes cannot be jigs')
  _checkArgument(!T.prototype || T.prototype.constructor === T, 'Prototypal inheritance not supported')
  _checkArgument(T.toString().indexOf('[native code]') === -1, 'Cannot install native code')
}

// ------------------------------------------------------------------------------------------------

function checkDeps (T, ParentCode) {
  if (!_hasOwnProperty(T, 'deps')) return
  _checkArgument(_isBasicObject(T.deps), 'deps must be a basic object')
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

function lookupByType (T) {
  // If T is already Code, return it
  if (CODE_EDITOR.has(T)) return T

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
  _assert(!CODE_EDITOR.get(C)._internal)

  return C
}

// ------------------------------------------------------------------------------------------------

function deployMultiple (...jigs) {
  const Action = require('./action')
  const deploySet = new Set()

  // Find all inner jigs to deploy
  jigs.forEach(jig => {
    // Must only deploy non-native code
    const editor = CODE_EDITOR.get(jig)
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
  const Code = require('./code')
  const Membrane = require('./membrane')

  _assert(jig instanceof Code)

  if (set.has(jig)) return

  // Check if undeployed
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

function activate () {
  // Get the repository
  let network = ''
  try { network = _kernel()._blockchain.network } catch (e) { }
  if (!REPOSITORY[network]) return

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

// ------------------------------------------------------------------------------------------------

Code._lookupByType = lookupByType
Code._lookupByNativeId = lookupByNativeId
Code._activate = activate
Code._editor = C => CODE_EDITOR.get(lookupByType(C))

module.exports = Code
