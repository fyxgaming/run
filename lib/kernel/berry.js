/**
 * berry.js
 */

const Repository = require('./repository')

// ------------------------------------------------------------------------------------------------
// Berry
// ------------------------------------------------------------------------------------------------

class Berry {
  static [Symbol.hasInstance] (x) {
    return false
  }
}

Berry.sealed = false

// ------------------------------------------------------------------------------------------------

Berry.toString() // Preserves the class name during compilation

const NativeBerry = Repository._installNative(Berry)

module.exports = NativeBerry
