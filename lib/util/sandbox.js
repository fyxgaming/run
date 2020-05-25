/**
 * sandbox.js
 *
 * The universal code sandbox used within Run.
 *
 * All third-party code that Run loads uses this sandbox. The Sandbox class is a singleton. We
 * use a single sandbox so that even if we load objects from multiple Run instances, they all
 * come from the same "realm" and share the same intrinsics. This is important! Because any
 * internal Run logic that depends on the intrinsics (ie. "instanceof Uint8Array") can now
 * assume the intrinsics will all come from the same realm. Anything else would be a nightmare.
 */

const DeterministicRealm = require('@runonbitcoin/sandbox')

const { ResourceMap, ResourceSet } = require('./datatypes')
const { _text, _sourceCode } = require('./misc')
const Log = require('./log')

// ------------------------------------------------------------------------------------------------
// Sandbox
// ------------------------------------------------------------------------------------------------

const TAG = 'Sandbox'

/**
 * The global sandbox instance
 */
let instance = null

/**
 * The universal code sandbox
 */
class Sandbox {
  static get _instance () {
    if (!instance) instance = new Sandbox()
    return instance
  }

  constructor () {
    Log._info(TAG, 'Creating deterministic realm')

    this._realm = new DeterministicRealm()

    // Keep track of common intrinsics shared between realms. The SES realm creates
    // these, and we just evaluate a list of them and store them here.
    const compartment = this._realm.makeCompartment()
    this._intrinsics = compartment.evaluate(_getIntrinsicsSrc)

    this._intrinsics.Map = this._sandboxType(ResourceMap, ResourceMap.deps)[0]
    this._intrinsics.Set = this._sandboxType(ResourceSet, ResourceSet.deps)[0]

    this._hostIntrinsics = eval(_getIntrinsicsSrc) // eslint-disable-line
  }

  _sandboxType (T, env) {
    if (Sandbox.excludes.includes(T)) {
      Log._info(TAG, 'Excluding', _text(T))
      const globalThis = typeof global !== 'undefined' ? global : window
      return [T, globalThis]
    }

    return this._evaluate(_sourceCode(T), env)
  }

  _evaluate (code, env = {}) {
    Log._info(TAG, 'Evaluating', _text(code.replace(/\s+/g, ' ')))

    const compartment = this._realm.makeCompartment()

    Object.assign(compartment.global, this._intrinsics, env)

    // When a function is anonymous, it will be named the variable it is assigned. We give it
    // a friendly anonymous name to distinguish it from named classes and functions.
    const anon = code.startsWith('class') ? 'AnonymousClass' : 'anonymousFunction'
    const script = `const ${anon}=${code};${anon}`

    // Show a nice error when we try to access Date and Math

    if (!('Math' in env)) {
      Object.defineProperty(compartment.global, 'Math', {
        get: () => {
          const hint = 'Hint: Math is disabled because it is non-deterministic.'
          throw new ReferenceError(`Math is not defined\n\n${hint}`)
        }
      })
    }

    if (!('Date' in env)) {
      Object.defineProperty(compartment.global, 'Date', {
        get: () => {
          const hint = 'Hint: Date is disabled because it is non-deterministic.'
          throw new ReferenceError(`Date is not defined\n\n${hint}`)
        }
      })
    }

    const result = compartment.evaluate(script)

    return [result, compartment.global]
  }
}

// ------------------------------------------------------------------------------------------------
// Intrinsics
// ------------------------------------------------------------------------------------------------

// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
const _intrinsicNames = [
  // Global functions
  'console', 'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'decodeURI',
  'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape',
  // Fundamental objects
  'Object', 'Function', 'Boolean', 'Symbol', 'Error', 'EvalError', 'RangeError',
  'ReferenceError', 'SyntaxError', 'TypeError', 'URIError',
  // Numbers and dates
  'Number', 'BigInt', 'Math', 'Date',
  // Text processing
  'String', 'RegExp',
  // Indexed collections
  'Array', 'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array',
  'BigUint64Array',
  // Keyed collections
  'Map', 'Set', 'WeakMap', 'WeakSet',
  // Structured data
  'ArrayBuffer', 'DataView', 'JSON',
  // Control abstraction objects
  'Promise', 'Generator', 'GeneratorFunction', 'AsyncFunction',
  // Reflection
  'Reflect', 'Proxy',
  // Internationalization
  'Intl',
  // WebAssembly
  'WebAssembly'
]

let _getIntrinsicsSrc = 'const x = {}\n'
_intrinsicNames.forEach(name => {
  _getIntrinsicsSrc += `x.${name} = typeof ${name} !== 'undefined' ? ${name} : undefined\n`
})
_getIntrinsicsSrc += 'x'

// ------------------------------------------------------------------------------------------------

/**
 * A global list of classes of functions to exclude from sandboxing.
 *
 * This is used mainly to disable sandboxing on specific classes to collect code coverage.
 * Coverage tools usually modify code to update globals, and this won't work in sandboxes.
 */
Sandbox.excludes = []

// ------------------------------------------------------------------------------------------------

module.exports = Sandbox
