/**
 * code.js
 *
 * A jig for code such as classes and functions
 */

const Repository = require('./repository')
const { _assert } = require('./misc')

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * Class that all non-native code jigs inherit from
 */
class Code {
  static sync () {
    _assert(!Repository._isNative(this), 'Native code may not be synced')

    console.log('SYNC')

    // Not available inside jig code

    // TODO
  }

  static upgrade () {
    _assert(!Repository._isNative(this), 'Native code may not be upgraded')

    console.log('UPGRADE')
    // Not available inside jig code

    // TODO
  }

  static destroy () {
    _assert(!Repository._isNative(this), 'Native code may not be destroyed')

    console.log('DESTROY')
    // Not available inside jig code
    // Not available inside jig code

    // TODO
  }

  static [Symbol.hasInstance] (x) {
    // Only functions may be code jigs
    if (typeof x !== 'function') return false

    // Native code is special. It does not have Code in the prototype chain.
    const PrevCode = Repository._get(x)
    if (PrevCode) return true

    // Check if we are already a constructor prototype. Prototypes are not Code.
    if (x === x.constructor.prototype) return false

    // Check if Code is in the prototype chain of the class
    let type = Object.getPrototypeOf(x)
    while (type) {
      if (type === this) return true
      type = Object.getPrototypeOf(type)
    }

    // Not code
    return false
  }
}

Code.deps = { Repository, _assert }

const NativeCode = Repository._installNative(Code)

// ------------------------------------------------------------------------------------------------

module.exports = NativeCode
