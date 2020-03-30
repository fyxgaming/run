/**
 * misc.js
 *
 * Various helper methods
 */

const { Jig } = require('../kernel/jig')
const { Berry } = require('../kernel/berry')

// ------------------------------------------------------------------------------------------------
// _deployable
// ------------------------------------------------------------------------------------------------

/**
 * Returns whether a given function or class can be deployed on-chain. Basically we are checking
 * that the function or class has a name, which run currently requires to connect dependencies,
 * and also that it is not a native function built into JavaScript runtime.
 */
function _deployable (type) {
  return typeof type === 'function' && type.toString().indexOf('[native code]') === -1
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

module.exports = { _deployable, _tokenType, _display }
