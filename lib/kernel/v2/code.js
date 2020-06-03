/**
 * code.js
 *
 * A jig for code such as classes and functions
 */

const Sandbox = require('../../util/sandbox')
const JPU = require('./jpu')

// TODO
// instanceof Code, and remove _resourceType
// native types

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
    const deepClone = JPU._deepClone
    const { InstallFailedError } = JPU._errors
    const { _location, _owner, JIG, USER } = Resource

    return install(T)

    /**
     * Creates new Code proxy for T
     */
    function install (T) {
      const Parent = parent(T)
      const ParentCode = Parent && new Code(Parent)

      checkValid(T, ParentCode)

      const presetLocation = preset('location', T, network)
      const PrevCode = JPU._code.get(T) || JPU._code.get(presetLocation)
      if (PrevCode) return PrevCode

      Log._info(TAG, 'Installing', text(T))

      const env = {}
      if (ParentCode) { env[ParentCode.name] = ParentCode }
      const [S, SGlobal] = Sandbox._sandboxType(T, env)

      const NewCode = S

      try {
        // Temporarily add the new code for dependencies, even though its not fully installed
        JPU._code.set(T, NewCode)
        JPU._code.set(NewCode, NewCode)
        if (presetLocation) JPU._code.set(presetLocation, NewCode)

        // Install deps and props

        // Clone props

        // Add deps to sandbox

        // Add props on T

        // These deps are no different than other dependencies. Install them all. Then add to the env the deps
        // Clone and install
        // How does install work inside a jig? Outside, no problem. But inner classes, uh oh.
        // Calling a method can create a new code output. How?
        // It just calls deploy.

        /*
    const props = Object.assign({}, T)
    delete props.presets

    findAllJigs(props)
      .filter(x => typeof x === 'function')
      .forEach(x => this._install(x))

    const sandboxCode = x => typeof x === 'function' ? this._find(x)._S : x
    const SProps = _deepClone(props, FOR_SANDBOX, sandboxCode)

    Object.assign(S, SProps)
    Object.assign(SGlobal, SProps.deps)
    */

        if (hasPresets(T, network)) {
          const clonedPresets = deepClone(T.presets[network], Sandbox._intrinsics)
          Object.assign(S, clonedPresets)
        }

        // Proxy
      } catch (e) {
        JPU._code.delete(T)
        JPU._code.delete(NewCode)
        JPU._code.delete(presetLocation)
      }

      SGlobal.x = 1 // TODO: Remove

      return NewCode
    }

    // function _activate (network) {
    // Remove all props
    // Apply base props
    // Apply custom presets
    // }

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

    function hasPresets (T, network) {
      return Object.getOwnPropertyNames(T).includes('presets') && !!T.presets[network]
    }

    function preset (name, T, network) {
      if (typeof T !== 'function') return
      if (!Object.getOwnPropertyNames(T).includes('presets')) return
      const presets = T.presets
      if (typeof presets !== 'object' || !presets) return
      const npresets = presets[network]
      if (typeof npresets !== 'object' || !npresets) return
      return npresets[name]
    }
  }
}

// ------------------------------------------------------------------------------------------------

const SandboxedCode = Sandbox._sandboxType(Code, { JPU }, true)[0]

module.exports = SandboxedCode
