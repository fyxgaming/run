/**
 * code.js
 *
 * Functionality related to loading, deploying, and running arbitrary code.
 *
 * Notes
 *   - T means any type, meaning a class or function
 *   - S means specifically a sandboxed typed
 */

const { Jig, JigControl, _JigDeps } = require('./jig')
const { Berry, _BerryDeps } = require('./berry')
const Sandbox = require('../util/sandbox')
const {
  _networkSuffix,
  _deployable,
  _resourceType,
  _activeRun,
  _text,
  _checkOwner
} = require('../util/misc')
const { _owner } = require('../util/props')
const Log = require('../util/log')
const ResourceJSON = require('../util/json')

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
    this._localDescriptors = new Map() // T -> CodeDescriptor
    this._sandboxDescriptors = new Map() // S -> CodeDescriptor
    this._locationDescriptors = new Map() // Location -> CodeDescriptor
  }

  /**
   * Installs and if necessary deploys the given code
   * @param {function} T Function or class to deploy
   * @param {?object} options Optional config
   * @param {?boolean} options._dontDeploy Whether to just install
   * @returns {function} Sandboxed code
   */
  deploy (T, options = {}) {
    // Get the descriptor for T, to understand what it is and read its properties
    const desc = this._descriptor(T)

    // If the code does not need to be deployed, early out
    if (desc._deploying || desc._deployed || desc._native) return desc._S

    Log._info(TAG, 'Deploy', _text(T))
    desc._deploy(options)

    return desc._S
  }

  /**
   * Installs a "native" type that won't be deployed.
   *
   * When using types that depend on native types, the native types must already be installed.
   * Native types do not have the same security at deployed types. Their behavior can be
   * hot-swapped at runtime with different code, and their only identifying feature is their
   * name. It is strongly recommended that you know what you are doing before using native types.
   *
   * Run ships with two native types: Jig and Berry.
   *
   * @param {function} T Native type
   */
  installNative (T) {
    this._checkValid(T)
    const desc = new CodeDescriptor()
    desc._T = T
    desc._native = true
    this._localDescriptors.set(T, desc)
    const S = this._sandbox(T)
    desc._S = S
    this._sandboxDescriptors.set(S)
    this._locationDescriptors.set(`native://${T.name}`)
    return desc
  }

  installLocal (T) {
    this._checkValid(T)
    const desc = new CodeDescriptor()
    desc._T = T
    this._localDescriptors.set(T, desc)
    const S = this._sandbox(T)
    desc._S = S
    this._sandboxDescriptors.set(S)
    return desc
  }

  /**
   * Get a code descriptor for T that can be used to deploy and read properties.
   * @param {function} T Local type or sandbox
   * @returns {CodeDescriptor} Descriptor object
   */
  _descriptor (T) {
    // Check if we've already created a descriptor. If so, use it directly.
    const exact = this._localDescriptors.get(T) || this._sandboxDescriptors.get(T)
    if (exact) return exact

    // Check if this type has a location preset which we've already installed
    const locationPreset = CodeDescriptor._preset('location', T, this._network)
    const equivalent = code._locationDescriptors.get(locationPreset)
    if (equivalent) {
      equivalent._addLocalCopy(T)
      return equivalent
    }

    return this.installLocal(T)
  }

  _sandbox (desc) {
    this._sandboxDescriptors.set(desc._S, desc)
  }

  _checkValid (T) {
    // Check that this code can be deployed
    if (!_deployable(T)) throw new Error(`${_text(T)} not deployable`)

    // Check the properties on T are allowed
    this._checkProps()
  }
}

// ------------------------------------------------------------------------------------------------
// CodeDescriptor
// ------------------------------------------------------------------------------------------------

/**
 * Manages the sandbox and deployment status of a particular type
 */
class CodeDescriptor {
  constructor () {
    this._T = null
    this._S = null
    this._locals = [] // All versions of T
    this._deploying = false
    this._deployed = false
    this._native = false
  }

  _addLocalCopy (T) {
    if (this._locals.includes(T)) return

    // Check this copy shares the same source code. It might be good to check for same props too
    // someday, but as a quick safety check not intended to be bulletproof, this is OK for now.
    if (T.toString() !== this._T.toString()) {
      throw new Error(`Detected different versions of ${_text(T)}`)
    }

    return this
  }

  _deploy (options = {}) {
    // Get the active Run instance, and make sure we can be deploy to its network
    const run = _activeRun()
    if (run.blockchain.network !== this._code._network) {
      const hint = `Hint: Activate Run instance for ${this._network}`
      throw new Error(`Cannot deploy ${_text(T)} on the current network\n\n${hint}`)
    }
  }
}

// ------------------------------------------------------------------------------------------------

/*

function deployed (T) {
  if (!Object.keys(T).includes('origin')) return false
  if (!Object.keys(T).includes('location')) return false
  if (T.origin[0] === '_') return false
  if (T.location[0] === '_') return false
  return true
}

function allDeps(T) {
  const deps = classProps.includes('deps') ? Object.assign({}, T.deps) : {}

  const Parent = Object.getPrototypeOf(T)

      // make sure the parent does not conflict with whats set in deps
      // realdeps is T.deps with its parent if not there
      const SandboxObject = Sandbox._intrinsics.Object
      if (Parent !== Object.getPrototypeOf(Object) &&
        Parent !== SandboxObject.getPrototypeOf(SandboxObject)) {
        env[Parent.name] = this.deploy(Parent, options)
        if (realdeps[Parent.name]) {
          const currentSandbox = this._getSandboxed(realdeps[Parent.name])
          if (currentSandbox !== env[Parent.name]) {
            throw new Error(`unexpected parent dependency ${Parent.name}`)
          }
        }
        // Check names, because if we are loading a class from a different project, with its own Run,
        // it should still work. We should reserve Jig.
        if (!(Parent.name in realdeps) &&
            Parent !== this._installs.get(Jig) &&
            Parent !== Jig &&
            Parent.name !== 'Jig' &&
            Parent !== this._installs.get(Berry) &&
            Parent !== Berry &&
            Parent.name !== 'Berry') {
          realdeps[Parent.name] = Parent
        }
      }

// TODO: checkProps, presets are strings
// TODO: What is T and S, what props are on each?
// T: presets, deps
// S: no presets, location fixed, deps
// What if location is set on T to something other than a string?
// It means nothing. It could be a warning. It doesn't matter.
// This all should go in checkProps.
// Deps should not be treated specially? No, it should. But it can be serialized like others.

const stringProps = [
  'origin', 'location', 'owner',
  'originMainnet', 'locationMainnet', 'ownerMainnet',
  'originTestnet', 'locationTestnet', 'ownerTestnet',
  'originStn', 'locationStn', 'ownerStn',
  'originMocknet', 'locationMocknet', 'ownerMocknet']

/*

  // Install loads code into a sandbox and makes it available to use
  // It does not deploy the code. It does however check that the code
  // is deployable. The main purpose is to install berry protocols for
  // use on mainnet and testnet without deploying the protocol to the chain.
  _installBerryProtocol (T) {
    // Make sure the presets are there
    return this.deploy(T, { _dontDeploy: true })
  }

  // TODO: This should include partial installs

    // ------------------------------------------------------------------------
    // Deploy it
    // ------------------------------------------------------------------------

    // Start a transaction, because we're going to deploy this and all its dependencies together
    run.transaction.begin()
    try {
      // Create env, the globals in the sandbox. This just needs to be the parent at creation.
      const env = {}

      const allDeps = desc.completeDeps()

      if (desc.Parent)
        const SParent = this.deploy(desc.Parent, options)

        env[desc.Parent.name] = SParent
      }

      const alldeps = allDeps(T)

      // Create realdeps
      const realdeps = classProps.includes('deps') ? Object.assign({}, T.deps) : {}

      // ------------------------------------------------------------------------
      // Deploy its parent
      // ------------------------------------------------------------------------

      // make sure the parent does not conflict with whats set in deps
      // realdeps is T.deps with its parent if not there
      const Parent = Object.getPrototypeOf(T)
      const SandboxObject = Sandbox._intrinsics.Object
      if (Parent !== Object.getPrototypeOf(Object) &&
        Parent !== SandboxObject.getPrototypeOf(SandboxObject)) {
        env[Parent.name] = this.deploy(Parent, options)
        if (realdeps[Parent.name]) {
          const currentSandbox = this._getSandboxed(realdeps[Parent.name])
          if (currentSandbox !== env[Parent.name]) {
            throw new Error(`unexpected parent dependency ${Parent.name}`)
          }
        }
        // Check names, because if we are loading a class from a different project, with its own Run,
        // it should still work. We should reserve Jig.
        if (!(Parent.name in realdeps) &&
            Parent !== this._installs.get(Jig) &&
            Parent !== Jig &&
            Parent.name !== 'Jig' &&
            Parent !== this._installs.get(Berry) &&
            Parent !== Berry &&
            Parent.name !== 'Berry') {
          realdeps[Parent.name] = Parent
        }
      }

      // ----------------------------------------------------------------------
      // Install it
      // ----------------------------------------------------------------------

      // If the parent installed the child, return immediately and don't install anything
      const SPrev2 = this._installs.get(T)
      if (SPrev2 && Object.keys(SPrev2).includes(`origin${net}`) &&
        Object.keys(SPrev2).includes(`location${net}`)) return SPrev2

      const [S, sandboxGlobal] = this._sandboxType(T, env)
      this._installs.set(T, S)
      this._installs.set(S, S)

      if (sandboxGlobal) this._defineCaller(sandboxGlobal)

      // ----------------------------------------------------------------------
      // Detect references
      // ----------------------------------------------------------------------

      const resources = []
      const resourceSaver = resource => { resources.push(resource); return resources.length - 1 }
      const resourceLoader = ref => this._getSandboxed(resources[ref]) || resources[ref]

      const opts = {
        _replacer: ResourceJSON._replace._cache(
          ResourceJSON._replace._multiple(
            ResourceJSON._replace._resources(resourceSaver),
            ResourceJSON._replace._arbitraryObjects())),

        _reviver: ResourceJSON._revive._multiple(
          ResourceJSON._revive._resources(resourceLoader),
          ResourceJSON._revive._arbitraryObjects())
      }

      const staticProps = Object.assign({}, T)

      let serialized = null
      try {
        serialized = ResourceJSON._serialize(staticProps, opts)
      } catch (e) {
        throw new Error(`A static property of ${T.name} is not supported\n\n${e}`)
      }

      // ----------------------------------------------------------------------
      // Kickoff deploy
      // ----------------------------------------------------------------------

      const net = _networkSuffix(this._network)
      const classProps = Object.keys(T)

      // If location is already set for the network, assume correct and don't reupload
      const hasPresets = classProps.includes(`origin${net}`) || classProps.includes(`location${net}`)
      if (hasPresets) {
        if (classProps.includes(`origin${net}`)) {
          S[`origin${net}`] = S.origin = T.origin = T[`origin${net}`]
        }
        S[`location${net}`] = S.location = T.location = T[`location${net}`] || T.origin
        S[`owner${net}`] = S.owner = T.owner = T[`owner${net}`]

        this._installs.set(S[`location${net}`], S)
      } else if (options._dontDeploy) {
        // Berry protocols
        const location = '!Not deployed'
        S[`origin${net}`] = S.origin = T.origin = T[`origin${net}`] = location
        S[`location${net}`] = S.location = T.location = T[`location${net}`] || T.origin
        S[`owner${net}`] = S.owner = T.owner = T[`owner${net}`] = null
      } else {
        // Location is not set. use a temporary location and deploy

        const success = (location) => {
          // if different network, primary origin and location will be set by that run instance
          if (run.blockchain.network === this._network) {
            T.origin = T.location = S.origin = S.location = location
            T.owner = S.owner = T[`owner${net}`]
          }
          S[`origin${net}`] = S[`location${net}`] = location
          T[`origin${net}`] = T[`location${net}`] = location
          this._installs.set(location, S)
        }
        const error = () => {
          if (run.blockchain.network === this._network) {
            delete T.origin; delete T.location
            delete S.origin; delete S.location
            delete T.owner; delete S.owner
          }
          delete T[`origin${net}`]; delete T[`location${net}`]
          delete S[`origin${net}`]; delete S[`location${net}`]
          delete T[`owner${net}`]; delete S[`owner${net}`]
        }

        const actionProps = Object.assign({}, staticProps)
        stringProps.forEach(name => { delete actionProps[name] })
        delete actionProps.deps

        let tempLocation = null
        try {
          this._pending.add(T)
          tempLocation = run.transaction._storeCode(T, S, realdeps, actionProps, success, error)
        } finally { this._pending.delete(T) }

        T[`origin${net}`] = T[`location${net}`] = T.origin = T.location = tempLocation
        S[`origin${net}`] = S[`location${net}`] = S.origin = S.location = tempLocation
        T[`owner${net}`] = S[`owner${net}`] = S.owner = T.owner
      }

      // ----------------------------------------------------------------------
      // Deploy references
      // ----------------------------------------------------------------------

      // Deploy each deployable
      resources.filter(resource => _resourceType(resource) === 'code')
        .forEach(T => this.deploy(T, options))

      // ----------------------------------------------------------------------
      // Assign static props
      // ----------------------------------------------------------------------

      // Create a safe clone of the static properties for the sandbox
      try {
        const safeStaticProps = ResourceJSON._deserialize(serialized, opts)
        Object.assign(S, safeStaticProps)
      } catch (e) {
        throw new Error(`A static property of ${T.name} cannot be sandboxed\n\n${e}`)
      }

      // Set dependencies now as sandbox globals. We've delayed this to enable circular deps.
      if (sandboxGlobal) {
        Object.entries(realdeps).forEach(([name, dep]) => {
          if (dep === Parent || dep === env[Parent.name]) return
          sandboxGlobal[name] = this.deploy(dep, options)
        })
      }

      // ----------------------------------------------------------------------
      // Return the undeployed sandbox
      // ----------------------------------------------------------------------

      return S
    } finally {
      run.transaction.end()
    }
  }

  async _installFromTx (def, location, tx, kernel, bsvNetwork, _partiallyInstalledCode = new Map()) {
    // if we have this location already, return it
    if (this._installs.has(location)) return this._installs.get(location)
    if (_partiallyInstalledCode.has(location)) return _partiallyInstalledCode.get(location)

    Log._info(TAG, 'Installing', _text(def.text), 'from', location)

    // parse the location
    const txid = location.slice(0, 64)
    const vout = parseInt(location.slice(66))

    const env = { }

    // Create a promise so that other dependencies can refer to this load
    // instead of loading themselves
    let partialInstallResolve = null; let partialInstallReject = null
    const partialInstall = new Promise((resolve, reject) => {
      partialInstallResolve = resolve
      partialInstallReject = reject
    })
    _partiallyInstalledCode.set(location, partialInstall)

    try {
      const ParentRegex = /^class \w* extends (\w*)[\s]*{/
      let parentName = null
      if (ParentRegex.test(def.text)) {
        parentName = def.text.match(ParentRegex)[1]
        let parentLocation = (def.deps || {})[parentName]
        if (parentName === 'Jig' && typeof parentLocation === 'undefined') {
          env.Jig = this.Jig
        } else if (parentName === 'Berry' && typeof parentLocation === 'undefined') {
          env.Berry = this.Berry
        } else {
          if (parentLocation.startsWith('_')) { parentLocation = tx.hash + parentLocation }
          env[parentName] = await kernel._transaction.load(parentLocation, { _partiallyInstalledCode, _knownTx: tx })
        }
      }

      const [S, sandboxGlobal] = Sandbox._evaluate(def.text, env)
      S.origin = S.location = location
      const net = _networkSuffix(this._network)
      S[`origin${net}`] = S[`location${net}`] = location
      partialInstallResolve(S)

      if (sandboxGlobal) {
        const promises = Object.entries(def.deps || {}).map(([name, dep]) => {
          if (name === parentName) return
          const location = dep.startsWith('_') ? tx.hash + dep : dep
          return kernel._transaction.load(location, { _partiallyInstalledCode, _knownTx: tx }).then(T => {
            sandboxGlobal[name] = T
          })
        })
        await Promise.all(promises)
      }

      // Set all of the dependencies to their sandboxed versions
      if (def.deps) {
        S.deps = {}
        Object.keys(def.deps).forEach(name => {
          S.deps[name] = (sandboxGlobal && sandboxGlobal[name]) || env[name]
        })
      }

      if (sandboxGlobal) this._defineCaller(sandboxGlobal)

      // Hydrate the creator
      // First pre-load the resources in the class props
      const resources = new Map()
      const refs = ResourceJSON._findAllResourceRefsInResourceJSON(def.owner)
      const loadResource = async ref => {
        const location = (ref[1] === 'i' || ref[1] === 'o') ? txid + ref : ref
        const resource = await kernel._transaction.load(location, { _partiallyInstalledCode, _knownTx: tx })
        resources.set(ref, resource)
      }
      const promises = refs.map(ref => loadResource(ref))
      await Promise.all(promises)
      // Deserialize the prop JSON
      const creator = ResourceJSON._deserialize(def.owner, {
        _reviver: ResourceJSON._revive._multiple(
          ResourceJSON._revive._resources(ref => resources.get(ref)),
          ResourceJSON._revive._arbitraryObjects())
      })
      // Assign the owner
      S.owner = creator
      S[`owner${net}`] = creator
      // Make sure the owner matches the output address
      // TODO: Move this to transaction
      const hex1 = tx.outputs[vout].script.toHex()
      const hex2 = Buffer.from(_owner(creator, bsvNetwork).script()).toString('hex')
      if (hex1 !== hex2) throw new Error(`bad def owner: ${location}`)

      // Hydrate class prop resources and apply them to the sandbox
      if (def.props) {
        // First pre-load the resources in the class props
        const resources = new Map()
        const refs = ResourceJSON._findAllResourceRefsInResourceJSON(def.props)
        const loadResource = async ref => {
          const location = (ref[1] === 'i' || ref[1] === 'o') ? txid + ref : ref
          const resource = await kernel._transaction.load(location, { _partiallyInstalledCode, _knownTx: tx })
          resources.set(ref, resource)
        }
        const promises = refs.map(ref => loadResource(ref))
        await Promise.all(promises)

        // Deserialize the prop JSON
        const classProps = ResourceJSON._deserialize(def.props, {
          _reviver: ResourceJSON._revive._multiple(
            ResourceJSON._revive._resources(ref => resources.get(ref)),
            ResourceJSON._revive._arbitraryObjects())
        })

        // Assign the class props to the sandbox
        Object.assign(S, classProps)
      }

      _partiallyInstalledCode.delete(location)

      // Safety check. We should be able to remove over time.
      if (this._installs.has(location)) {
        const hint = 'This is an internal Run bug. Please report it to the library developers.'
        throw new Error(`Code installed twice for ${location}\n\n${hint}.`)
      }

      this._installs.set(location, S)
      this._installs.set(S, S)

      return S
    } catch (e) {
      partialInstallReject(e)
      throw e
    }
  }

  _extractProps (T) {
    // Determine which properties to extract
    const skipProps = ['deps', ...stringProps]
    const classProps = Object.keys(T)
    const propNames = classProps.filter(key => !skipProps.includes(key))

    // Create an object with just these properties
    const props = {}
    propNames.forEach(name => { props[name] = T[name] })

    // Check that these properties are serializable and extract resources
    const refs = []
    try {
      ResourceJSON._serialize(props, {
        _replacer: ResourceJSON._replace._cache(
          ResourceJSON._replace._multiple(
            ResourceJSON._replace._resources(ref => { refs.push(ref); return {} }),
            ResourceJSON._replace._arbitraryObjects()))
      })
    } catch (e) {
      throw new Error(`A static property of ${T.name} is not supported\n\n${e}`)
    }

    return { props, refs }
  }

  _installJig () {
    this.Jig = this._sandboxType(Jig, _JigDeps)[0]
    this._installs.set(Jig, this.Jig)
    this._installs.set(this.Jig, this.Jig)
  }

  _installBerry () {
    this.Berry = this._sandboxType(Berry, _BerryDeps)[0]
    this._installs.set(Berry, this.Berry)
    this._installs.set(this.Berry, this.Berry)
  }

  _sandboxType (T, env) {
    const prev = this._installs.get(T)
    if (prev) return [prev, null]
    return Sandbox._sandboxType(T, env)
  }

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

  activate (network) {
    const net = _networkSuffix(network)

    this._installs.forEach((v, k) => {
      if (typeof k === 'string') return // location
      if (typeof k[`origin${net}`] !== 'undefined') {
        k.origin = k[`origin${net}`]
        v.origin = k[`origin${net}`]
      } else { delete k.origin; delete v.origin }
      if (typeof k[`location${net}`] !== 'undefined') {
        k.location = k[`location${net}`]
        v.location = k[`location${net}`]
      } else { delete k.location; delete v.location }
      if (typeof k[`owner${net}`] !== 'undefined') {
        k.owner = k[`owner${net}`]
        v.owner = k[`owner${net}`]
      } else { delete k.owner; delete v.owner }
    })
  }
}

// ------------------------------------------------------------------------------------------------
*/

module.exports = Code
