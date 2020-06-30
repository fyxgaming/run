/**
 * jig.js
 *
 * Base class for instance jigs and class jigs with updatable state
 */

const { _installNative } = require('./code')

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

class Jig {
  static [Symbol.hasInstance] (x) {
    return false
  }
}

// ------------------------------------------------------------------------------------------------

const NativeJig = _installNative(Jig)

module.exports = NativeJig
