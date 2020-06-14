/**
 * code.js
 *
 * A jig for code such as classes and functions
 */

const Membrane = require('./membrane')
const Record = require('./record')
const { _DeployAction } = Record
const { Jig } = require('../jig')
const { Berry } = require('../berry')
const Log = require('../../util/log')
const Sandbox = require('../../util/sandbox')
const { _kernel } = require('../../util/misc')
const { _text } = require('../../util/type')
const { _deepClone, _deepVisit } = require('../../util/deep')
const { InstallFailedError } = require('../../util/errors')
const Bindings = require('../../util/bindings')
const { _parent, _isBasicObject, _isUndefined, _isBoolean } = require('../../util/type')
const { _transaction } = require('./record')

// TODO
// instanceof Code, and remove _resourceType
// native types
// not all code functions are the same. anonymous shouldn't call with this.
// activate changes original bindings?

// ------------------------------------------------------------------------------------------------
// GLOBALS
// ------------------------------------------------------------------------------------------------

const TAG = 'Code'

const REPOSITORIES = new Map() // Network -> (T | Location | Code -> Code)

const BINDINGS = ['location', 'origin', 'owner', 'satoshis']
const RESERVED = ['toString', 'deploy', 'upgrade', 'sync', 'release']

const ACTIVE_REPOSITORY = () => {
  const network = _kernel()._blockchain.network
  if (REPOSITORIES.has(network)) return REPOSITORIES.get(network)
  return REPOSITORIES.set(network, new Map()).get(network)
}

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * A Code Jig
 *
 * This is the equivalent of the Jig class for code jigs. To create a new Code jig, supply a class
 * or function into the constructor of Code, and the return will be a jig version of that code with
 * all the same functionality, as well as a few additional features like upgrade and sync.
 *
 * Code jigs are jigs. Methods may change their properties. Their owner may be assigned a different
 * value to send it to a new owner. But they are also special in that they are upgradable, and
 * their code is applied to object jigs.
 *
 * Code jigs are unique for each network. The same T will generate different code jigs on
 * different networks. However, within a given network, most Code objects will be the same.
 * This helps with instanceof checks, and they are more likely to be static unlike jigs.
 *
 * The relationship between Code, C, Membrane, S, and T is complex. Code is essentially a
 * constructor, but the returned object is not a Code instance. Instead, it is a special proxy
 * of the original T, sandboxed to become S, and then wrapped using the Membrane. The code object
 * persists too as a container of metadata about the code, but is not seen externally.
 */
class Code {
  constructor (T) {
    const network = _kernel()._blockchain.network

    // Always create the parent first
    const Parent = _parent(T)
    const ParentCode = Parent && new Code(Parent)

    // Check if this code already exists. We must do this after installing the parent, in case
    // the parent referenced the child and already installed it.
    const presetLocation = preset('location', T, network)
    const repository = ACTIVE_REPOSITORY()
    const PrevCode = typeof T === 'function' && (repository.get(T) || repository.get(presetLocation))
    if (PrevCode) return PrevCode

    Log._info(TAG, 'Installing', _text(T))

    checkValid(T, ParentCode)

    // Sandbox the code
    const env = {}
    if (ParentCode) { env[ParentCode.name] = ParentCode }
    const [S, SGlobal] = Sandbox._sandboxType(T, env)

    // NOTE ABOUT SANDBOXED CODE... not playing nice with proxies
    // Don't use S

    // Turn the sandboxed code into a jig
    const membrane = new Membrane()
    const C = new Sandbox._intrinsics.Proxy(S, membrane)
    membrane._init(S, C)

    // Setup metacode properties
    this._network = network
    this._T = T
    this._C = C
    this._membrane = membrane
    this._methodTable = null
    this._methodAPI = null

    // Attach code jig functions
    membrane._userOverrides.set('deploy', (...args) => this._deploy(...args))
    membrane._userOverrides.set('upgrade', (...args) => this._upgrade(...args))
    membrane._userOverrides.set('sync', (...args) => this._sync(...args))
    membrane._userOverrides.set('release', (...args) => this._release(...args))

    // Apply location, origin, etc. on the original type in addition to the sandbox
    this._enableBindingSyncing()

    // Hijack the prototype chain to enable upgrades
    this._enableUpgrades()

    try {
      // Temporarily add the new code for dependencies, even though its not fully installed
      repository.set(T, C)
      repository.set(C, C)
      if (presetLocation) repository.set(presetLocation, C)

      // TODO: Why is deps not being applied correctly?

      // Assign class properties on the sandbox, including presets and deps
      const props = _deepClone(Object.assign({}, T), Sandbox._intrinsics)
      if (ParentCode) {
        props.deps = props.deps || new Sandbox._intrinsics.Object()
        props.deps[Parent.name] = ParentCode
      }
      Object.assign(SGlobal, props.deps)
      Membrane._sudo(() => {
        Object.assign(C, props)
        delete C.presets
      })
      if (hasPresets(T, network)) {
        Membrane._sudo(() => Object.assign(C, props.presets[network]))
      }

      // Set initial blockchain object properties
      if (!presetLocation) {
        Membrane._sudo(() => {
          const undeployed = prop => `error://Not deployed\n\nHint: Deploy the code first to assign ${prop}`
          C.origin = undeployed('origin')
          C.location = undeployed('location')
          C.nonce = 0
          C.owner = new Bindings._Unbound(undefined)
          C.satoshis = new Bindings._Unbound(0)
        })
        // if (ParentCode) Object.setPrototypeOf(S, Object.getPrototypeOf(Object))
      }

      return C
    } catch (e) {
      repository.delete(T)
      repository.delete(C)
      repository.delete(presetLocation)

      throw e
    }
  }

  _deploy () {
    const Cs = Array.from(whatNeedsToBeDeployed(this._C))
    _transaction(record => record._add(new _DeployAction(Cs)))
  }

  _upgrade () {
    // TODO
  }

  _sync () {
    // TODO
  }

  _release () {
    // TODO
  }

  _enableBindingSyncing (network) {
    const oldset = this._membrane.set.bind(this._membrane)

    this._membrane.set = (target, prop, val, receiver) => {
      if (Bindings._BINDINGS.includes(prop)) {
        this._T[prop] = val
        this._T.presets = this._T.presets || {}
        this._T.presets[this._network] = this._T.presets[this._network] || {}
        this._T.presets[this._network][prop] = val
      }

      return oldset(target, prop, val, receiver)
    }
  }

  _enableUpgrades () {
    const C = this._C
    Membrane._sudo(() => {
      class MethodTableHandler {
        set (target, prop, value) {
          return false
        }
      }

      this._methodTable = {}
      this._methodAPI = new Proxy(this._methodTable, new MethodTableHandler())

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

  /**
   * Gets whether a value is a possible Code jig.
   */
  static [Symbol.hasInstance] (x) {
    const repository = ACTIVE_REPOSITORY()
    return typeof x === 'function' && repository.has(x) && repository.get(x) === x
  }

  /**
   * Gets a previous install
   */
  static _get (T) {
    const network = _kernel()._blockchain.network
    const presetLocation = preset('location', T, network)
    const repository = ACTIVE_REPOSITORY()
    return repository.get(T) || repository.get(presetLocation)
  }

  static _activate () {
    // TODO
    // Remove all props
    // Apply base props
    // Apply custom presets
  }
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
 * Returns whether presets exist on a particular network
 */
function hasPresets (T, network) {
  return Object.getOwnPropertyNames(T).includes('presets') && !!T.presets[network]
}

// ------------------------------------------------------------------------------------------------

/**
 * Checks if T is valid to become a code jig
 */
function checkValid (T, ParentCode) {
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
  checkReserved(T)
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
    const DepParentCode = ACTIVE_REPOSITORY().get(DepParent)
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
        Bindings._location(npresets.location, Bindings._JIG | Bindings._USER)
        Bindings._location(npresets.origin, Bindings._JIG | Bindings._USER)
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

function checkOptions (T) {
  if (!Object.getOwnPropertyNames(T).includes('options')) return

  const options = T.options
  if (!_isBasicObject(options)) throw new InstallFailedError(T, 'options must be an object')

  Object.keys(options).forEach(option => {
    switch (option) {
      case 'utility':
        if (!_isBoolean(options.utility)) throw new InstallFailedError(T, 'utility must be a boolean')
        break
      default:
        throw new Error(`Unknown option: ${option}`)
    }
  })
}

// ------------------------------------------------------------------------------------------------

function whatNeedsToBeDeployed (C, set = new Set()) {
  if (set.has(C)) return
  const location = Membrane._sudo(() => C.location)
  const undeployed = location.startsWith('error://')
  if (!undeployed) return
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

module.exports = Code
