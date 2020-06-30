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

// ------------------------------------------------------------------------------------------------

const NativeBerry = Repository._installNative(Berry)

module.exports = NativeBerry
