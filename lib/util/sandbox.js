const DeterministicRealm = require('@runonbitcoin/sandbox')
const { TokenMap, TokenSet } = require('./set')

/**
 * The universal code sandbox
 */
class Sandbox {
  constructor () {
    this._realm = new DeterministicRealm()

    // Keep track of common intrinsics shared between realms. The SES realm creates
    // these, and we just evaluate a list of them and store them here.
    const compartment = this.realm.makeCompartment()
    this._intrinsics = compartment.evaluate(_codeToGetIntrinsics)

    this._intrinsics.Map = this._sandboxType(TokenMap)
    this._intrinsics.Set = this._sandboxType(TokenSet)
  }

  _sandboxType (T) {
    if (Sandbox._excludes.includes(T)) return T
    return this._evaluate(T.toString, T.deps)[0]
  }

  _evaluate (code, env) {
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

Sandbox._instance = new Sandbox()

Sandbox._excludes = []

// ------------

// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
const intrinsicNames = [
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

let _codeToGetIntrinsics = 'const x = {}\n'
intrinsicNames.forEach(name => {
  _codeToGetIntrinsics += `x.${name} = typeof ${name} !== 'undefined' ? ${name} : undefined\n`
})
_codeToGetIntrinsics += 'x'

Sandbox._host = {
      _intrinsics: eval(_codeToGetIntrinsics) //eslint-disable-line
}

module.exports = Sandbox
