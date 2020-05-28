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

  const sandbox = require('./sandbox')._instance
  const HI = sandbox._hostIntrinsics
  const SI = sandbox._intrinsics
  const HIS = sandbox._hostIntrinsicSet
  const SIS = sandbox._intrinsicSet
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

  const sandbox = require('./sandbox')._instance
  const HI = sandbox._hostIntrinsics
  const SI = sandbox._intrinsics
  const HIS = sandbox._hostIntrinsicSet
  const SIS = sandbox._intrinsicSet
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

module.exports = { _deepVisit, _deepReplace }
