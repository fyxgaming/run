/**
 * jig.js
 *
 * Base class for instance jigs and class jigs with updatable state
 */

const Repository = require('./repository')

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

class Jig {
  static [Symbol.hasInstance] (x) {
    return false
  }
}

Jig.sealed = false

// ------------------------------------------------------------------------------------------------

Jig.toString() // Preserves the class name during compilation

const NativeJig = Repository._native()._install(Jig, { _dep: true })

module.exports = NativeJig
