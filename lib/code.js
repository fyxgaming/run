/**
 * code.js
 *
 * Functionality related to loading, deploying, and running arbitrary code.
 */

const vm = typeof window === 'undefined' ? require('vm') : require('vm-browserify')
const Jig = require('./jig')
const util = require('./util')
const bsv = require('bsv')

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
    this.sandbox = typeof options.sandbox !== 'undefined' ? options.sandbox : true
    this.logger = typeof options.logger !== 'undefined' ? options.logger : null

    // vm-browserify requires a body for sandboxing. if it doesn't exist, create one.
    if (typeof window !== 'undefined' && !window.document.body) {
      window.document.body = document.createElement('body')
    }

    this.vmEvaluator = new VMEvaluator()
    this.globalEvaluator = new GlobalEvaluator({ logger: this.logger })
    this.intrinsics = this.vmEvaluator.intrinsics

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

  static extractProps (type) {
    const props = { }
    const skipProps = ['deps', ...stringProps]
    const classProps = Object.keys(type)
    const propNames = classProps.filter(key => !skipProps.includes(key))
    const refs = []
    propNames.forEach(name => {
      // check if serializable, and also extract the code references
      util.richObjectToJson(type[name], [util.extractJigsAndCodeToArray(refs)],
        null, `${type.name}.${name}`)
      props[name] = type[name]
    })
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
      const realdeps = classProps.includes('deps') ? { ...type.deps } : {}
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

      const [sandbox, sandboxGlobal] = this.evaluate(type, util.getNormalizedSourceCode(type),
        type.name, env, this.sandbox)
      this.installs.set(type, sandbox)
      this.installs.set(sandbox, sandbox)

      const { props, refs } = Code.extractProps(type)
      Object.keys(props).forEach(key => { sandbox[key] = props[key] })
      const codeRefs = refs.filter(ref => util.deployable(ref))

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

        const tempLocation = run.transaction.storeCode(type, sandbox, realdeps, props, success, error)
        type[`origin${net}`] = type[`location${net}`] = tempLocation
        sandbox[`origin${net}`] = sandbox[`location${net}`] = tempLocation
        type[`owner${net}`] = sandbox[`owner${net}`] = type.owner
      }

      // deploy deps and set to sandbox globals after origin is set, allowing circular dependencies
      if (sandboxGlobal) {
        Object.entries(realdeps).forEach(([name, dep]) => {
          if (dep === parentClass || dep === env[parentClass.name]) return
          sandboxGlobal[name] = this.deploy(dep)
        })
      }
      codeRefs.forEach(ref => this.deploy(ref))

      // replace all static props that are code with sandboxed code because sandboxes
      // should only know about other sandboxed code and never application code.
      Object.keys(props).forEach(prop => {
        this.control.enforce = false
        util.deepTraverse(sandbox[prop], (target, parent, name) => {
          const installed = this.getInstalled(target)
          if (installed && name) parent[name] = installed
          if (installed && !name) sandbox[prop] = installed
        })
        this.control.enforce = true
      })
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

      const name = def.text.match(/^(class|function) (\w+)[( ]/)[2]
      const [sandbox, sandboxGlobal] = this.evaluate(null, def.text, name, env, this.sandbox)
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
    this.control = { // control state shared across all jigs, similar to a PCB
      stack: [], // jig call stack for the current method (Array<Target>)
      creates: new Set(), // jigs created in the current method (Set<Target>)
      reads: new Set(), // jigs read during the current method (Set<Target>)
      saves: new Map(), // saved original state of jigs before method (Target->Object)
      callers: new Map(), // Callers on each jig method (Target->Set<Object>)
      error: null, // if any errors occurred to prevent swallows
      enforce: true, // enable safeguards for the user
      proxies: new Map(), // map connecting targets to proxies (Target->Proxy)
      locals: new WeakMap() // local secret state for each jig (Target->Object)
    }
    const env = { control: this.control, util }
    this.Jig = this.evaluate(Jig, Jig.toString(), 'Jig', env, this.shouldSandbox('Jig'))[0]
    this.installs.set(Jig, this.Jig)
    this.installs.set(this.Jig, this.Jig)
  }

  shouldSandbox (name) {
    return this.sandbox instanceof RegExp ? this.sandbox.test(name) : this.sandbox
  }

  evaluate (type, code, name, env, sandbox) {
    // if we've already installed this type, then return it
    const prev = this.installs.get(type)
    if (prev) return [prev, null]

    // test if we need to sandbox or not
    sandbox = (sandbox instanceof RegExp ? sandbox.test(name) : sandbox)

    const evaluator = sandbox ? this.vmEvaluator : this.globalEvaluator

    const [result, globals] = evaluator.evaluate(code, env)

    if (typeof env.caller === 'undefined') {
      Object.defineProperty(globals, 'caller', {
        configurable: true,
        enumerable: true,
        get: () => {
          // we must be inside a jig method called by another jig method to be non-null
          if (this.control.stack.length < 2) return null

          // return the proxy for the jig that called this jig
          return this.control.proxies.get(this.control.stack[this.control.stack.length - 2])
        }
      })
    }

    return [!sandbox && type ? type : result, globals]
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

    this.globalEvaluator.activate()
  }

  deactivate () {
    this.globalEvaluator.deactivate()
  }
}

// ------------------------------------------------------------------------------------------------
// VMEvaluator
// ------------------------------------------------------------------------------------------------

// Intrisic data types that should be the same across evaluations
const intrinsicDataTypes = [
  'Date',
  'RegExp',
  'Array',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet'
]

/**
 * Secure sandboxer for arbitrary code
 */
class VMEvaluator {
  constructor () {
    // create common intrinsics shared between realms
    this.intrinsics = {}
    // Our console intercepts console.log in sandboxed code and re-logs them outside
    const consoleCode = 'Object.assign(...Object.entries(c).map(([k, f]) => ({ [k]: (...a) => f(...a) })))'
    this.intrinsics.console = vm.runInContext(consoleCode, vm.createContext({ c: console }))
    intrinsicDataTypes.forEach(type => {
      this.intrinsics[type] = vm.runInContext(type, vm.createContext({}))
    })
  }

  evaluate (code, env = {}) {
    if (typeof code !== 'string') throw new Error(`Code must be a string. Received: ${code}`)
    if (typeof env !== 'object') throw new Error(`Environment must be an object. Received: ${env}`)
    if ('$globals' in env) throw new Error('Environment must not contain $globals')

    env = { ...this.intrinsics, ...env, $globals: {} }

    banNondeterministicGlobals(env)

    const context = vm.createContext(env)

    if (typeof window === 'undefined') { context.global = context }

    // When a function is anonymous, it will be named the variable it is assigned. We give it
    // a friendly anonymous name to distinguish it from named classes and functions.
    const anon = code.startsWith('class') ? 'AnonymousClass' : 'anonymousFunction'

    // Execute the code in strict mode.
    const script = `with ($globals) { const ${anon} = ${code}; ${anon} }`
    const result = vm.runInContext(script, context)

    return [result, env.$globals]
  }
}

// ------------------------------------------------------------------------------------------------
// GlobalEvaluator
// ------------------------------------------------------------------------------------------------

/**
 * Evaluates code using dependences that are set as globals. This is quite dangerous, but we
 * only use it when sandbox=false, which is intended for testing code coverage and debugging.
 */
class GlobalEvaluator {
  constructor (options = {}) {
    this.logger = options.logger
    this.activated = true
    // We will save the prior globals before overriding them so they can be reverted.
    // This will also store our globals when we deactivate so we can re-activate them.
    this.savedGlobalDescriptors = {}
  }

  evaluate (code, env = {}) {
    if (typeof code !== 'string') throw new Error(`Code must be a string. Received: ${code}`)
    if (typeof env !== 'object') throw new Error(`Environment must be an object. Received: ${env}`)
    if ('$globals' in env) throw new Error('Environment must not contain $globals')

    // When a function is anonymous, it will be named the variable it is assigned. We give it
    // a friendly anonymous name to distinguish it from named classes and functions.
    const anon = code.startsWith('class') ? 'AnonymousClass' : 'anonymousFunction'

    // Set each env as a global
    const options = { configurable: true, enumerable: true, writable: true }
    Object.keys(env).forEach(key => this.setGlobalDescriptor(key, { ...options, value: env[key] }))

    // Turn the code into an object
    const result = eval(`const ${anon} = ${code}; ${anon}`) // eslint-disable-line

    // Wrap global sets so that we update savedGlobalDescriptors
    const wrappedGlobal = new Proxy(global, {
      set: (target, prop, value) => {
        this.setGlobalDescriptor(prop, { ...options, value })
        return true
      },
      defineProperty: (target, prop, descriptor) => {
        this.setGlobalDescriptor(prop, descriptor)
        return true
      }
    })

    return [result, wrappedGlobal]
  }

  setGlobalDescriptor (key, descriptor) {
    // Save the previous global the first time we override it. Future overrides
    // will throw a warning because now there are two values at the global scope.
    const priorDescriptor = Object.getOwnPropertyDescriptor(global, key)

    if (!(key in this.savedGlobalDescriptors)) {
      this.savedGlobalDescriptors[key] = priorDescriptor
    } else if (!sameDescriptors(descriptor, priorDescriptor)) {
      if (this.logger) {
        const warning = 'There might be bugs with sandboxing disabled'
        const reason = `Two different values were set at the global scope for ${key}`
        this.logger.warn(`${warning}\n\n${reason}`)
      }
    }

    Object.defineProperty(global, key, descriptor)
  }

  activate () {
    if (this.activated) return
    this.swapSavedGlobals()
    this.activated = true
  }

  deactivate () {
    if (!this.activated) return
    this.swapSavedGlobals()
    this.activated = false
  }

  swapSavedGlobals () {
    const swappedGlobalDescriptors = {}

    Object.keys(this.savedGlobalDescriptors).forEach(key => {
      swappedGlobalDescriptors[key] = Object.getOwnPropertyDescriptor(global, key)

      if (typeof this.savedGlobalDescriptors[key] === 'undefined') {
        delete global[key]
      } else {
        Object.defineProperty(global, key, this.savedGlobalDescriptors[key])
      }
    })

    this.savedGlobalDescriptors = swappedGlobalDescriptors
  }
}

// ------------------------------------------------------------------------------------------------
// Helper methods
// ------------------------------------------------------------------------------------------------

function banNondeterministicGlobals (env) {
  const list = ['Date', 'Math', 'eval', 'XMLHttpRequest', 'FileReader', 'WebSocket', 'setTimeout', 'setInterval']
  list.forEach(x => { if (typeof env[x] === 'undefined') { env[x] = undefined } })
}

function sameDescriptors (a, b) {
  if (typeof a !== typeof b) return false
  const aKeys = Array.from(Object.keys(a))
  const bKeys = Array.from(Object.keys(b))
  if (aKeys.length !== bKeys.length) return false
  return !aKeys.some(key => aKeys[key] !== bKeys[key])
}

// ------------------------------------------------------------------------------------------------

Code.VMEvaluator = VMEvaluator
Code.GlobalEvaluator = GlobalEvaluator
Code.intrinsicDataTypes = intrinsicDataTypes

module.exports = Code
