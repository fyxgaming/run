/**
 * misc.js
 *
 * Various helper methods
 */

const { Jig } = require('../kernel/jig')
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
// _deepTraverseObjects
// ------------------------------------------------------------------------------------------------

/**
 * Deeply traverses an object, calling the callback for every internal object value
 *
 * The callbacks should return true or false for whether to dive down deeper.
 * @param {*} x Object to traverse
 * @param {*} callback Callback that passes the object, and returns whether to traverse it
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

module.exports = { _deployable, _tokenType, _display, _deepTraverseObjects }
