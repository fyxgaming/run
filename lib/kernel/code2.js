/**
 * code.js
 *
 * Functionality related to loading, deploying, and running arbitrary code.
 */

const { _text } = require('../util/misc')
const { USER, JIG, _location, _owner } = require('../util/resource')
const Log = require('../util/log')
const Sandbox = require('../util/sandbox')
const { InstallFailedError } = require('../util/errors')

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

const TAG = 'Code'

/**
 * Code repository, installer, and deployer
 *
 * This manager is specific to a single network. It may, however, be shared across multiple
 * Run instances on that network.
 */
class Code {
  constructor (network) {
    this._network = network
    this._localDescriptors = new Map() // T -> CodeDescriptor
    this._sandboxDescriptors = new Map() // S -> CodeDescriptor
    this._locationDescriptors = new Map() // Location -> CodeDescriptor
  }

  _deploy (T) {
    // const desc = this._install(T)
    // then deploy
  }

  _install (T) {
    // Parent must be installed first, because this class directly depends on it to exist.
    // Other dependencies can be lazily loaded into the sandbox.
    let parentDesc = null
    const P = parent(T)
    if (P) { parentDesc = this._install(P) }

    const prev = this._find(T)
    if (prev) return prev

    Log._info(TAG, 'Installing', _text(T))

    checkValid(T, this._network)

    const desc = new CodeDescriptor()

    try {
      desc._T = T
      desc._locals = new Set([T])
      desc._location = preset('location', T, this._network)
      this._localDescriptors.set(T, desc)

      this._sandbox(desc, parentDesc)

      // If there is a preset, mark the code as deployed
      if (desc._location) {
        this._locationDescriptors.set(desc._location, desc)
        desc._deployed = true
      }

      return desc
    } catch (e) {
      // Uninstall
      this._localDescriptors.delete(desc._T)
      this._sandboxDescriptors.delete(desc._S)
      this._locationDescriptors.delete(desc._location)

      throw e
    }
  }

  _installNative (T) {
    // TODO
  }

  _find (T) {
    const desc = this._localDescriptors.get(T) || this._sandboxDescriptors.get(T)
    if (desc) return desc

    // There may be multiple copies of a class when we are loading libraries containing
    // copies with the same presets. We treat these copies all the same.
    const locationPreset = preset('location', T, this._network)
    const desc2 = this._locationDescriptors.get(locationPreset)
    if (desc2) {
      desc2._locals.add(T)
      return desc2
    }
  }

  _sandbox (desc, parentDesc) {
    const T = desc._T
    const env = {}

    if (parentDesc) { env[parentDesc._T.name] = parentDesc._S }
    const [S, SGlobal] = Sandbox._instance._sandboxType(desc._T, env)
    desc._S = S

    // Install other dependencies
    // TODO
    SGlobal.x = 1

    // Apply presets to sandbox
    if (Object.keys(T).includes('presets') && T.presets[this._network]) {
      Object.assign(S, T.presets[this._network])
    }

    this._sandboxDescriptors.set(S, desc)
  }
}

// ------------------------------------------------------------------------------------------------
// CodeDescriptor
// ------------------------------------------------------------------------------------------------

/**
 * Holds all the various versions and metadata for a particular type
 */
class CodeDescriptor {
  constructor () {
    this._T = null
    this._S = null
    this._locals = new Set() // All versions of T
    this._location = null
    this._deploying = false
    this._deployed = false
    this._native = false
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function parent (T) {
  const P = Object.getPrototypeOf(T)
  const SObject = Sandbox._instance._intrinsics.Object
  const hasParent = P !== Object.getPrototypeOf(Object) && P !== SObject.getPrototypeOf(SObject)
  if (hasParent) return P
}

// ------------------------------------------------------------------------------------------------

function checkValid (T, network) {
  if (typeof T !== 'function') {
    throw new InstallFailedError(T, 'Only functions and classes may be deployed')
  }

  // Prototypal inheritance is not safe to use. The prototype object would need to be serialized.
  if (T.prototype && T.prototype.constructor !== T) {
    throw new InstallFailedError(T, 'Prototypal inheritance is not supported')
  }

  // Any built-in type will have native code. We should not deploy built-in types.
  if (T.toString().indexOf('[native code]') !== -1) {
    throw new InstallFailedError(T, 'This object contains native code')
  }

  checkPresets(T, network)
}

// ------------------------------------------------------------------------------------------------

function checkPresets (T, network) {
  if (!Object.keys(T).includes('presets')) return

  const presets = T.presets
  if (!presets) return
  if (typeof presets !== 'object') {
    throw new InstallFailedError(T, 'presets must be an object')
  }

  const npresets = presets[network]
  if (!npresets) return
  if (typeof npresets !== 'object') {
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

// ------------------------------------------------------------------------------------------------

function preset (name, T, network) {
  if (!Object.keys(T).includes('presets')) return
  const networkPresets = T.presets[network]
  if (!networkPresets) return
  return networkPresets[name]
}

// ------------------------------------------------------------------------------------------------

module.exports = Code
