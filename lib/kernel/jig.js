/**
 * jig.js
 *
 * Base class for instance jigs and class jigs with updatable state
 */

const { _installNative } = require('./repository')

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

class Jig {
  static [Symbol.hasInstance] (x) {
    return false
  }
}

// ------------------------------------------------------------------------------------------------

Jig.toString() // Preserves the class name during compilation

const NativeJig = _installNative(Jig)

module.exports = NativeJig
