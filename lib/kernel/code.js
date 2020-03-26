/**
 * code.js
 *
 * Functionality related to loading, deploying, and running arbitrary code.
 */

const { _name } = require('../util')
const DeterministicRealm = require('sandbox')

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * Returns whether a given function or class can be deployed on-chain.
 *
 * We check that the argument is a function, and also that it is not a built-in function to
 * JavaScript, because those do not have source code available and rely on VM internals.
 */
function deployable (T) {
  return typeof T === 'function' && T.toString().indexOf('[native code]') === -1
}

function preset (T, name, network) {
  const suffix = network === 'stn' ? 'Stn'
    : network.charAt(0).toUpperCase() + network.slice(1).toLowerCase() + 'net'
  const presetName = `${name}${suffix}`
  return Object.keys(T).includes(presetName) ? T[presetName] : undefined
}

function parent (T) {
  return true
  // const Parent = Object.getPrototypeOf(T)

  // const SandboxObject = this.evaluator.intrinsics.default.Object
  // if (parentClass !== Object.getPrototypeOf(Object) &&
  // parentClass !== SandboxObject.getPrototypeOf(SandboxObject)) {
}

class Repository {
  constructor (network) {
    this._network = network
    this._installs = new Map() // Func|SandboxFunc|Location -> SandboxFunc
  }

  _get (T) {
    const S = this._installs.get(T)
    if (S) return S

    const locationPreset = preset(T, 'location', this._network)
    if (locationPreset) {
      const S = this._installs.get(locationPreset)
      if (S) return S
    }
  }
}

function checkProps (T) {
  // check the class properties. classProps are props specifically on this code, not a parent
  // const isBasicObject = (o) => Object.getPrototypeOf(Object.getPrototypeOf(o)) === null
  // if (classProps.includes('deps') && !isBasicObject(type.deps)) throw new Error('deps must be an object')
  // const notAString = s => classProps.includes(s) && typeof type[s] !== 'string'
  // stringProps.forEach(s => { if (notAString(s)) throw new Error(`${s} must be a string: ${type[s]}`) })
}

class Bundle {
  constructor (network, logger, code) {
    this._network = network
    this._logger = logger
    this._code = code
    this._repository = new Repository(network)
  }

  _add (T) {
    this._logger.info(`Deploying ${_name(T)}`)

    if (!deployable(T)) throw new Error(`${_name(T)} not deployable`)

    // Check if we have already deployed this type, either in this bundle, or in the main repo
    const S = this._repository._get(T) || this._code._repository(this._network)._get(T)
    if (S) return S

    checkProps(T)

    // const compartment = new compartment()

    const Parent = parent(T)
    if (Parent) {
      console.log('has parent')
    // compartment.global[Parent.name] = this._add(Parent)
    }

    // if (!isBaseClass(Parent)) {

    // }

    // Go through parent, then dependencies, and sandbox

    // create env, the globals in the sandbox. this will just be the parent.
    // const env = {}

    /*
      // make sure the parent does not conflict with whats set in deps
      // realdeps is type.deps with its parent if not there
      const realdeps = classProps.includes('deps') ? Object.assign({}, type.deps) : {}
      const SandboxObject = this.evaluator.intrinsics.default.Object
      if (parentClass !== Object.getPrototypeOf(Object) &&
        parentClass !== SandboxObject.getPrototypeOf(SandboxObject)) {
        env[parentClass.name] = this.deploy(parentClass, options)
        if (realdeps[parentClass.name]) {
          const currentSandbox = this.getInstalled(realdeps[parentClass.name])
          if (currentSandbox !== env[parentClass.name]) {
            throw new Error(`unexpected parent dependency ${parentClass.name}`)
          }
        }
        if (!(parentClass.name in realdeps) &&
          parentClass !== this.installs.get(Jig) &&
          parentClass !== Jig &&
          parentClass !== this.installs.get(Berry) &&
          parentClass !== Berry) {
          realdeps[parentClass.name] = parentClass
        }
      }
      */
  }
}

/**
 * Manages all code known by all Run instances.
 */
class Code {
  constructor () {
    this._repositories = {} // { <network>: Repository }

    console.log(DeterministicRealm)
  }

  _deploy (T, network, logger, transaction) {
    const bundle = new Bundle(network, logger, this)

    bundle._add(T)

    transaction._begin()
    try {
      transaction._deploy(bundle)
    } finally {
      transaction._end()
    }
  }

  _repository (network) {
    const r = this._repositories[network] || new Repository(network)
    this._repositories[network] = r
    return r
  }

  /*

    // if this type was already deployed on this network, don't deploy again

      // TODO: Add test, and make sure this works

    run.transaction.begin()
    try {
      // create env, the globals in the sandbox. this will just be the parent.
      const env = {}

      // make sure the parent does not conflict with whats set in deps
      // realdeps is type.deps with its parent if not there
      const parentClass = Object.getPrototypeOf(type)
      const realdeps = classProps.includes('deps') ? Object.assign({}, type.deps) : {}
      const SandboxObject = this.evaluator.intrinsics.default.Object
      if (parentClass !== Object.getPrototypeOf(Object) &&
        parentClass !== SandboxObject.getPrototypeOf(SandboxObject)) {
        env[parentClass.name] = this.deploy(parentClass, options)
        if (realdeps[parentClass.name]) {
          const currentSandbox = this.getInstalled(realdeps[parentClass.name])
          if (currentSandbox !== env[parentClass.name]) {
            throw new Error(`unexpected parent dependency ${parentClass.name}`)
          }
        }
        if (!(parentClass.name in realdeps) &&
          parentClass !== this.installs.get(Jig) &&
          parentClass !== Jig &&
          parentClass !== this.installs.get(Berry) &&
          parentClass !== Berry) {
          realdeps[parentClass.name] = parentClass
        }
      }

      // If the parent the child, return its location and don't install anything
      const pre2 = this.installs.get(type)
      if (pre2 && Object.keys(pre2).includes(`origin${net}`) &&
        Object.keys(pre2).includes(`location${net}`)) return pre2

      const { result: sandbox, globals: sandboxGlobal } = this.sandboxType(type, env)
      this.installs.set(type, sandbox)
      this.installs.set(sandbox, sandbox)

      // Deploy any code found in the static properties
      const xray = new Xray()
        .allowTokens()
        .allowDeployables()
        .useIntrinsics(this.intrinsics)
        .useCodeCloner(x => this.getInstalled(x))

      const staticProps = Object.assign({}, type)
      try {
        xray.scan(staticProps)
      } catch (e) {
        throw new Error(`A static property of ${type.name} is not supported\n\n${e}`)
      }

      // If location is already set for the network, assume correct and don't reupload
      const hasPresets = classProps.includes(`origin${net}`) || classProps.includes(`location${net}`)
      if (hasPresets) {
        if (classProps.includes(`origin${net}`)) {
          sandbox[`origin${net}`] = sandbox.origin = type.origin = type[`origin${net}`]
        }
        sandbox[`location${net}`] = sandbox.location = type.location = type[`location${net}`] || type.origin
        sandbox[`owner${net}`] = sandbox.owner = type.owner = type[`owner${net}`]

        this.installs.set(sandbox[`location${net}`], sandbox)
      } else if (options.dontDeploy) {
        // Berry protocols
        const location = '!Not deployed'
        sandbox[`origin${net}`] = sandbox.origin = type.origin = type[`origin${net}`] = location
        sandbox[`location${net}`] = sandbox.location = type.location = type[`location${net}`] || type.origin
        sandbox[`owner${net}`] = sandbox.owner = type.owner = type[`owner${net}`] = null
      } else {
        // Location is not set. use a temporary location and deploy

        const currentNetwork = run.blockchain.network
        const success = (location) => {
          // if different network, primary origin and location will be set by that run instance
          if (run.blockchain.network === currentNetwork) {
            type.origin = type.location = sandbox.origin = sandbox.location = location
            type.owner = sandbox.owner = type[`owner${net}`]
          }
          sandbox[`origin${net}`] = sandbox[`location${net}`] = location
          type[`origin${net}`] = type[`location${net}`] = location
          this.installs.set(location, sandbox)
        }
        const error = () => {
          if (run.blockchain.network === currentNetwork) {
            delete type.origin; delete type.location
            delete sandbox.origin; delete sandbox.location
            delete type.owner; delete sandbox.owner
          }
          delete type[`origin${net}`]; delete type[`location${net}`]
          delete sandbox[`origin${net}`]; delete sandbox[`location${net}`]
          delete type[`owner${net}`]; delete sandbox[`owner${net}`]
        }

        const actionProps = Object.assign({}, staticProps)
        stringProps.forEach(name => { delete actionProps[name] })
        delete actionProps.deps

        let tempLocation = null
        try {
          this.pending.add(type)
          tempLocation = run.transaction.storeCode(type, sandbox, realdeps,
            actionProps, success, error)
        } finally { this.pending.delete(type) }

        type[`origin${net}`] = type[`location${net}`] = tempLocation
        sandbox[`origin${net}`] = sandbox[`location${net}`] = tempLocation
        type[`owner${net}`] = sandbox[`owner${net}`] = type.owner
      }

      // Deploy each deployable
      xray.deployables.forEach(x => this.deploy(x, options))

      // Create a safe clone of the static properties for the sandbox
      try {
        const safeStaticProps = xray.clone(staticProps)
        Object.assign(sandbox, safeStaticProps)
      } catch (e) {
        throw new Error(`A static property of ${type.name} cannot be sandboxed\n\n${e}`)
      }

      // Set dependencies now as sandbox globals. We've delayed this to enable circular deps.
      if (sandboxGlobal) {
        Object.entries(realdeps).forEach(([name, dep]) => {
          if (dep === parentClass || dep === env[parentClass.name]) return
          sandboxGlobal[name] = this.deploy(dep, options)
        })
      }

      return sandbox
    } finally {
      run.transaction.end()
    }
    */
}

module.exports = Code
