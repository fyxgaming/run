/**
 * deep.js
 *
 * Deep object inspection and processing
 */

// ------------------------------------------------------------------------------------------------
// _deepVisit
// ------------------------------------------------------------------------------------------------

/**
 * Deeply traverses an object, calling the callback for every internal object and function,
 * including the object itself.
 *
 * This will traverse not just an object's properties, but also the class it belongs to, and
 * internal properties on sets and maps.
 *
 * Callbacks should return true or false for whether to dive down deeper.
 *
 * @param {*} x Object to traverse
 * @param {function} callback Callback for each object
 */
function _deepVisit (x, callback, visited = new Set()) {
  if ((typeof x !== 'function' && typeof x !== 'object') || !x) return

  if (visited.has(x)) return
  visited.add(x)

  if (callback(x) === false) return

  const Sandbox = require('./sandbox')
  const HI = Sandbox._hostIntrinsics
  const SI = Sandbox._intrinsics
  const HIS = Sandbox._hostIntrinsicSet
  const SIS = Sandbox._intrinsicSet
  const HO = HI.Object
  const SO = SI.Object

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
}

// ------------------------------------------------------------------------------------------------
// _deepReplace
// ------------------------------------------------------------------------------------------------

/**
 * Deeply traverses an object, replacing objects and functions in-place with new objects and
 * functions before traversing deeper.
 *
 * Callback is passed an object and returns a new object.
 *
 * @param {*} x Object to traverse
 * @param {function} callback Callback for each object
 * @returns {*} Replaced object
 */
function _deepReplace (x, callback, visited = new Map()) {
  if ((typeof x !== 'function' && typeof x !== 'object') || !x) return x

  if (visited.has(x)) return visited.get(x)

  const x2 = callback(x) || x
  visited.set(x, x2)

  if ((typeof x2 !== 'function' && typeof x2 !== 'object') || !x2) return x2

  const Sandbox = require('./sandbox')
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
      entries[i] = _deepReplace(entries[i], callback, visited)
    }
    x2.clear()
    entries.forEach(y => x2.add(y))
  }

  // Traverse map entries
  if (x2 instanceof HI.Map || (x2 instanceof SI.Map)) {
    const entries = Array.from(x2)
    for (let i = 0; i < entries.length; i++) {
      entries[i][0] = _deepReplace(entries[i][0], callback, visited)
      entries[i][1] = _deepReplace(entries[i][1], callback, visited)
    }
    x2.clear()
    entries.forEach(entry => x2.set(entry[0], entry[1]))
  }

  // Traverse standard properties
  Object.keys(x2).forEach(key => {
    x2[key] = _deepReplace(x2[key], callback, visited)
  })

  // Traverse the constructor
  if (typeof x2 === 'object' && !HIS.has(x2.constructor) && !SIS.has(x2.constructor)) {
    const X = _deepReplace(x2.constructor, callback, visited)
    Object.setPrototypeOf(x2, X.prototype)
  }

  // Traverse the parent
  const X = Object.getPrototypeOf(x2)
  if (typeof x2 === 'function' && X !== HO.getPrototypeOf(HO) && X !== SO.getPrototypeOf(SO)) {
    const Y = _deepReplace(X, callback, visited)
    Object.setPrototypeOf(x2, Y)
    Object.setPrototypeOf(x2.prototype, Y.prototype)
  }

  return x2
}

// ------------------------------------------------------------------------------------------------

/**
 * Deeply clones an object, replacing all internal objects with new clones.
 *
 * Resources are not cloned however. Any functions are converted to Code jigs, and Jigs and Berry
 * objects are left intact. This is because resources are designed to cross sandboxes.
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
 *    - Jigs (code and object)
 *
 * @param {object|function} x Object to clone
 * @param {?object} intrinsics Output intrinsics. Defaults to host intrinsics.
 * @returns {object|function} Cloned version of x
 */
function _deepClone (x, intrinsics, visited = new Map()) {
  if ((typeof x !== 'function' && typeof x !== 'object') || !x) return x

  if (visited.has(x)) return visited.get(x)

  const Sandbox = require('./sandbox')
  const Code = require('../kernel/v2/code')
  const { Jig } = require('../kernel/jig')
  const { Berry } = require('../kernel/berry')

  const HI = Sandbox._hostIntrinsics
  const SI = Sandbox._intrinsics
  const HIS = Sandbox._hostIntrinsicSet
  const SIS = Sandbox._intrinsicSet

  intrinsics = intrinsics || HI

  if (typeof x === 'function') {
    const y = new Code(x)
    visited.set(x, y)
    return y
  }

  if (x instanceof Jig || x instanceof Berry) {
    return x
  }

  let y = null

  const protoLen = x => { if (!x) return 0; let n = 0; do { n++; x = Object.getPrototypeOf(x) } while (x); return n }
  const isBasicObject = x => x && protoLen(x) === 2
  const isBasicArray = x => Array.isArray(x) && protoLen(x) === 3

  if (isBasicArray(x)) {
    y = new intrinsics.Array()
  }

  if (isBasicObject(x)) {
    y = new intrinsics.Object()
  }

  if (x instanceof HI.Uint8Array || x instanceof SI.Uint8Array) {
    return new intrinsics.Uint8Array(intrinsics.Array.from(x))
  }

  if (x instanceof HI.Set || x instanceof SI.Set) {
    y = new intrinsics.Set()
  }

  if (x instanceof HI.Map || x instanceof SI.Map) {
    y = new intrinsics.Map()
  }

  if (!y) {
    y = new intrinsics.Object()
  }

  visited.set(x, y)

  // Clone set entries
  if (y instanceof intrinsics.Set) {
    for (const entry of x) {
      const clonedEntry = _deepClone(entry, intrinsics, visited)
      y.add(clonedEntry)
    }
  }

  // Clone map entries
  if (y instanceof intrinsics.Map) {
    for (const entry of x) {
      const key = _deepClone(entry[0], intrinsics, visited)
      const value = _deepClone(entry[0], intrinsics, visited)
      y.set(key, value)
    }
  }

  // Clone standard properties
  Object.keys(x).forEach(key => {
    y[key] = _deepClone(x[key], intrinsics, visited)
  })

  // Clone the arbitrary object's class
  if (!HIS.has(x.constructor) && !SIS.has(x.constructor)) {
    const Y = _deepClone(x.constructor, intrinsics, visited)
    Object.setPrototypeOf(y, Y.prototype)
  }

  return y
}

// ------------------------------------------------------------------------------------------------

module.exports = { _deepVisit, _deepReplace, _deepClone }
