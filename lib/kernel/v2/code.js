/**
 * code.js
 *
 * A jig for code such as classes and functions
 */

const JPU = require('./jpu')
const Membrane = require('./membrane')
const Log = require('../../util/log')
const Sandbox = require('../../util/sandbox')
const { _activeRun, _text, _Type } = require('../../util/misc')
const { _deepClone } = require('../../util/deep')
const { InstallFailedError } = require('../../util/errors')
const { _location, _owner, JIG, USER } = require('../../util/resource')
const { _isBasicObject } = _Type

// TODO
// instanceof Code, and remove _resourceType
// native types
// not all code functions are the same. anonymous shouldn't call with this.

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

const TAG = 'Code'

class Code {
  constructor (T) {
    const network = _activeRun().blockchain.network

    const Parent = parent(T)
    const ParentCode = Parent && new Code(Parent)

    checkValid(T, ParentCode)

    const presetLocation = preset('location', T, network)
    const PrevCode = JPU._code.get(T) || JPU._code.get(presetLocation)
    if (PrevCode) return PrevCode

    Log._info(TAG, 'Installing', _text(T))

    const env = {}
    if (ParentCode) { env[ParentCode.name] = ParentCode }
    const [S, SGlobal] = Sandbox._sandboxType(T, env)

    const membrane = new Membrane()
    const NewCode = new Sandbox._intrinsics.Proxy(S, membrane)
    membrane._init(S, NewCode)

    try {
      // Temporarily add the new code for dependencies, even though its not fully installed
      JPU._code.set(T, NewCode)
      JPU._code.set(NewCode, NewCode)
      if (presetLocation) JPU._code.set(presetLocation, NewCode)

      // Assign class properties on the sandbox, including presets and deps
      const props = _deepClone(Object.assign({}, T), Sandbox._intrinsics)
      Object.assign(SGlobal, props.deps)
      Object.assign(S, props)
      delete S.deps
      delete S.presets
      Object.assign(S, hasPresets(T, network) ? props.presets[network] : {})

      return NewCode
    } catch (e) {
      JPU._code.delete(T)
      JPU._code.delete(NewCode)
      JPU._code.delete(presetLocation)

      throw e
    }

    // function _activate (network) {
    // Remove all props
    // Apply base props
    // Apply custom presets
    // }

    /*
    function deploy () {
      console.log('deploying', this._target.name)

      const props = Object.assign({}, this._sandbox)

      // Deploy all dependent code
      _deepVisit(props, x => {
        if (x instanceof Code) new Code(x).deploy()
        return !(x instanceof Code || x instanceof Jig || x instanceof Berry)
      })
    }
    */
  }

  /**
   * Gets whether a value is a possible Code jig.
   */
  static [Symbol.hasInstance] (target) {
    return typeof target === 'function' && target.toString().indexOf('[native code]') === -1
  }
}

// toString() not defined
// reserved functions

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
    const DepParentCode = JPU._code.get(DepParent)
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

    const anyJigPresets = npresets.location || npresets.origin || npresets.owner
    const allJigPresets = npresets.location && npresets.origin && npresets.owner
    if (anyJigPresets && !allJigPresets) {
      throw new InstallFailedError(T, `${network} presets are not fully defined`)
    }

    if (anyJigPresets) {
      _location(npresets.location, JIG | USER)
      _location(npresets.origin, JIG | USER)
      _owner(npresets.owner)
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Code
