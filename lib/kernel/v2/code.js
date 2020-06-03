/**
 * code.js
 *
 * A jig for code such as classes and functions
 */

const Sandbox = require('../../util/sandbox')
const JPU = require('./jpu')

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

class Code {
  constructor (T) {
    const TAG = 'Code'
    const network = JPU._network
    const Log = JPU._Log
    const Resource = JPU._Resource
    const Sandbox = JPU._Sandbox
    const text = JPU._text
    const { InstallFailedError } = JPU._errors
    const { _location, _owner, JIG, USER } = Resource

    return install(T)

    /**
     * Creates new Code proxy for T
     */
    function install (T) {
      const PrevCode = JPU._code.get(T)
      if (PrevCode) return PrevCode

      const Parent = parent(T)
      const ParentCode = Parent && new Code(Parent)

      Log._info(TAG, 'Installing', text(T))

      check(T, ParentCode)

      return T
    }

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

    /**
     * Checks if T is valid to become a code jig
     */
    function check (T, ParentCode) {
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

    /**
     * Check that the special deps property of code is valid
     */
    function checkDeps (T, ParentCode) {
      if (!Object.getOwnPropertyNames(T).includes('deps')) return

      const deps = T.deps
      if (typeof deps === 'undefined') return
      if (typeof deps !== 'object' || !deps) {
        throw new InstallFailedError(T, 'deps must be an object')
      }

      if (ParentCode) {
        const DepParent = T.deps[ParentCode.name]
        const DepParentCode = JPU._code.get(DepParent)
        if (DepParentCode !== ParentCode) {
          throw new InstallFailedError(T, 'Parent dependency mismatch')
        }
      }
    }

    /**
     * Check that the special presets property of code is valid
     */
    function checkPresets (T) {
      if (!Object.getOwnPropertyNames(T).includes('presets')) return

      const presets = T.presets
      if (typeof presets === 'undefined') return
      if (typeof presets !== 'object' || !presets) {
        throw new InstallFailedError(T, 'presets must be an object')
      }

      for (const network of Object.keys(presets)) {
        const npresets = presets[network]
        if (typeof npresets === 'undefined') return
        if (typeof npresets !== 'object' || !npresets) {
          throw new InstallFailedError(T, `${network} presets must be an object`)
        }

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
  }
}

// ------------------------------------------------------------------------------------------------

const SandboxedCode = Sandbox._sandboxType(Code, { JPU }, true)[0]

module.exports = SandboxedCode
