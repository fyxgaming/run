/**
 * intrinsics.js
 *
 * Helpers for the built-in objects in JavaScript
 */

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

const _hostIntrinsics = eval(_codeToGetIntrinsics) // eslint-disable-line

module.exports = { _codeToGetIntrinsics, _hostIntrinsics }
