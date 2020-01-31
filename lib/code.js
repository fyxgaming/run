/**
 * code.js
 *
 * Functionality related to loading, deploying, and running arbitrary code.
 */

const bsv = require('bsv')
const util = require('./util')
const Evaluator = require('./evaluator')
const { Jig, JigControl } = require('./jig')
const Xray = require('./v2/xray')

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

const stringProps = ['origin', 'location', 'originMainnet', 'locationMainnet', 'originTestnet',
  'locationTestnet', 'originStn', 'locationStn', 'originMocknet', 'locationMocknet',
  'owner', 'ownerMainnet', 'ownerTestnet', 'ownerStn', 'ownerMocknet']

/**
   * Code repository, sandboxer, installer, and deployer
   */
class Code {
  constructor (options = {}) {
    this.installs = new Map() // Type | Location | Sandbox -> Sandbox
    this.evaluator = new Evaluator({ logger: options.logger, sandbox: options.sandbox })
    this.installJig()
  }

  isSandbox (type) {
    const sandbox = this.installs.get(type)
    return sandbox && type === sandbox
  }

  getInstalled (typeOrLocation) {
    if (this.isSandbox(typeOrLocation)) return typeOrLocation
    return this.installs.get(typeOrLocation)
  }

  extractProps (type) {
    // Determine which properties to extract
    const skipProps = ['deps', ...stringProps]
    const classProps = Object.keys(type)
    const propNames = classProps.filter(key => !skipProps.includes(key))

    // Create an object with just these properties
    const props = {}
    propNames.forEach(name => { props[name] = type[name] })

    // Check that these properties are serializable
    const intrinsics = new Xray.Intrinsics()
      .use(this.evaluator.intrinsics)

    const xray = new Xray()
      .allowTokens()
      .allowDeployables()
      .useIntrinsics(intrinsics)

    try {
      xray.scan(props)
    } catch (e) {
      throw new Error(`A static property of ${type.name} is not supported\n\n${e}`)
    }

    // Save the any deployables and tokens
    const refs = []
    xray.deployables.forEach(deployable => refs.push(deployable))
    xray.tokens.forEach(token => refs.push(token))

    return { props, refs }
  }

  deploy (type) {
    // short-circut deployment at Jig because this class already deployed it
    if (type === this.Jig || type === Jig) return this.Jig

    // check that this code can be deployed
    if (!util.deployable(type)) throw new Error(`${type} is not deployable`)

    // if this type was already deployed on this network, don't deploy again
    const pre = this.installs.get(type)
    const run = util.activeRunInstance()
    const net = util.networkSuffix(run.blockchain.network)
    if (pre && Object.keys(pre).includes(`origin${net}`) &&
      Object.keys(pre).includes(`location${net}`)) return pre

    // TODO: Add test, and make sure this works
    const classProps = Object.keys(type)
    if (classProps.includes(`location${net}`)) {
      const preByLoc = this.installs.get(type[`location${net}`])
      if (preByLoc) return preByLoc
    }

    // check the class properties. classProps are props specifically on this code, not a parent
    const isBasicObject = (o) => Object.getPrototypeOf(Object.getPrototypeOf(o)) === null
    if (classProps.includes('deps') && !isBasicObject(type.deps)) throw new Error('deps must be an object')
    const notAString = s => classProps.includes(s) && typeof type[s] !== 'string'
    stringProps.forEach(s => { if (notAString(s)) throw new Error(`${s} must be a string: ${type[s]}`) })

    run.transaction.begin()
    try {
      // create env, the globals in the sandbox. this will just be the parent.
      const env = {}

      // make sure the parent does not conflict with whats set in deps
      // realdeps is type.deps with its parent if not there
      const parentClass = Object.getPrototypeOf(type)
      const realdeps = classProps.includes('deps') ? Object.assign({}, type.deps) : {}
      if (parentClass !== Object.getPrototypeOf(Object)) {
        env[parentClass.name] = this.deploy(parentClass)
        if (realdeps[parentClass.name]) {
          const currentSandbox = this.getInstalled(realdeps[parentClass.name])
          if (currentSandbox !== env[parentClass.name]) {
            throw new Error(`unexpected parent dependency ${parentClass.name}`)
          }
        }
        if (!(parentClass.name in realdeps) && parentClass !== this.installs.get(Jig) && parentClass !== Jig) {
          realdeps[parentClass.name] = parentClass
        }
      }

      // If the parent the child, return its location and don't install anything
      const pre2 = this.installs.get(type)
      if (pre2 && Object.keys(pre2).includes(`origin${net}`) &&
        Object.keys(pre2).includes(`location${net}`)) return pre2

      const [sandbox, sandboxGlobal] = this.sandboxType(type, env)
      this.installs.set(type, sandbox)
      this.installs.set(sandbox, sandbox)

      // Deploy any code found in the static properties

      const intrinsics = new Xray.Intrinsics()
        .use(this.evaluator.intrinsics)

      const xray = new Xray()
        .allowTokens()
        .allowDeployables()
        .useIntrinsics(intrinsics)
        .useCodeCloner(x => this.getInstalled(x))

      const staticProps = Object.assign({}, type)
      const skipProps = ['deps', ...stringProps]
      skipProps.forEach(name => { delete staticProps[name] })

      try {
        xray.scan(staticProps)
      } catch (e) {
        throw new Error(`A static property of ${type.name} is not supported\n\n${e}`)
      }

      // if location is already set for the network, assume correct and don't reupload
      if (classProps.includes(`origin${net}`) || classProps.includes(`location${net}`)) {
        if (classProps.includes(`origin${net}`)) {
          sandbox[`origin${net}`] = sandbox.origin = type.origin = type[`origin${net}`]
        }
        sandbox[`location${net}`] = sandbox.location = type.location = type[`location${net}`] || type.origin
        sandbox[`owner${net}`] = sandbox.owner = type.owner = type[`owner${net}`]

        this.installs.set(sandbox[`location${net}`], sandbox)
      } else {
        // location is not set. use a temporary location and deploy

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

        const tempLocation = run.transaction.storeCode(type, sandbox, realdeps, staticProps, success, error)
        type[`origin${net}`] = type[`location${net}`] = tempLocation
        sandbox[`origin${net}`] = sandbox[`location${net}`] = tempLocation
        type[`owner${net}`] = sandbox[`owner${net}`] = type.owner
      }

      // Deploy each deployable

      xray.deployables.forEach(x => this.deploy(x))

      // Create a safe clone of the static properties for the sandbox

      try {
        const safeStaticProps = xray.clone(staticProps)
        Object.assign(sandbox, safeStaticProps)
      } catch (e) {
        throw new Error(`A static property of ${type.name} cannot be sandboxed\n\n${e}`)
      }

      // Deploy non-crucial dependencies and now set them as sandbox globals.
      // We've delayed this to the end, which makes circular dependencies possible.

      if (sandboxGlobal) {
        Object.entries(realdeps).forEach(([name, dep]) => {
          if (dep === parentClass || dep === env[parentClass.name]) return
          sandboxGlobal[name] = this.deploy(dep)
        })
      }

      if (Object.keys(realdeps).length) {
        sandbox.deps = { }
        Object.keys(realdeps).forEach(name => {
          sandbox.deps[name] = this.deploy(realdeps[name])
        })
      }

      return sandbox
    } finally {
      run.transaction.end()
    }
  }

  async installFromTx (def, location, tx, run, bsvNetwork, partiallyInstalledCode = new Map()) {
    // if we have this location already, return it
    if (this.installs.has(location)) return this.installs.get(location)
    if (partiallyInstalledCode.has(location)) return partiallyInstalledCode.get(location)

    // parse the location
    const txid = location.slice(0, 64)
    const vout = parseInt(location.slice(66))

    // make sure the owner matches the output's address
    const addr1 = tx.outputs[vout].script.toAddress(bsvNetwork).toString()
    const addr2 = new bsv.PublicKey(def.owner, bsvNetwork).toAddress().toString()
    if (addr1 !== addr2) throw new Error(`bad def owner: ${location}`)

    const env = { }

    // Create a promise so that other dependencies can refer to this load
    // instead of loading themselves
    let partialInstallResolve = null; let partialInstallReject = null
    const partialInstall = new Promise((resolve, reject) => {
      partialInstallResolve = resolve
      partialInstallReject = reject
    })
    partiallyInstalledCode.set(location, partialInstall)

    try {
      const parentClassRegex = /^class \w* extends (\w*)[\s]*{/
      let parentName = null
      if (parentClassRegex.test(def.text)) {
        parentName = def.text.match(parentClassRegex)[1]
        let parentLocation = (def.deps || {})[parentName]
        if (parentName === 'Jig' && typeof parentLocation === 'undefined') {
          env.Jig = this.Jig
        } else {
          if (parentLocation.startsWith('_')) { parentLocation = tx.hash + parentLocation }
          env[parentName] = await run.transaction.load(parentLocation, { partiallyInstalledCode })
        }
      }

      const [sandbox, sandboxGlobal] = this.evaluator.evaluate(def.text, env)
      sandbox.origin = sandbox.location = location
      sandbox.owner = def.owner
      const net = util.networkSuffix(run.blockchain.network)
      sandbox[`origin${net}`] = sandbox[`location${net}`] = location
      sandbox[`owner${net}`] = def.owner
      partialInstallResolve(sandbox)

      if (sandboxGlobal) {
        const promises = Object.entries(def.deps || {}).map(([name, dep]) => {
          if (name === parentName) return
          const location = dep.startsWith('_') ? tx.hash + dep : dep
          return run.transaction.load(location, { partiallyInstalledCode }).then(T => {
            sandboxGlobal[name] = T
          })
        })
        await Promise.all(promises)
      }

      // set all of the dependencies to their sandboxed versions
      if (def.deps) {
        sandbox.deps = {}
        Object.keys(def.deps).forEach(name => {
          sandbox.deps[name] = sandboxGlobal[name] || env[name]
        })
      }

      // ----------------------------------------------------
      // HYDRATE CLASS PROPERTIES
      // ----------------------------------------------------

      // Convert def.props into a rich object, finding all refs to load in the process
      const refsToLoad = []
      const findRefsToLoad = (target, parent, name) => {
        if (typeof target.$ref !== 'undefined') {
          refsToLoad.push({ location: target.$ref, parent, name })
          return {}
        }
      }
      const classProps = util.jsonToRichObject(def.props || {}, [findRefsToLoad])

      // Hydrate each reference and set it on classProps
      const expandLocation = id => { return (id[1] === 'i' || id[1] === 'o') ? txid + id : id }
      const loadPromises = refsToLoad.map(ref =>
        run.transaction.load(expandLocation(ref.location), { partiallyInstalledCode }))
      const loadedRefs = await Promise.all(loadPromises)
      refsToLoad.forEach(({ location, parent, name }, index) => {
        parent[name] = loadedRefs[index]
      })

      // Apply each rich class property to our sandbox
      Object.assign(sandbox, classProps)

      // ----------------------------------------------------

      partiallyInstalledCode.delete(location)

      // Safety check. We should be able to remove over time.
      if (this.installs.has(location)) {
        const hint = 'This is an internal Run bug. Please report it to the library developers.'
        throw new Error(`Code installed twice for ${location}\n\n${hint}.`)
      }

      this.installs.set(location, sandbox)
      this.installs.set(sandbox, sandbox)

      return sandbox
    } catch (e) {
      partialInstallReject(e)
      throw e
    }
  }

  installJig () {
    const env = { JigControl, util }
    this.Jig = this.sandboxType(Jig, env)[0]
    this.installs.set(Jig, this.Jig)
    this.installs.set(this.Jig, this.Jig)
  }

  sandboxType (type, env) {
    const prev = this.installs.get(type)
    if (prev) return [prev, null]
    const code = util.getNormalizedSourceCode(type)
    const willSandbox = this.evaluator.willSandbox(code)
    const [result, globals] = this.evaluator.evaluate(code, env)
    return [!willSandbox && type ? type : result, globals]
  }

  activate (network) {
    const net = util.networkSuffix(network)

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

    this.evaluator.activate()
  }

  deactivate () {
    this.evaluator.deactivate()
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Code
