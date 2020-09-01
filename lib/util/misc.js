/**
 * misc.js
 *
 * Various helper methods
 */

const { ArgumentError, StateError, InternalError } = require('./errors')
const { _sudo } = require('./admin')
const Universal = require('../kernel/universal')

// ------------------------------------------------------------------------------------------------
// _kernel
// ------------------------------------------------------------------------------------------------

/**
 * Returns the active kernel
 */
function _kernel () {
  const Kernel = require('../kernel/kernel')
  if (!Kernel._instance) throw new Error('Run instance not active')
  return Kernel._instance
}

// ------------------------------------------------------------------------------------------------
// _assert
// ------------------------------------------------------------------------------------------------

/**
 * Internal assertion that is expected to be true.
 */
function _assert (condition) {
  if (!condition) throw new InternalError('assert failed')
}

// ------------------------------------------------------------------------------------------------
// _checkArgument
// ------------------------------------------------------------------------------------------------

function _checkArgument (condition, reason) {
  if (!condition) throw new ArgumentError(reason)
}

// ------------------------------------------------------------------------------------------------
// _checkState
// ------------------------------------------------------------------------------------------------

function _checkState (condition, reason) {
  if (!condition) throw new StateError(reason)
}

// ------------------------------------------------------------------------------------------------
// _bsvNetwork
// ------------------------------------------------------------------------------------------------

/**
 * Gets a bsv library network string from a Run network string
 *
 * All networks that start with 'main' are considered mainnet. Everything else is testnet. This
 * lets us have potentially many "testnet" networks - ie. stn, mock, dev - that are clearly
 * distinct from mainnets. There might be multiple "mainnet" networks too if we have a hybrid
 * on-chain and off-chain system such as Overpool, which could be, for example, 'main-overpool'.
 * @param {string} network Run network string
 */
function _bsvNetwork (network) {
  return network.startsWith('main') ? 'mainnet' : 'testnet'
}

// ------------------------------------------------------------------------------------------------
// _parent
// ------------------------------------------------------------------------------------------------

/**
 * Gets the parent class of T, or undefined if none exists
 */
function _parent (T) {
  if (typeof T !== 'function') return
  const Sandbox = require('./sandbox')
  const Code = require('../kernel/code')
  const SO = Sandbox._intrinsics.Object
  const HO = Sandbox._hostIntrinsics.Object
  const P = Object.getPrototypeOf(T)
  const hasParent = P !== HO.getPrototypeOf(HO) && P !== SO.getPrototypeOf(SO) && P !== Code.prototype
  if (hasParent) return P
}

// ------------------------------------------------------------------------------------------------
// _parentName
// ------------------------------------------------------------------------------------------------

/**
 * Gets the parent class name out of the source code, or null if there is no parent
 */
function _parentName (src) {
  const parentRegex = /^\s*class\s+[a-zA-Z0-9_$]+\s+extends\s+([a-zA-Z0-9_$]+)\s*{/
  const parentMatch = src.match(parentRegex)
  return parentMatch && parentMatch[1]
}

// ------------------------------------------------------------------------------------------------
// _extendsFrom
// ------------------------------------------------------------------------------------------------

/**
 * Returns whether A extends from B somewhere in its class chain
 */
function _extendsFrom (A, B) {
  while (A) {
    A = Object.getPrototypeOf(A)
    if (A === B) return true
  }
  return false
}

// ------------------------------------------------------------------------------------------------
// _text
// ------------------------------------------------------------------------------------------------

/*
 * Converts any value into a short string form usable in error messages and logs.
 * @param {*} x Value to stringify
 */
function _text (x) {
  return _sudo(() => {
    switch (typeof x) {
      case 'string': return `"${x.length > 20 ? x.slice(0, 20) + '…' : x}"`

      case 'object':
        if (!x) return 'null'
        if (!x.constructor.name) return '[anonymous object]'
        return `[object ${x.constructor.name}]`

      case 'function': {
        const safeToString = typeof x.toString === 'function' && !x.toString.toString().startsWith('class')
        const src = safeToString ? x.toString() : Function.prototype.toString.apply(x)

        const isAnonymousFunction =
          /^\(/.test(src) || // () => {}
          /^function\s*\(/.test(src) || // function() {}
          /^[a-zA-Z0-9_$]+\s*=>/.test(src) // x => x

        if (isAnonymousFunction) return '[anonymous function]'
        const isAnonymousClass = /^class\s*{/.test(src)
        if (isAnonymousClass) return '[anonymous class]'

        return x.name
      }

      case 'undefined': return 'undefined'

      default: return x.toString()
    }
  })
}

// ------------------------------------------------------------------------------------------------
// _sandboxSourceCode
// ------------------------------------------------------------------------------------------------

/**
 * Transforms class or function source code that is safe to be evaluted in a sandbox.
 *
 * For classes, if T is a class that extends another class, we make sure the parent class name in
 * the extends expression is the actual name of the parent class, because sometimes the code will
 * be "class X extends SomeLibrary.Y" and what is deployed should be "class X extends Y", or an
 * obfuscator will change the variable name.
 *
 * For functions, Safari sometimes ignores the "function" keyword when printing method calls. We
 * add that back in so that we always can parse the code.
 *
 * Lastly, this may still return slightly different results in different environments, usually
 * related to line returns and whitespace. Functionally though, according to the spec, the code
 * should be the same.
 */
function _sandboxSourceCode (src, T) {
  const Parent = Object.getPrototypeOf(T)

  if (Parent.prototype) {
    const classDef = /^class\s+\S+\s+extends\s+\S+\s*{/
    return src.replace(classDef, `class ${T.name} extends ${Parent.name} {`)
  }

  const methodMatch = src.match(/^([a-zA-Z0-9_$]+)\s*\(/)
  if (methodMatch && methodMatch[1] !== 'function') return `function ${src}`

  return src
}

// ------------------------------------------------------------------------------------------------
// _anonymizeSourceCode
// ------------------------------------------------------------------------------------------------

/**
 * Strip out the class or function name from source code
 */
function _anonymizeSourceCode (src) {
  const functionMatch = src.match(/^function\s+\S+\s*\(/)
  if (functionMatch) return src.replace(functionMatch, 'function (')

  const classMatch = src.match(/^class\s+\S+\s*\{/)
  if (classMatch) return src.replace(classMatch, 'class {')

  const childClassMatch = src.match(/^class\s+\S+\s+extends/)
  if (childClassMatch) return src.replace(childClassMatch, 'class extends')

  throw new Error(`Bad source code: ${src}`)
}

// ------------------------------------------------------------------------------------------------
// _deanonymizeSourceCode
// ------------------------------------------------------------------------------------------------

/**
 * Adds back in the class or function name to source code
 */
function _deanonymizeSourceCode (src, T) {
  const functionMatch = src.match(/^function\s+/)
  if (functionMatch) return src.replace(functionMatch, `function ${T.name} `)

  const classMatch = src.match(/^class\s+/)
  if (classMatch) return src.replace(classMatch, `class ${T.name} `)

  throw new Error(`Bad source code: ${src}`)
}

// ------------------------------------------------------------------------------------------------
// Type detection
// ------------------------------------------------------------------------------------------------

function _isBasicObject (x) {
  return typeof x === 'object' && !!x && _protoLen(x) === 2
}

// ------------------------------------------------------------------------------------------------

function _isBasicArray (x) {
  return Array.isArray(x) && _protoLen(x) === 3
}

// ------------------------------------------------------------------------------------------------

function _isBasicSet (x) {
  const Sandbox = require('./sandbox')
  const SI = Sandbox._intrinsics
  const HI = Sandbox._hostIntrinsics
  return (x instanceof HI.Set || x instanceof SI.Set) && _protoLen(x) === 3
}

// ------------------------------------------------------------------------------------------------

function _isBasicMap (x) {
  const Sandbox = require('./sandbox')
  const SI = Sandbox._intrinsics
  const HI = Sandbox._hostIntrinsics
  return (x instanceof HI.Map || x instanceof SI.Map) && _protoLen(x) === 3
}

// ------------------------------------------------------------------------------------------------

function _isBasicUint8Array (x) {
  const Sandbox = require('./sandbox')
  const SI = Sandbox._intrinsics
  const HI = Sandbox._hostIntrinsics
  return (x instanceof HI.Uint8Array || x instanceof SI.Uint8Array) && _protoLen(x) === 4
}

// ------------------------------------------------------------------------------------------------

function _isArbitraryObject (x) {
  if (typeof x !== 'object' || !x) return false

  const Code = require('../kernel/code')
  const Jig = require('../kernel/jig')
  const Berry = require('../kernel/berry')

  if (!(x.constructor instanceof Code)) return false
  if (x instanceof Jig) return false
  if (x instanceof Berry) return false

  return true
}

// ------------------------------------------------------------------------------------------------

function _isUndefined (x) {
  return typeof x === 'undefined'
}

// ------------------------------------------------------------------------------------------------

function _isBoolean (x) {
  return typeof x === 'boolean'
}

// ------------------------------------------------------------------------------------------------

function _isIntrinsic (x) {
  const Sandbox = require('./sandbox')
  if (Sandbox._hostIntrinsicSet.has(x)) return true
  if (Sandbox._intrinsicSet.has(x)) return true
  return false
}

// ------------------------------------------------------------------------------------------------

function _isSerializable (x) {
  const isSerializableValue = x => {
    if (typeof x === 'undefined') return true
    if (typeof x === 'boolean') return true
    if (typeof x === 'number') return true
    if (typeof x === 'string') return true
    if (x === null) return true
    if (_isIntrinsic(x)) return false
    if (_isBasicObject(x)) return true
    if (_isBasicArray(x)) return true
    if (_isBasicSet(x)) return true
    if (_isBasicMap(x)) return true
    if (_isBasicUint8Array(x)) return true
    if (_isArbitraryObject(x)) return true
    if (x instanceof Universal) return true
    return false // Symbols, intrinsic, non-code functions, and extended intrinsics
  }

  const { _deepVisit } = require('./deep')
  let serializable = true
  try { _deepVisit(x, x => { serializable = serializable && isSerializableValue(x) }) } catch (e) { }
  return serializable
}

// ------------------------------------------------------------------------------------------------

const ANON_CLASS_REGEX = /^class\s*{/
const ANON_CLASS_EXTENDS_REGEX = /^class\s+(extends)?\s+\S+\s*{/
const ANON_FUNCTION_REGEX = /^function\s*\(/

function _isAnonymous (x) {
  if (typeof x !== 'function') return false
  if (!x.name) return true
  const s = x.toString()
  if (!s.startsWith('class') && !s.startsWith('function')) return true
  return ANON_CLASS_REGEX.test(s) || ANON_CLASS_EXTENDS_REGEX.test(s) || ANON_FUNCTION_REGEX.test(s)
}

// ------------------------------------------------------------------------------------------------

/**
 * Gets the length of the prototype chain
 */
function _protoLen (x) {
  if (!x) return 0
  let n = 0
  do {
    n++
    x = Object.getPrototypeOf(x)
  } while (x)
  return n
}

// ------------------------------------------------------------------------------------------------
// _hasOwnProperty
// ------------------------------------------------------------------------------------------------

function _hasOwnProperty (x, name) {
  return Object.getOwnPropertyNames(x).includes(name)
}

// ------------------------------------------------------------------------------------------------
// _setOwnProperty
// ------------------------------------------------------------------------------------------------

function _setOwnProperty (x, name, value) {
  const options = { enumerable: true, configurable: true, writable: true, value }
  Object.defineProperty(x, name, options)
}

// ------------------------------------------------------------------------------------------------
// _ownGetters
// ------------------------------------------------------------------------------------------------

function _ownGetters (x) {
  return Object.getOwnPropertyNames(x)
    .concat(Object.getOwnPropertySymbols(x))
    .filter(prop => Object.getOwnPropertyDescriptor(x, prop).get)
}

// ------------------------------------------------------------------------------------------------
// _ownMethods
// ------------------------------------------------------------------------------------------------

function _ownMethods (x) {
  return Object.getOwnPropertyNames(x)
    .concat(Object.getOwnPropertySymbols(x))
    .filter(prop => prop !== 'constructor')
    .filter(prop => typeof Object.getOwnPropertyDescriptor(x, prop).value === 'function')
}

// ------------------------------------------------------------------------------------------------
// _sameJig
// ------------------------------------------------------------------------------------------------

function _sameJig (a, b) {
  const { _location } = require('./bindings')

  return _sudo(() => {
    if (a === b) return true
    if (_location(a.origin).error) return false
    if (_location(b.origin).error) return false
    if (a.origin !== b.origin) return false
    if (a.location !== b.location) throw new Error('Inconsistent worldview')
    return true
  })
}

// -------------------------------------------------------------------------------------------------
// _hasJig
// ------------------------------------------------------------------------------------------------

const _hasJig = (arr, jig) => arr.some(x => _sameJig(x, jig))

// -------------------------------------------------------------------------------------------------
// _addJigs
// ------------------------------------------------------------------------------------------------

function _addJigs (a, b) {
  return a.concat(b.filter(x => !_hasJig(a, x)))
}

// -------------------------------------------------------------------------------------------------
// _subtractJigs
// ------------------------------------------------------------------------------------------------

function _subtractJigs (a, b) {
  return a.filter(x => !_hasJig(b, x))
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _kernel,
  _assert,
  _checkArgument,
  _checkState,
  _bsvNetwork,
  _parent,
  _parentName,
  _extendsFrom,
  _text,
  _sandboxSourceCode,
  _anonymizeSourceCode,
  _deanonymizeSourceCode,
  _isBasicObject,
  _isBasicArray,
  _isBasicSet,
  _isBasicMap,
  _isBasicUint8Array,
  _isArbitraryObject,
  _isUndefined,
  _isBoolean,
  _isSerializable,
  _isAnonymous,
  _protoLen,
  _hasOwnProperty,
  _setOwnProperty,
  _ownGetters,
  _ownMethods,
  _sameJig,
  _hasJig,
  _addJigs,
  _subtractJigs
}
