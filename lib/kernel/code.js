/**
 * code.js
 *
 * Functionality related to loading, deploying, and running arbitrary code.
 */

const { _name } = require('../util')
const DeterministicRealm = require('@runonbitcoin/sandbox')

// ------------------------------------------------------------------------------------------------
// Sandbox
// ------------------------------------------------------------------------------------------------

/**
 * Sandbox environment where code is evaluated
 */
class Sandbox {
  constructor () {
    this._realm = new DeterministicRealm()

    // Code to get an intrinsic safely or return null if it is undefined
    const intrinsicOrNull = name => `typeof ${name} !== 'undefined' ? ${name} : null`

    // Calculate the built-in intrinsics in the host environment
    let code = 'const x = {};'
    intrinsicNames.forEach(name => { code += `x.${name} = ${intrinsicOrNull(name)};` })
    code += 'return x'
    this._hostIntrinsics = new Function(code)() // eslint-disable-line

    // Calculate the built-in intrinsics in the realm
    const compartment = this._realm.makeCompartment()
    this._realmIntrinsics = {}
    for (const name of intrinsicNames) {
      this._realmIntrinsics[name] = compartment.evaluate(intrinsicOrNull(name))
    }
  }
}

// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
const intrinsicNames = [
  // Global functions
  'console',
  'eval',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'escape',

  // Fundamental objects
  'Object',
  'Function',
  'Boolean',
  'Symbol',
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',

  // Numbers and dates
  'Number',
  'BigInt',
  'Math',
  'Date',

  // Text processing
  'String',
  'RegExp',

  // Indexed collections
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
  'BigInt64Array',
  'BigUint64Array',

  // Keyed collections
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',

  // Structured data
  'ArrayBuffer',
  'DataView',
  'JSON',

  // Control abstraction objects
  'Promise',
  'Generator',
  'GeneratorFunction',
  'AsyncFunction',

  // Reflection
  'Reflect',
  'Proxy',

  // Internationalization
  'Intl',

  // WebAssembly
  'WebAssembly'
]

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * Manages all code known by all Run instances.
 */
class Code {
  constructor () {
    this._deployed = {} // { <network>: Repository }
    this._bundles = {} // <network>: Array<Bundle>
    this._sandbox = new Sandbox()
  }

  _deploy (T, network, logger, transaction) {
    const bundle = new Bundle(network, logger, this)

    bundle._add(T)

    this._bundles[network] = this._bundles[network] || []
    this._bundles[network].push(bundle)

    transaction._begin()
    try {
      transaction._deploy(bundle)
    } finally {
      transaction._end()
    }

    // TODO: When deploy finishes, how to update bundles
  }

  _repository (network) {
    const r = this._repositories[network] || new Repository(network)
    this._repositories[network] = r
    return r
  }

  /**
   * Gets the sandbox for a class T on a particular network
   * @param {function} T Class to get
   * @param {string} network Network version of T
   * @returns {function} Sandbox
   */
  _get (T, network) {
    return this._repository._get(T) || this._code._repository(this._network)._get(T)
  }
}

// ------------------------------------------------------------------------------------------------
// Bundle
// ------------------------------------------------------------------------------------------------

/**
 * A group of code packaged to be deployed together
 */
class Bundle {
  constructor (network, logger, sandbox) {
    this._network = network
    this._logger = logger
    this._sandbox = sandbox
    this._repository = new Repository(network)
  }

  /**
   * Adds a type and all its undeployed dependencies to this bundle
   * @param {function} T Type to add
   */
  _add (T) {
    // Check if we've already deployed this type anywhere
    const PreviousSandbox = this._get(T)
    if (PreviousSandbox) return PreviousSandbox

    this._logger.info(`Deploying ${_name(T)}`)

    // Check if this type is able to be deployed
    checkDeployable(T)

    // Create a sandbox, first by adding its parent, then evaluating its code
    const compartment = this._sandbox._realm.makeCompartment()
    this._addParent(T, compartment)
    const Sandbox = compartment.evaluate(sourceCode(T))

    // Add every additional dependency. We do this after to allow for circular refs.

    return Sandbox
  }

  /**
   * Gets the sandbox for a class T
   * @param {function} T Class to get
   * @returns {function} Sandbox
   */
  _get (T) {
    return this._repository._get(T) || this._code._repository(this._network)._get(T)
  }

  /**
   * Adds the parent of a class both to this bundle and a child's compartment
   * @param {*} Child Child type
   * @param {*} compartment Child compartment
   */
  _addParent (Child, compartment) {
    const Parent = parent(Child, this._sandbox)
    if (!Parent) return

    const ParentSandbox = this._add(Parent)

    const deps = prop(Child, 'deps') || {}
    const ParentDep = deps[parent.name]

    // If the parent is already specified in deps, make sure it is the same
    if (ParentDep) {
      const ParentDepSandbox = this._get(ParentDep)
      if (ParentSandbox !== ParentDepSandbox) {
        throw new Error(`Unexpected parent dependency ${Parent.name}`)
      }
    }

    // Install the parent in our child's compartment
    compartment.global[Parent.name] = ParentSandbox
  }
}

// ------------------------------------------------------------------------------------------------
// Repository
// ------------------------------------------------------------------------------------------------

/**
 * A collection of sandboxed code, grouped together for some purpose.
 */
class Repository {
  constructor (network) {
    this._network = network
    this._installs = new Map() // Func|SandboxFunc|Location -> SandboxFunc
  }

  /**
   * Gets a sandboxed function out of the repository
   * @param {function|string} T Original class, or sandbox, or its deployed location
   */
  _get (T) {
    if (typeof T === 'string') return this._installs.get(T)

    const S = this._installs.get(T)
    if (S) return S

    const locationPreset = preset(T, 'location', this._network)
    if (locationPreset) {
      const S = this._installs.get(locationPreset)
      if (S) return S
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Code helpers
// ------------------------------------------------------------------------------------------------

/**
 * Returns whether a given function or class can be deployed on-chain.
 *
 * We check that the argument is a function, and also that it is not a built-in function to
 * JavaScript, because those do not have source code available and rely on VM internals.
 */
function checkDeployable (T) {
  const error = reason => { throw new Error(`${_name(T)} not deployable: ${reason}`) }
  if (typeof T !== 'function') error('Not a function')
  if (T.toString().includes('[native code]')) error('Native function')

  // TODO
  // check the class properties. classProps are props specifically on this code, not a parent
  // const isBasicObject = (o) => Object.getPrototypeOf(Object.getPrototypeOf(o)) === null
  // if (classProps.includes('deps') && !isBasicObject(type.deps)) throw new Error('deps must be an object')
  // const notAString = s => classProps.includes(s) && typeof type[s] !== 'string'
  // stringProps.forEach(s => { if (notAString(s)) throw new Error(`${s} must be a string: ${type[s]}`) })
}

function prop (T, name) {
  return Object.keys(T).includes(name) ? T[name] : undefined
}

function preset (T, name, network) {
  const suffix = network === 'stn' ? 'Stn'
    : network.charAt(0).toUpperCase() + network.slice(1).toLowerCase() + 'net'
  const presetName = `${name}${suffix}`
  return prop(T, presetName)
}

function parent (T, code) {
  return false
  // const Parent = Object.getPrototypeOf(T)

  // const SandboxObject = this.evaluator.intrinsics.default.Object
  // if (parentClass !== Object.getPrototypeOf(Object) &&
  // parentClass !== SandboxObject.getPrototypeOf(SandboxObject)) {
}

function sourceCode (T) {
  const name = T.toString().startsWith('class') ? 'AnonymousClass' : 'anonymousFunction'
  return `const ${name} = ${T.toString()}; ${name}`
}

// ------------------------------------------------------------------------------------------------
// Intrinsics helpers
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------

module.exports = Code
