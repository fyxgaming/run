/**
 * code.js
 *
 * A jig for code such as classes and functions
 */

const Repository = require('./repository')

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * Class that all non-native code jigs inherit from
 */
class Code {
  sync () {
    // Not available inside jig code

    // TODO
  }

  upgrade () {
    // Not available inside jig code

    // TODO
  }

  destroy () {
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

    // Check if this class's prototype is in the prototype chain of the instance
    let type = Object.getPrototypeOf(x)
    while (type) {
      if (type === this.prototype) return true
      type = Object.getPrototypeOf(type)
    }

    // Not in the prototype chain. So not Code.
    return false
  }
}

Code.deps = { Repository }

const NativeCode = Repository._installNative(Code)

// ------------------------------------------------------------------------------------------------

module.exports = NativeCode
