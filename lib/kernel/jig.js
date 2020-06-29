/**
 * jig.js
 *
 * Base class for instance jigs and class jigs with updatable state
 */

const Code = require('./code')

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

class Jig {
  static [Symbol.hasInstance] (x) {
    return false
  }
}

// ------------------------------------------------------------------------------------------------

const NativeJig = new Code(Jig, { _native: true })

module.exports = NativeJig
