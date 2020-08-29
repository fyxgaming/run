/**
 * jig.js
 *
 * Base class for all instance jigs and code jigs
 */

// ------------------------------------------------------------------------------------------------
// Context
// ------------------------------------------------------------------------------------------------

// TODO: JigDeps
class Context {
  static get _Code () { return require('./code') }
  static get _JIGS () { return require('./universal')._JIGS }
}

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

class Jig {
  constructor (...args) {
    if (!(this.constructor instanceof Context._Code)) {
      const JigClass = Context._Code._lookupByType(this.constructor)
      return new JigClass(...args)
    }

    Context._JIGS.add(this)

    // TODO
  }

  static [Symbol.hasInstance] (x) {
    return Context._JIGS.has(x)
  }
}

Jig.deps = { Context }
Jig.sealed = false

// ------------------------------------------------------------------------------------------------

Jig.toString() // Preserves the class name during compilation

const NativeJig = new Context._Code()
const editor = Context._Code._editor(NativeJig)
const internal = false
editor._installNative(Jig, internal)

module.exports = NativeJig
