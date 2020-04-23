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
const { _networkSuffix, _deployable, _resourceType, _lockify, _activeRun } = require('../util/misc')
const Log = require('../util/log')
const ResourceJSON = require('../util/json')

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

const TAG = 'Code'

const stringProps = [
  'origin', 'location', 'owner',
  'originMainnet', 'locationMainnet', 'ownerMainnet',
  'originTestnet', 'locationTestnet', 'ownerTestnet',
  'originStn', 'locationStn', 'ownerStn',
  'originMocknet', 'locationMocknet', 'ownerMocknet']

/**
 * Code repository, installer, and deployer
 */
class Code {
  constructor (kernel) {
    this._kernel = kernel
    this.installs = new Map() // T | S | location -> S
    this.pending = new Set()
    this._installJig()
    this._installBerry()
  }

  isSandboxed (T) {
    const installed = this.installs.get(T)
    return installed && T === installed
  }

  _getSandboxed (query) {
    if (this.isSandboxed(query)) return query
    return this.installs.get(query)
  }

  // Install loads code into a sandbox and makes it available to use
  // It does not deploy the code. It does however check that the code
  // is deployable. The main purpose is to install berry protocols for
  // use on mainnet and testnet without deploying the protocol to the chain.
  _installBerryProtocol (T) {
    // Make sure the presets are there
    return this.deploy(T, { dontDeploy: true })
  }

  extractProps (T) {
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

  // TODO: This should include partial installs
  deploy (T, options = {}) {
    if (this.pending.has(T)) return

    // short-circut deployment at Jig and Berry because this class already deployed it
    if (T === this.Jig || T === Jig) return this.Jig
    if (T === this.Berry || T === Berry) return this.Berry

    Log._info(TAG, 'Deploying', T.name)

    // check that this code can be deployed
    if (!_deployable(T)) throw new Error(`${T} is not deployable`)

    // if this type was already deployed on this network, don't deploy again
    const SPrev = this.installs.get(T)
    const run = _activeRun()
    const net = _networkSuffix(run.blockchain.network)
    if (SPrev && Object.keys(SPrev).includes(`origin${net}`) &&
      Object.keys(SPrev).includes(`location${net}`)) return SPrev

    // TODO: Add test, and make sure this works
    const classProps = Object.keys(T)
    if (classProps.includes(`location${net}`)) {
      const preByLoc = this.installs.get(T[`location${net}`])
      if (preByLoc) return preByLoc
    }

    // check the class properties. classProps are props specifically on this code, not a parent
    const isBasicObject = (o) => Object.getPrototypeOf(Object.getPrototypeOf(o)) === null
    if (classProps.includes('deps') && !isBasicObject(T.deps)) throw new Error('deps must be an object')
    const notAString = s => classProps.includes(s) && typeof T[s] !== 'string'
    stringProps.forEach(s => { if (notAString(s)) throw new Error(`${s} must be a string: ${T[s]}`) })

    run.transaction.begin()
    try {
      // create env, the globals in the sandbox. this will just be the parent.
      const env = {}

      // make sure the parent does not conflict with whats set in deps
      // realdeps is T.deps with its parent if not there
      const Parent = Object.getPrototypeOf(T)
      const realdeps = classProps.includes('deps') ? Object.assign({}, T.deps) : {}
      const SandboxObject = Sandbox._instance._intrinsics.Object
      if (Parent !== Object.getPrototypeOf(Object) &&
        Parent !== SandboxObject.getPrototypeOf(SandboxObject)) {
        env[Parent.name] = this.deploy(Parent, options)
        if (realdeps[Parent.name]) {
          const currentSandbox = this._getSandboxed(realdeps[Parent.name])
          if (currentSandbox !== env[Parent.name]) {
            throw new Error(`unexpected parent dependency ${Parent.name}`)
          }
        }
        if (!(Parent.name in realdeps) &&
          Parent !== this.installs.get(Jig) &&
          Parent !== Jig &&
          Parent !== this.installs.get(Berry) &&
          Parent !== Berry) {
          realdeps[Parent.name] = Parent
        }
      }

      // If the parent installed the child, return immediately and don't install anything
      const SPrev2 = this.installs.get(T)
      if (SPrev2 && Object.keys(SPrev2).includes(`origin${net}`) &&
        Object.keys(SPrev2).includes(`location${net}`)) return SPrev2

      const [S, sandboxGlobal] = this._sandboxType(T, env)
      this.installs.set(T, S)
      this.installs.set(S, S)

      // Deploy any code found in the static properties
      // ----------------------------------------------

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

      // If location is already set for the network, assume correct and don't reupload
      const hasPresets = classProps.includes(`origin${net}`) || classProps.includes(`location${net}`)
      if (hasPresets) {
        if (classProps.includes(`origin${net}`)) {
          S[`origin${net}`] = S.origin = T.origin = T[`origin${net}`]
        }
        S[`location${net}`] = S.location = T.location = T[`location${net}`] || T.origin
        S[`owner${net}`] = S.owner = T.owner = T[`owner${net}`]

        this.installs.set(S[`location${net}`], S)
      } else if (options.dontDeploy) {
        // Berry protocols
        const location = '!Not deployed'
        S[`origin${net}`] = S.origin = T.origin = T[`origin${net}`] = location
        S[`location${net}`] = S.location = T.location = T[`location${net}`] || T.origin
        S[`owner${net}`] = S.owner = T.owner = T[`owner${net}`] = null
      } else {
        // Location is not set. use a temporary location and deploy

        const currentNetwork = run.blockchain.network
        const success = (location) => {
          // if different network, primary origin and location will be set by that run instance
          if (run.blockchain.network === currentNetwork) {
            T.origin = T.location = S.origin = S.location = location
            T.owner = S.owner = T[`owner${net}`]
          }
          S[`origin${net}`] = S[`location${net}`] = location
          T[`origin${net}`] = T[`location${net}`] = location
          this.installs.set(location, S)
        }
        const error = () => {
          if (run.blockchain.network === currentNetwork) {
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
          this.pending.add(T)
          tempLocation = run.transaction._storeCode(T, S, realdeps, actionProps, success, error)
        } finally { this.pending.delete(T) }

        T[`origin${net}`] = T[`location${net}`] = T.origin = T.location = tempLocation
        S[`origin${net}`] = S[`location${net}`] = S.origin = S.location = tempLocation
        T[`owner${net}`] = S[`owner${net}`] = S.owner = T.owner
      }

      // Deploy each deployable
      resources.filter(resource => _resourceType(resource) === 'code')
        .forEach(T => this.deploy(T, options))

      // Create a safe clone of the static properties for the sandbox
      try {
        const safeStaticProps = ResourceJSON._deserialize(serialized, opts)
        Object.assign(S, safeStaticProps)
      } catch (e) {
        throw new Error(`A static property of ${T.name} cannot be sandboxed\n\n${e}`)
      }

      // Set dependencies now as sandbox globals. We've delayed this to enable circular deps.
      Object.entries(realdeps).forEach(([name, dep]) => {
        if (dep === Parent || dep === env[Parent.name]) return
        sandboxGlobal[name] = this.deploy(dep, options)
      })

      this._defineCaller(sandboxGlobal)

      return S
    } finally {
      run.transaction.end()
    }
  }

  async installFromTx (def, location, tx, kernel, bsvNetwork, _partiallyInstalledCode = new Map()) {
    // if we have this location already, return it
    if (this.installs.has(location)) return this.installs.get(location)
    if (_partiallyInstalledCode.has(location)) return _partiallyInstalledCode.get(location)

    // parse the location
    const txid = location.slice(0, 64)
    const vout = parseInt(location.slice(66))

    // make sure the owner matches the output's address
    // TODO: Move this to transaction
    const hex1 = tx.outputs[vout].script.toHex()
    const hex2 = Buffer.from(_lockify(def.owner, bsvNetwork).script).toString('hex')
    if (hex1 !== hex2) throw new Error(`bad def owner: ${location}`)

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
          env[parentName] = await kernel._transaction.load(parentLocation, { _partiallyInstalledCode })
        }
      }

      const [S, sandboxGlobal] = Sandbox._instance._evaluate(def.text, env)
      S.origin = S.location = location
      S.owner = def.owner
      const net = _networkSuffix(kernel._blockchain.network)
      S[`origin${net}`] = S[`location${net}`] = location
      S[`owner${net}`] = def.owner
      partialInstallResolve(S)

      if (sandboxGlobal) {
        const promises = Object.entries(def.deps || {}).map(([name, dep]) => {
          if (name === parentName) return
          const location = dep.startsWith('_') ? tx.hash + dep : dep
          return kernel._transaction.load(location, { _partiallyInstalledCode }).then(T => {
            sandboxGlobal[name] = T
          })
        })
        await Promise.all(promises)
      }

      // Set all of the dependencies to their sandboxed versions
      if (def.deps) {
        S.deps = {}
        Object.keys(def.deps).forEach(name => {
          S.deps[name] = sandboxGlobal[name] || env[name]
        })
      }

      this._defineCaller(sandboxGlobal)

      // Hydrate class prop resources and apply them to the sandbox
      if (def.props) {
        // First pre-load the resources in the class props
        const resources = new Map()
        const refs = ResourceJSON._findAllResourceRefsInResourceJSON(def.props)
        const loadResource = async ref => {
          const location = (ref[1] === 'i' || ref[1] === 'o') ? txid + ref : ref
          const resource = await kernel._transaction.load(location, { _partiallyInstalledCode })
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
      if (this.installs.has(location)) {
        const hint = 'This is an internal Run bug. Please report it to the library developers.'
        throw new Error(`Code installed twice for ${location}\n\n${hint}.`)
      }

      this.installs.set(location, S)
      this.installs.set(S, S)

      return S
    } catch (e) {
      partialInstallReject(e)
      throw e
    }
  }

  _installJig () {
    this.Jig = this._sandboxType(Jig, _JigDeps)[0]
    this.installs.set(Jig, this.Jig)
    this.installs.set(this.Jig, this.Jig)
  }

  _installBerry () {
    this.Berry = this._sandboxType(Berry, _BerryDeps)[0]
    this.installs.set(Berry, this.Berry)
    this.installs.set(this.Berry, this.Berry)
  }

  _sandboxType (T, env) {
    const prev = this.installs.get(T)
    if (prev) return [prev, null]
    return Sandbox._instance._sandboxType(T, env)
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

    this.installs.forEach((v, k) => {
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

module.exports = Code
