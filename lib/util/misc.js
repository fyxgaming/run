/**
 * misc.js
 *
 * Various helper methods
 */

const { InternalError, TimeoutError } = require('./errors')
const createJSONStringify = require('../sandbox/stringify')
const { _sudo } = require('./admin')
const Creation = require('../kernel/creation')

// ------------------------------------------------------------------------------------------------
// _RESERVED
// ------------------------------------------------------------------------------------------------

// Some methods like auth and destroy are safe to call inside other methods. Therefore, they
// are not reserved. Other methods are not safe in this way. Below are reserved words.

// Not sure exactly how these will be used yet, so setting aside for later
const _RESERVED_PROPS = [
  // Future bindings
  'encryption',
  'blockhash',
  'blocktime',
  'blockheight',

  // Time methods
  'latest',
  'recent',
  'mustBeLatest',
  'mustBeRecent',

  // Control methods
  'recover',
  'replicate',
  'makeBackup',
  'restricts',
  'delegate',
  'consume',
  'eject'
]

const _RESERVED_CODE_METHODS = [
  'toString', // interfers with source code generation
  'upgrade', // upgrade is only supported as a top-level action right now
  'sync', // sync only works externally and as a top-level command
  'destroy', // eventually destroy should not be reserved
  'auth', // eventually auth should not be reserved
  'load', // load is used on jigs and berries and not currently supported on sidekick code
  'init' // Will be used for static initializers in the future
]

const _RESERVED_JIG_METHODS = [
  'sync' // sync only works externally and as a top-level command
]

// Currently there are no reserved berry instance methods
const _RESERVED_BERRY_METHODS = []

// Final properties are properties which cannot be set/deleted/changed in any way
const _FINAL_CODE_PROPS = [..._RESERVED_CODE_METHODS, 'deps']
const _FINAL_JIG_PROPS = [..._RESERVED_JIG_METHODS, 'init'] // destroy and auth are not protected
const _FINAL_BERRY_PROPS = [..._RESERVED_BERRY_METHODS, 'init']

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
  const Sandbox = require('../sandbox/sandbox')
  const Code = require('../kernel/code')
  const SO = Sandbox._intrinsics.Object
  const HO = Sandbox._hostIntrinsics.Object
  const P = Object.getPrototypeOf(T)
  const hasParent = P !== HO.getPrototypeOf(HO) && P !== SO.getPrototypeOf(SO) &&
    P !== Code.prototype
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

      case 'object': {
        if (!x) return 'null'
        if (!x.constructor.name) return '[anonymous object]'
        const Jig = require('../kernel/jig')
        const Berry = require('../kernel/berry')
        const kind = x instanceof Jig ? 'jig' : x instanceof Berry ? 'berry' : 'object'
        return `[${kind} ${x.constructor.name}]`
      }

      case 'function': {
        let src = null
        const Code = require('../kernel/code')
        if (x instanceof Code) {
          src = Code.prototype.toString.apply(x)
        } else {
          const safeToString = typeof x.toString === 'function' && !x.toString.toString().startsWith('class')
          src = safeToString ? x.toString() : Function.prototype.toString.apply(x)
        }

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
    const classDef = /^class\s+[a-zA-Z0-9_$]+\s+extends\s+[a-zA-Z0-9_.$]+\s*{/
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
  const functionMatches = src.match(/^(function\s+)([a-zA-Z0-9$_]+)(\s*)\((.*)/ms)
  if (functionMatches) return `${functionMatches[1]}${functionMatches[3]}(${functionMatches[4]}`

  const classMatches = src.match(/^(class\s+)([a-zA-Z0-9$_]+)(\s*){(.*)/ms)
  if (classMatches) return `${classMatches[1]}${classMatches[3]}{${classMatches[4]}`

  const childMatches = src.match(/^(class\s+)([a-zA-Z0-9$_]+)(\s*)extends(.*)/ms)
  if (childMatches) return `${childMatches[1]}${childMatches[3]}extends${childMatches[4]}`

  throw new Error(`Bad source code: ${src}`)
}

// ------------------------------------------------------------------------------------------------
// _deanonymizeSourceCode
// ------------------------------------------------------------------------------------------------

/**
 * Adds back in the class or function name to source code
 */
function _deanonymizeSourceCode (src, name) {
  // Code that is excluded for code coverage should not be anonymized. Breaks.
  if (require('../sandbox/sandbox')._cover.includes(name)) return src

  const functionMatches = src.match(/^(function\s)(.*)/ms)
  if (functionMatches) return `${functionMatches[1]}${name}${functionMatches[2]}`

  const classMatches = src.match(/^(class\s)(.*)/ms)
  if (classMatches) return `${classMatches[1]}${name}${classMatches[2]}`

  throw new Error(`Bad source code: ${src}`)
}

// ------------------------------------------------------------------------------------------------
// Type detection
// ------------------------------------------------------------------------------------------------

function _basicObject (x) {
  return typeof x === 'object' && !!x && _protoLen(x) === 2
}

// ------------------------------------------------------------------------------------------------

function _basicArray (x) {
  return Array.isArray(x) && _protoLen(x) === 3
}

// ------------------------------------------------------------------------------------------------

function _basicSet (x) {
  const Sandbox = require('../sandbox/sandbox')
  const SI = Sandbox._intrinsics
  const HI = Sandbox._hostIntrinsics
  return (x instanceof HI.Set || x instanceof SI.Set) && _protoLen(x) === 3
}

// ------------------------------------------------------------------------------------------------

function _basicMap (x) {
  const Sandbox = require('../sandbox/sandbox')
  const SI = Sandbox._intrinsics
  const HI = Sandbox._hostIntrinsics
  return (x instanceof HI.Map || x instanceof SI.Map) && _protoLen(x) === 3
}

// ------------------------------------------------------------------------------------------------

function _basicUint8Array (x) {
  const Sandbox = require('../sandbox/sandbox')
  const SI = Sandbox._intrinsics
  const HI = Sandbox._hostIntrinsics
  return (x instanceof HI.Uint8Array || x instanceof SI.Uint8Array) && _protoLen(x) === 4
}

// ------------------------------------------------------------------------------------------------

function _arbitraryObject (x) {
  if (typeof x !== 'object' || !x) return false
  const Code = require('../kernel/code')
  if (!(x.constructor instanceof Code)) return false
  const Jig = require('../kernel/jig')
  if (x instanceof Jig) return false
  const Berry = require('../kernel/berry')
  if (x instanceof Berry) return false
  return true
}

// ------------------------------------------------------------------------------------------------

function _defined (x) {
  return typeof x !== 'undefined'
}

// ------------------------------------------------------------------------------------------------

function _negativeZero (x) {
  // Object.is(x, -0) is not reliable on Firefox
  return x === 0 && 1 / x === -Infinity
}

// ------------------------------------------------------------------------------------------------

function _intrinsic (x) {
  const Sandbox = require('../sandbox/sandbox')
  if (Sandbox._hostIntrinsicSet.has(x)) return true
  if (Sandbox._intrinsicSet.has(x)) return true
  return false
}

// ------------------------------------------------------------------------------------------------

function _serializable (x) {
  const { _deepVisit } = require('./deep')
  let serializable = true
  try {
    _sudo(() => _deepVisit(x, x => { serializable = serializable && _serializableValue(x) }))
  } catch (e) { }
  return serializable
}

// ------------------------------------------------------------------------------------------------

function _serializableValue (x) {
  if (typeof x === 'undefined') return true
  if (typeof x === 'boolean') return true
  if (typeof x === 'number') return true
  if (typeof x === 'string') return true
  if (x === null) return true
  if (_intrinsic(x)) return false
  if (_basicObject(x)) return true
  if (_basicArray(x)) return true
  if (_basicSet(x)) return true
  if (_basicMap(x)) return true
  if (_basicUint8Array(x)) return true
  if (_arbitraryObject(x)) return true
  if (x instanceof Creation) return true
  return false // Symbols, intrinsic, non-code functions, and extended intrinsics
}

// ------------------------------------------------------------------------------------------------

const ANON_CLASS_REGEX = /^class\s*{/
const ANON_CLASS_EXTENDS_REGEX = /^class\s+(extends)?\s+\S+\s*{/
const ANON_FUNCTION_REGEX = /^function\s*\(/

function _anonymous (x) {
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
// _getOwnProperty
// ------------------------------------------------------------------------------------------------

function _getOwnProperty (x, name) {
  if (!x || (typeof x !== 'function' && typeof x !== 'object')) return undefined
  const desc = Object.getOwnPropertyDescriptor(x, name)
  return desc && desc.value
}

// ------------------------------------------------------------------------------------------------
// _hasOwnProperty
// ------------------------------------------------------------------------------------------------

function _hasOwnProperty (x, name) {
  if (!x || (typeof x !== 'function' && typeof x !== 'object')) return false
  if (typeof name === 'string') return Object.getOwnPropertyNames(x).includes(name)
  if (typeof name === 'symbol') return Object.getOwnPropertySymbols(x).includes(name)
}

// ------------------------------------------------------------------------------------------------
// _setOwnProperty
// ------------------------------------------------------------------------------------------------

function _setOwnProperty (x, name, value) {
  let desc = Object.getOwnPropertyDescriptor(x, name)
  if (!desc || desc.get || desc.set) desc = { configurable: true, enumerable: true, writable: true }
  desc.value = value
  Object.defineProperty(x, name, desc)
}

// ------------------------------------------------------------------------------------------------
// _defineGetter
// ------------------------------------------------------------------------------------------------

function _defineGetter (target, name, getter) {
  Object.defineProperty(target, name, {
    get: getter,
    configurable: true,
    enumerable: true
  })
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
// _sameCreation
// ------------------------------------------------------------------------------------------------

function _sameCreation (a, b) {
  const Creation = require('../kernel/creation')
  const { _location } = require('./bindings')

  if (!(a instanceof Creation)) return false
  if (!(b instanceof Creation)) return false

  return _sudo(() => {
    if (a === b) return true

    if (_location(a.origin).error) return false
    if (_location(b.origin).error) return false

    if (a.origin !== b.origin) return false

    if (a.location !== b.location) {
      const ainfo = `${_text(a)}: ${a.location}`
      const binfo = `${_text(b)}: ${b.location}`
      throw new Error(`Inconsistent worldview\n\n${ainfo}\n${binfo}`)
    }

    return true
  })
}

// -------------------------------------------------------------------------------------------------
// _hasCreation
// ------------------------------------------------------------------------------------------------

const _hasCreation = (arr, creation) => arr.some(x => _sameCreation(x, creation))

// -------------------------------------------------------------------------------------------------
// _addCreations
// ------------------------------------------------------------------------------------------------

function _addCreations (a, b) {
  return a.concat(b.filter(x => !_hasCreation(a, x)))
}

// -------------------------------------------------------------------------------------------------
// _subtractCreations
// ------------------------------------------------------------------------------------------------

function _subtractCreations (a, b) {
  return a.filter(x => !_hasCreation(b, x))
}

// ------------------------------------------------------------------------------------------------
// _limit
// ------------------------------------------------------------------------------------------------

function _limit (limit, name = 'limit') {
  if (limit === null) return Number.MAX_VALUE
  if (limit === -1) return Number.MAX_VALUE
  if (limit === Infinity) return Number.MAX_VALUE
  if (typeof limit !== 'number' || limit < 0) throw new Error(`Invalid ${name}: ${_text(limit)}`)
  return limit
}

// -------------------------------------------------------------------------------------------------
// _Timeout
// ------------------------------------------------------------------------------------------------

// A object that can track an operation's duration across multiple methods.
// _check() should be called periodically after every long-running or async operation.
class _Timeout {
  constructor (method, timeout = _kernel()._timeout) {
    this._start = new Date()
    this._method = method
    this._timeout = timeout
  }

  _check () {
    if (new Date() - this._start > _limit(this._timeout, 'timeout')) {
      throw new TimeoutError(`${this._method} timeout`)
    }
  }
}

// ------------------------------------------------------------------------------------------------
// _deterministicJSONStringify
// ------------------------------------------------------------------------------------------------

// The JSON.stringify method uses Object.keys() to order its keys. Key order is non-deterministic
// in ES2015 using Object.keys() [1], so JSON.stringify is too. This is bad. We'ved tried various
// approaches to keep order intact, but ultimately it seemed simpler to just canonically order
// keys, in this case alphabetically.
//
// In 2020, key order is deterministic to spec on Node, Chrome, Firefox, and Edge. In Safari, it is
// mostly correct, but using proxies it still returns wrong values. Run uses proxies.
//
// [1] https://stackoverflow.com/questions/30076219/does-es6-introduce-a-well-defined-order-of-enumeration-for-object-properties

const _deterministicJSONStringify = createJSONStringify(_deterministicCompareKeys)

// ------------------------------------------------------------------------------------------------
// _deterministicObjectKeys
// ------------------------------------------------------------------------------------------------

// Object.keys() is not deterministic. Object.getOwnPropertyNames() is deterministic but returns
// non-enumerable properties. We create a safe version of Object.keys() that is deterministic.

function _deterministicObjectKeys (x) {
  return Object.keys(x).sort(_deterministicCompareKeys)
}

// ------------------------------------------------------------------------------------------------
// _deterministicCompareKeys
// ------------------------------------------------------------------------------------------------

function _deterministicCompareKeys (a, b) {
  if (typeof a !== typeof b) return typeof a === 'symbol' ? 1 : -1
  if (typeof a === 'symbol') a = a.toString()
  if (typeof b === 'symbol') b = b.toString()
  const aInt = parseInt(a)
  const bInt = parseInt(b)
  const aIsInteger = aInt.toString() === a
  const bIsInteger = bInt.toString() === b
  if (aIsInteger && !bIsInteger) return -1
  if (bIsInteger && !aIsInteger) return 1
  if (aIsInteger && bIsInteger) return aInt - bInt
  return a < b ? -1 : b < a ? 1 : 0
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _RESERVED_PROPS,
  _RESERVED_CODE_METHODS,
  _RESERVED_JIG_METHODS,
  _RESERVED_BERRY_METHODS,
  _FINAL_CODE_PROPS,
  _FINAL_JIG_PROPS,
  _FINAL_BERRY_PROPS,
  _kernel,
  _assert,
  _bsvNetwork,
  _parent,
  _parentName,
  _extendsFrom,
  _text,
  _sandboxSourceCode,
  _anonymizeSourceCode,
  _deanonymizeSourceCode,
  _basicObject,
  _basicArray,
  _basicSet,
  _basicMap,
  _basicUint8Array,
  _arbitraryObject,
  _defined,
  _negativeZero,
  _intrinsic,
  _serializable,
  _serializableValue,
  _anonymous,
  _protoLen,
  _getOwnProperty,
  _hasOwnProperty,
  _setOwnProperty,
  _defineGetter,
  _ownGetters,
  _ownMethods,
  _sameCreation,
  _hasCreation,
  _addCreations,
  _subtractCreations,
  _limit,
  _Timeout,
  _deterministicJSONStringify,
  _deterministicObjectKeys,
  _deterministicCompareKeys
}
