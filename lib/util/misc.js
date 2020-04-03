/**
 * misc.js
 *
 * Various helper methods
 */

const { Jig, JigControl } = require('../kernel/jig')
const { Berry } = require('../kernel/berry')
const { _hostIntrinsics } = require('./intrinsics')

// ------------------------------------------------------------------------------------------------
// _deployable
// ------------------------------------------------------------------------------------------------

/**
 * Returns whether a given function or class can be deployed on-chain. For now, the most important
 * check is that the function is not a native function built into the Javascript runtime. Other
 * checks are important, but they will be done during deploy.
 */
function _deployable (T) {
  return typeof T === 'function' && T.toString().indexOf('[native code]') === -1
}

// ------------------------------------------------------------------------------------------------
// _tokenType
// ------------------------------------------------------------------------------------------------

/**
 * Gets the kind of token this value is
 * @param {*} x Value to check
 * @returns {?string} Ether 'jig', 'berry', code', or undefined if not a token
 */
function _tokenType (x) {
  if (x instanceof Jig) return 'jig'
  if (x instanceof Berry) return 'berry'
  if (_deployable(x)) return 'code'
}

// ------------------------------------------------------------------------------------------------
// _display
// ------------------------------------------------------------------------------------------------

/*
 * Converts any value into a short string form usable in error messages and logs.
 * @param {*} x Value to stringify
 */
function _display (x) {
  switch (typeof x) {
    case 'string': return `"${x.length > 10 ? x.slice(0, 10) + '…' : x}"`
    case 'object': return x ? `[object ${x.constructor.name}]` : 'null'
    case 'function': {
      const s = x.toString()
      const isAnonymousFunction =
        /^\(/.test(s) || // () => {}
        /^function\s*\(/.test(s) || // function() {}
        /^[a-zA-Z0-9_$]+\s*=>/.test(s) // x => x
      if (isAnonymousFunction) return '[anonymous function]'
      const isAnonymousClass = /^class\s*{/.test(s)
      if (isAnonymousClass) return '[anonymous class]'
      return x.name
    }
    case 'undefined': return 'undefined'
    default: return x.toString()
  }
}

// ------------------------------------------------------------------------------------------------
// _checkNoObjectsBelongingToOtherTokens
// ------------------------------------------------------------------------------------------------

function _checkNoObjectsBelongingToOtherTokens (value, token) {
  _deepTraverseObjects([value], x => {
    if (_tokenType(x)) return false

    JigControl.enableSpecialProps(() => {
      if (typeof x.$owner !== 'undefined' && x.$owner !== token) {
        const suggestion = 'Hint: Consider storing a clone of the value instead.'
        throw new Error(`Property ${_display(x)} belongs to a different token\n\n${suggestion}`)
      }
    })

    return true
  })
}

// ------------------------------------------------------------------------------------------------
// _deepTraverseObjects
// ------------------------------------------------------------------------------------------------

/**
 * Deeply traverses an object, calling the callback for every internal object value
 *
 * Callbacks should return true or false for whether to dive down deeper.
 *
 * This is a relable way to traverse jig state, but it will not traverse every possible token.
 * In particular, arbitrary object constructors are not detected. Also, if the object relies
 * on any hidden or external state, or data types not supported in Jigs (ie. WeakMap), we will
 * not traverse it either. This is specifically for traversing Jig state data.
 * @param {*} x Object to traverse
 * @param {function} callback Callback that is passed the object, and returns whether to traverse.
 * @param {?object} alternateIntrinsics Optional alternate intrinsics to consider
 */
function _deepTraverseObjects (x, callback, altIntrinsics = {}, visited = new Set()) {
  if ((typeof x !== 'function' && typeof x !== 'object') || !x) return
  _deepTraverseSubObjects(x, callback, altIntrinsics, visited)
}

function _deepTraverseSubObjects (x, callback, altIntrinsics, visited) {
  if (visited.has(x)) return
  visited.add(x)

  const visit = value => {
    if ((typeof value !== 'function' && typeof value !== 'object') || !value) return
    if (!callback(value)) return
    _deepTraverseObjects(value, callback, altIntrinsics, visited)
  }

  // Traverse set entries
  if (x instanceof _hostIntrinsics.Set || (altIntrinsics.Set && x instanceof altIntrinsics.Set)) {
    for (const value of x) visit(value)
  }

  // Traverse map keys and values
  if (x instanceof _hostIntrinsics.Map || (altIntrinsics.Map && x instanceof altIntrinsics.Map)) {
    for (const [key, value] of x) { visit(key); visit(value) }
  }

  // Traverse standard properties
  Object.keys(x).forEach(key => visit(x[key]))
}

// ------------------------------------------------------------------------------------------------
// _deepReplaceObjects
// ------------------------------------------------------------------------------------------------

/**
 * Deeply traverses an object, replacing objects with new objects, before traversing
 *
 * Callback is passed and object, and returns a new object.
 */
function _deepReplaceObjects (x, callback, altIntrinsics = {}, visited = new Set()) {
  if ((typeof x !== 'function' && typeof x !== 'object') || !x) return
  _deepReplaceSubObjects(x, callback, altIntrinsics, visited)
}

function _deepReplaceSubObjects (x, callback, altIntrinsics, visited) {
  if (visited.has(x)) return
  visited.add(x)

  const visit = value => {
    if ((typeof value !== 'function' && typeof value !== 'object') || !value) return value
    const inner = callback(value)
    _deepReplaceSubObjects(inner, callback, altIntrinsics, visited)
    return inner
  }

  // Traverse set entries
  if (x instanceof _hostIntrinsics.Set || (altIntrinsics.Set && x instanceof altIntrinsics.Set)) {
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
  if (x instanceof _hostIntrinsics.Map || (altIntrinsics.Map && x instanceof altIntrinsics.Map)) {
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

module.exports = {
  _deployable,
  _tokenType,
  _display,
  _checkNoObjectsBelongingToOtherTokens,
  _deepTraverseObjects,
  _deepReplaceObjects
}
