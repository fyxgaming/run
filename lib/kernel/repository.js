/**
 * repository.js
 *
 * Functionality related to loading, deploying, and running arbitrary code.
 */

const { _text } = require('../util/misc')
const { USER, JIG, _location, _owner } = require('../util/resource')
const Log = require('../util/log')
const Sandbox = require('../util/sandbox')
const { InstallFailedError } = require('../util/errors')
const CodeJig = require('./code-jig')

// ------------------------------------------------------------------------------------------------
// Repository
// ------------------------------------------------------------------------------------------------

const TAG = 'Repository'

/**
 * Code repository, installer, and deployer
 *
 * This manager is specific to a single network. It may, however, be shared across multiple
 * Run instances on that network.
 */
class Repository {
  constructor (network) {
    this._network = network
    this._localDescriptors = new Map() // T -> CodeDescriptor
    this._sandboxDescriptors = new Map() // S -> CodeDescriptor
    this._locationDescriptors = new Map() // Location -> CodeDescriptor

    // TODO: Install code
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

    checkValid(T, parentDesc, this._network)

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

    // Do we want to do this for all code? No... just jigs
    desc._S = CodeJig._fromSandbox(S)

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

    // TODO: Remove
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
  if (typeof T !== 'function') return
  const P = Object.getPrototypeOf(T)
  const SObject = Sandbox._instance._intrinsics.Object
  const hasParent = P !== Object.getPrototypeOf(Object) && P !== SObject.getPrototypeOf(SObject)
  if (hasParent) return P
}

// ------------------------------------------------------------------------------------------------

function checkValid (T, Pdesc, network) {
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

  checkDeps(T, Pdesc)
  checkPresets(T, network)
}

// ------------------------------------------------------------------------------------------------

function checkDeps (T, Pdesc) {
  if (!Object.keys(T).includes('deps')) return

  const deps = T.deps
  if (typeof deps === 'undefined') return
  if (typeof deps !== 'object' || !deps) {
    throw new InstallFailedError(T, 'deps must be an object')
  }

  if (Pdesc) {
    const DepP = T.deps[Pdesc._S.name]
    if (DepP !== Pdesc._S && !Array.from(Pdesc._locals).some(x => x === DepP)) {
      throw new InstallFailedError(T, 'Parent dependency mismatch')
    }
  }
}

// ------------------------------------------------------------------------------------------------

function checkPresets (T, network) {
  if (!Object.keys(T).includes('presets')) return

  const presets = T.presets
  if (typeof presets === 'undefined') return
  if (typeof presets !== 'object' || !presets) {
    throw new InstallFailedError(T, 'presets must be an object')
  }

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

// ------------------------------------------------------------------------------------------------

function preset (name, T, network) {
  if (typeof T !== 'function') return
  if (!Object.keys(T).includes('presets')) return
  if (typeof T.presets !== 'object' || !T.presets) return
  const networkPresets = T.presets[network]
  if (typeof networkPresets !== 'object' || !networkPresets) return
  return networkPresets[name]
}

// ------------------------------------------------------------------------------------------------

module.exports = Repository
