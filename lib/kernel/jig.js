/**
 * jig.js
 *
 * Base class for all instance jigs and code jigs
 */

// ------------------------------------------------------------------------------------------------
// JigDeps
// ------------------------------------------------------------------------------------------------

class JigDeps {
  static get _Code () { return require('./code') }
  static get _JIGS () { return require('./universal')._JIGS }
}

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

class Jig {
  constructor (...args) {
    if (!(this.constructor instanceof JigDeps._Code)) {
      const JigClass = JigDeps._Code._lookupByType(this.constructor)
      return new JigClass(...args)
    }

    JigDeps._JIGS.add(this)

    // TODO
  }

  static [Symbol.hasInstance] (x) {
    return JigDeps._JIGS.has(x)
  }
}

Jig.deps = { JigDeps }
Jig.sealed = false

// ------------------------------------------------------------------------------------------------

Jig.toString() // Preserves the class name during compilation

const NativeJig = new JigDeps._Code()
const editor = JigDeps._Code._editor(NativeJig)
const internal = false
editor._installNative(Jig, internal)

module.exports = NativeJig
