/**
 * deep.js
 *
 * Deep object inspection and processing
 */

const { _isBasicArray, _isBasicObject, _text, _isBasicSet, _isBasicMap, _isBasicUint8Array, _isArbitraryObject, _checkState, _sameJig } = require('./misc')
const { _sudo } = require('./admin')
const Sandbox = require('./sandbox')
const HI = Sandbox._hostIntrinsics
const SI = Sandbox._intrinsics
const HIS = Sandbox._hostIntrinsicSet
const SIS = Sandbox._intrinsicSet
const HO = HI.Object
const SO = SI.Object
const Universal = require('../kernel/universal')

// ------------------------------------------------------------------------------------------------
// _deepVisit
// ------------------------------------------------------------------------------------------------

/**
 * Deeply traverses an object, calling the callback for every internal object and function,
 * including the object itself.
 *
 * This will traverse not just an object's properties, but also the class it belongs to, and
 * internal properties on sets and maps. It will not however traverse class prototype objects.
 *
 * Callbacks should return true or false for whether to dive down deeper.
 *
 * @param {*} x Object to traverse
 * @param {function} callback Callback for each object
 */
function _deepVisit (x, callback, visited = new Set()) {
  return _sudo(() => {
    if ((typeof x !== 'function' && typeof x !== 'object') || !x) {
      callback(x)
      return
    }

    if (visited.has(x)) return
    visited.add(x)

    if (callback(x) === false) return

    // Traverse set entries
    if (x instanceof HI.Set || x instanceof SI.Set) {
      for (const y of x) {
        _deepVisit(y, callback, visited)
      }
    }

    // Traverse map keys and values
    if (x instanceof HI.Map || x instanceof SI.Map) {
      for (const [key, value] of x) {
        _deepVisit(key, callback, visited)
        _deepVisit(value, callback, visited)
      }
    }

    // Traverse standard properties
    Object.keys(x).forEach(key => {
      _deepVisit(x[key], callback, visited)
    })

    // Traverse the constructor
    if (typeof x === 'object' && !HIS.has(x.constructor) && !SIS.has(x.constructor)) {
      _deepVisit(x.constructor, callback, visited)
    }

    // Traverse the parent
    const X = Object.getPrototypeOf(x)
    if (typeof x === 'function' && X !== HO.getPrototypeOf(HO) && X !== SO.getPrototypeOf(SO)) {
      _deepVisit(X, callback, visited)
    }
  })
}

// ------------------------------------------------------------------------------------------------
// _deepReplace
// ------------------------------------------------------------------------------------------------

/**
 * Deeply traverses an object, replacing objects and functions in-place with new objects and
 * functions before traversing deeper. Replaced objects are also traversed.
 *
 * Callback is passed an object and returns a new object.
 *
 * @param {*} x Object to traverse
 * @param {function} replacer Callback to replace each object
 * @returns {*} Replaced object
 */
function _deepReplace (x, replacer, visited = new Map()) {
  if ((typeof x !== 'function' && typeof x !== 'object') || !x) return x

  if (visited.has(x)) return visited.get(x)

  const x2 = replacer(x) || x
  visited.set(x, x2)

  if ((typeof x2 !== 'function' && typeof x2 !== 'object') || !x2) return x2

  const Sandbox = require('./sandbox')
  const Code = require('../kernel/code')
  const HI = Sandbox._hostIntrinsics
  const SI = Sandbox._intrinsics
  const HIS = Sandbox._hostIntrinsicSet
  const SIS = Sandbox._intrinsicSet
  const HO = HI.Object
  const SO = SI.Object

  // Traverse set entries
  if (x2 instanceof HI.Set || x2 instanceof SI.Set) {
    const entries = Array.from(x2)
    for (let i = 0; i < entries.length; i++) {
      entries[i] = _deepReplace(entries[i], replacer, visited)
    }
    x2.clear()
    entries.forEach(y => x2.add(y))
  }

  // Traverse map entries
  if (x2 instanceof HI.Map || (x2 instanceof SI.Map)) {
    const entries = Array.from(x2)
    for (let i = 0; i < entries.length; i++) {
      entries[i][0] = _deepReplace(entries[i][0], replacer, visited)
      entries[i][1] = _deepReplace(entries[i][1], replacer, visited)
    }
    x2.clear()
    entries.forEach(entry => x2.set(entry[0], entry[1]))
  }

  // Traverse standard properties
  Object.keys(x2).forEach(key => {
    x2[key] = _deepReplace(x2[key], replacer, visited)
  })

  // Traverse the constructor
  if (typeof x2 === 'object' && !HIS.has(x2.constructor) && !SIS.has(x2.constructor)) {
    const X = _deepReplace(x2.constructor, replacer, visited)
    if (Object.getPrototypeOf(x2) !== X.prototype) Object.setPrototypeOf(x2, X.prototype)
  }

  // Traverse the parent
  const X = Object.getPrototypeOf(x2)
  if (typeof x2 === 'function' && X !== HO.getPrototypeOf(HO) && X !== SO.getPrototypeOf(SO)) {
    // Replace the parent class
    const Y = _deepReplace(X, replacer, visited)
    if (X !== Y) {
      Object.setPrototypeOf(x2, Y)

      // Code jigs have two prototypes for every class
      const x2proto = x2 instanceof Code ? Object.getPrototypeOf(x2.prototype) : x2.prototype
      Object.setPrototypeOf(x2proto, Y.prototype)
    }
  }

  return x2
}

// ------------------------------------------------------------------------------------------------
// _deepClone
// ------------------------------------------------------------------------------------------------

/**
 * Deeply clones an object, replacing all internal objects with new clones.
 *
 * Universal jigs are not cloned but passed through. This is because they are designed to cross
 * sandbox boundaries and also because they are unique objects.
 *
 * The datatypes that are cloneable are the same as those that are serializable. They are:
 *
 *    - Primitive types (number, string, boolean, null)
 *    - Basic objects
 *    - Basic arrays
 *    - Sets
 *    - Maps
 *    - Uint8Array
 *    - Arbitrary objects
 *    - Universal Jigs: Jig, Code, Berry
 *
 * @param {object|function} x Object to clone
 * @param {?object} intrinsics Output intrinsics. Defaults to host intrinsics.
 * @returns {object|function} Cloned version of x
 */
function _deepClone (x, intrinsics, replacer, visited = new Map()) {
  if (typeof x === 'symbol') throw new Error(`Cannot clone: ${_text(x)}`)
  if ((typeof x !== 'function' && typeof x !== 'object') || !x) return x

  if (visited.has(x)) return visited.get(x)

  if (replacer) {
    const y = replacer(x)
    if (y) {
      visited.set(x, y)
      return y
    }
  }

  const Sandbox = require('./sandbox')
  const Universal = require('../kernel/universal')

  const HI = Sandbox._hostIntrinsics
  const HIS = Sandbox._hostIntrinsicSet
  const SIS = Sandbox._intrinsicSet

  intrinsics = intrinsics || HI

  if (x instanceof Universal) return x

  if (typeof x === 'function') {
    throw new Error(`Cannot clone non-code function: ${_text(x)}`)
  }

  if (HIS.has(x) || SIS.has(x)) {
    throw new Error(`Cannot clone intrinsic: ${_text(x)}`)
  }

  let y = null

  if (_isBasicArray(x)) {
    y = new intrinsics.Array()
  }

  if (_isBasicObject(x)) {
    y = new intrinsics.Object()
  }

  if (_isBasicUint8Array(x)) {
    return new intrinsics.Uint8Array(intrinsics.Array.from(x))
  }

  if (_isBasicSet(x)) {
    y = new intrinsics.Set()
  }

  if (_isBasicMap(x)) {
    y = new intrinsics.Map()
  }

  // Fall through case. We will act as if it's an arbitrary object until the end.
  let arbitraryObject = false
  if (!y) {
    arbitraryObject = true
    y = new intrinsics.Object()
  }

  if (!y) throw new Error(`Cannot clone: ${_text(x)}`)

  visited.set(x, y)

  // Clone set entries
  if (y instanceof intrinsics.Set) {
    for (const entry of x) {
      const clonedEntry = _deepClone(entry, intrinsics, replacer, visited)
      y.add(clonedEntry)
    }
  }

  // Clone map entries
  if (y instanceof intrinsics.Map) {
    for (const entry of x) {
      const key = _deepClone(entry[0], intrinsics, replacer, visited)
      const value = _deepClone(entry[1], intrinsics, replacer, visited)
      y.set(key, value)
    }
  }

  // Clone standard properties
  Object.keys(x).forEach(key => {
    if (typeof key === 'symbol') throw new Error(`Cannot clone: ${_text(key)}`)
    y[key] = _deepClone(x[key], intrinsics, replacer, visited)
  })

  // Clone the arbitrary object's class
  if (!HIS.has(x.constructor) && !SIS.has(x.constructor)) {
    const Y = _deepClone(x.constructor, intrinsics, replacer, visited)
    Object.setPrototypeOf(y, Y.prototype)
  }

  if (arbitraryObject) _checkState(_isArbitraryObject(y), `Cannot clone: ${_text(x)}`)

  return y
}

// ------------------------------------------------------------------------------------------------
// _deepEqual
// ------------------------------------------------------------------------------------------------

function _deepEqual (a, b) {
  if (typeof a !== typeof b) return false
  if (typeof a === 'number' && isNaN(a) && isNaN(b)) return true

  if (a instanceof Universal) {
    if (!(b instanceof Universal)) return false
    if (!_sameJig(a, b)) return false
    return true
  }

  if (typeof a !== 'object' || !a || !b) return a === b

  const aKeys = Array.from(Object.keys(a))
  const bKeys = Array.from(Object.keys(b))
  if (aKeys.length !== bKeys.length) return false
  if (aKeys.some(key => !_deepEqual(a[key], b[key]))) return false

  if (_isBasicObject(a)) {
    if (!_isBasicObject(b)) return false
    return true
  }

  if (_isBasicArray(a)) {
    if (!_isBasicArray(b)) return false
    return true
  }

  if (_isBasicSet(a)) {
    if (!_isBasicSet(b)) return false
    if (a.size !== b.size) return false
    if (!_deepEqual(Array.from(a.entries()), Array.from(b.entries()))) return false
    return true
  }

  if (_isBasicMap(a)) {
    if (!_isBasicMap(b)) return false
    if (a.size !== b.size) return false
    if (!_deepEqual(Array.from(a.entries()), Array.from(b.entries()))) return false
    return true
  }

  if (_isBasicUint8Array(a)) {
    if (!_isBasicUint8Array(b)) return false
    return true
  }

  throw new Error(`Unsupported: ${a}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = { _deepVisit, _deepReplace, _deepClone, _deepEqual }
