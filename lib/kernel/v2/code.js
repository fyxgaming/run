/**
 * code.js
 *
 * A jig for code such as classes and functions
 */

const Membrane = require('./membrane')
const { Jig } = require('../jig')
const { Berry } = require('../berry')
const Log = require('../../util/log')
const Sandbox = require('../../util/sandbox')
const { _activeRun, _text, _Type } = require('../../util/misc')
const { _deepClone, _deepVisit } = require('../../util/deep')
const { InstallFailedError } = require('../../util/errors')
const { _location, _owner, JIG, USER } = require('../../util/resource')
const { _isBasicObject, _isUndefined } = _Type

// TODO
// instanceof Code, and remove _resourceType
// native types
// not all code functions are the same. anonymous shouldn't call with this.

// ------------------------------------------------------------------------------------------------
// GLOBALS
// ------------------------------------------------------------------------------------------------

const REPOSITORY = new Map() // T | Location | Code -> Code

const TAG = 'Code'

const RESERVED = ['toString', 'deploy', 'upgrade', 'sync', 'release']

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

class Code {
  constructor (T) {
    const network = _activeRun().blockchain.network

    // Always create the parent first
    const Parent = parent(T)
    const ParentCode = Parent && new Code(Parent)

    // Check if this code already exists. We must do this after installing the parent, in case
    // the parent referenced the child and already installed it.
    const presetLocation = preset('location', T, network)
    const PrevCode = typeof T === 'function' && (REPOSITORY.get(T) || REPOSITORY.get(presetLocation))
    if (PrevCode) return PrevCode

    Log._info(TAG, 'Installing', _text(T))

    checkValid(T, ParentCode)

    // Sandbox the code
    const env = {}
    if (ParentCode) { env[ParentCode.name] = ParentCode }
    const [S, SGlobal] = Sandbox._sandboxType(T, env)

    // Turn the sandboxed code into a jig
    const membrane = new Membrane()
    const C = new Sandbox._intrinsics.Proxy(S, membrane)
    membrane._init(S, C)

    // Setup metacode properties
    this._S = S
    this._C = C
    this._deploying = false
    this._deployed = false
    this._methodTable = null
    this._methodAPI = null

    // Attach code jig functions
    S.deploy = () => this.deploy()
    S.upgrade = T => this.upgrade()
    S.sync = () => this.sync()
    S.release = () => this.release()

    // Hijack the prototype chain to enable upgrades
    this._enableUpgrades()

    try {
      // Temporarily add the new code for dependencies, even though its not fully installed
      REPOSITORY.set(T, C)
      REPOSITORY.set(C, C)
      if (presetLocation) REPOSITORY.set(presetLocation, C)

      // Assign class properties on the sandbox, including presets and deps
      const props = _deepClone(Object.assign({}, T), Sandbox._intrinsics)
      Object.assign(SGlobal, props.deps)
      Object.assign(S, props)
      delete S.presets
      Object.assign(S, hasPresets(T, network) ? props.presets[network] : {})

      // TODO
      // If presetLocation exists, then we are deployed

      return C
    } catch (e) {
      REPOSITORY.delete(T)
      REPOSITORY.delete(C)
      REPOSITORY.delete(presetLocation)

      throw e
    }
  }

  deploy () {
    console.log('deploying', this.S.name)

    if (this._deploying || this._deployed) return

    this._deploying = true
    // Handle exceptions

    // BEGIN
    // Deploy all dependent code
    _deepVisit(this._S, x => {
      if (x instanceof Code) x.deploy()
      return !(x instanceof Code || x instanceof Jig || x instanceof Berry)
    })
    // END
  }

  upgrade () {
    // TODO
  }

  sync () {
    // TODO
  }

  release () {
    // TODO
  }

  _enableUpgrades () {
    const S = this._S

    class MethodTableHandler {
      set (target, prop, value) {
        return false
      }
    }

    this._methodTable = {}
    this._methodAPI = new Proxy(this._methodTable, new MethodTableHandler())

    // Move all properties from the prototype to the method table
    const methods = Object.getOwnPropertyNames(S.prototype)
    methods.forEach(name => {
      const desc = Object.getOwnPropertyDescriptor(S.prototype, name)
      Object.defineProperty(this._methodTable, name, desc)
      delete S.prototype[name]
    })

    // Hook up the method table in between the prototype and its parent
    const protoproto = Object.getPrototypeOf(S.prototype)
    Object.setPrototypeOf(this._methodTable, protoproto)
    Object.setPrototypeOf(S.prototype, this._methodAPI)

    // Freeze the prototype
    // TODO: Deep freeze method table properties too
    // freeze will make setPrototypeOf fail
    Object.freeze(S.prototype)

    this._methodTable.constructor = this._C
  }

  /**
   * Gets whether a value is a possible Code jig.
   */
  static [Symbol.hasInstance] (target) {
    return typeof target === 'function' && !!REPOSITORY.has(target)
  }

  /**
   * Gets a previous install
   */
  static _get (T) {
    const network = _activeRun().blockchain.network
    const presetLocation = preset('location', T, network)
    return REPOSITORY.get(T) || REPOSITORY.get(presetLocation)
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
 * Gets the parent class of T, or undefined if none exists
 */
function parent (T) {
  if (typeof T !== 'function') return
  const P = Object.getPrototypeOf(T)
  const SO = Sandbox._intrinsics.Object
  const HO = Sandbox._hostIntrinsics.Object
  const hasParent = P !== HO.getPrototypeOf(HO) && P !== SO.getPrototypeOf(SO)
  if (hasParent) return P
}

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
  checkReserved(T)
}

// ------------------------------------------------------------------------------------------------

/**
 * Check that the special deps property of code is valid
 */
function checkDeps (T, ParentCode) {
  if (!Object.getOwnPropertyNames(T).includes('deps')) return

  const deps = T.deps
  if (typeof deps === 'undefined') return
  if (!_isBasicObject(deps)) throw new InstallFailedError(T, 'deps must be an object')

  if (ParentCode) {
    const DepParent = T.deps[ParentCode.name]
    const DepParentCode = REPOSITORY.get(DepParent)
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
  if (typeof presets === 'undefined') return
  if (!_isBasicObject(presets)) throw new InstallFailedError(T, 'presets must be an object')

  for (const network of Object.keys(presets)) {
    const npresets = presets[network]
    if (typeof npresets === 'undefined') return
    if (!_isBasicObject(npresets)) throw new InstallFailedError(T, `${network} presets must be an object`)

    const anyJigPresets = !_isUndefined(npresets.location) || !_isUndefined(npresets.origin) || !_isUndefined(npresets.owner)
    const allJigPresets = !_isUndefined(npresets.location) && !_isUndefined(npresets.origin) && !_isUndefined(npresets.owner)
    if (anyJigPresets && !allJigPresets) {
      throw new InstallFailedError(T, `${network} presets are not fully defined`)
    }

    if (anyJigPresets) {
      _location(npresets.location, JIG | USER)
      _location(npresets.origin, JIG | USER)
      _owner(npresets.owner)
    }

    // Check for reserved words
    if ('deps' in npresets) throw new InstallFailedError(T, `${network} presets must not contain deps`)
    if ('presets' in npresets) throw new InstallFailedError(T, `${network} presets must not contain presets`)
    checkReserved(npresets)
  }
}

// ------------------------------------------------------------------------------------------------

function checkReserved (T) {
  const props = Object.getOwnPropertyNames(T)

  for (const reserved of RESERVED) {
    if (props.includes(reserved)) {
      throw new InstallFailedError(T, `Contains a reserved property: ${reserved}`)
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Code
