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
 * Deeply traverses an object, replacing objects with new objects, before traversing
 *
 * Callback is passed and object, and returns a new object.
 */
function _deepReplace (x, callback, visited = new Set()) {
  if ((typeof x !== 'function' && typeof x !== 'object') || !x) return
  _deepReplaceSubObjects(x, callback, visited)
}

function _deepReplaceSubObjects (x, callback, visited) {
  if (!x) return
  if (visited.has(x)) return
  visited.add(x)

  const visit = value => {
    if ((typeof value !== 'function' && typeof value !== 'object') || !value) return value
    const inner = callback(value)
    _deepReplaceSubObjects(inner, callback, visited)
    return inner
  }

  const sandbox = require('./sandbox')._instance
  const sandboxIntrinsics = sandbox._intrinsics
  const hostIntrinsics = sandbox._hostIntrinsics

  // Traverse set entries
  if (x instanceof sandboxIntrinsics.Set || (x instanceof hostIntrinsics.Set)) {
    const deletes = []
    const adds = []
    for (const value of x) {
      const newValue = visit(value)
      if (newValue !== value) {
        deletes.push(value)
        adds.push(newValue)
      }
      deletes.forEach(value => x.delete(value))
      adds.forEach(value => x.add(value))
    }
  }

  // Traverse map keys and values
  if (x instanceof sandboxIntrinsics.Map || (x instanceof hostIntrinsics.Map)) {
    const deletes = []
    const sets = []
    for (const [key, value] of x) {
      const newKey = visit(key)
      const newValue = visit(value)
      if (newKey !== key) deletes.push(key)
      if (newKey !== key || newValue !== value) sets.push([newKey, newValue])
    }
    deletes.forEach(key => {
      x.delete(key)
    })
    sets.forEach(([key, value]) => x.set(key, value))
  }

  // Traverse standard properties
  Object.keys(x).forEach(key => { x[key] = visit(x[key]) })
}
// ------------------------------------------------------------------------------------------------

module.exports = { _deepVisit, _deepReplace }
