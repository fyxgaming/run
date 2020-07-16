/**
 * jig.js
 *
 * Base class for instance jigs and class jigs with updatable state
 */

// ------------------------------------------------------------------------------------------------
// Context
// ------------------------------------------------------------------------------------------------

class Context {
  static get _File () { return require('./file') }
  static get _Code () { return require('./code') }
}

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

class Jig {
  constructor (...args) {
    if (!(this.constructor instanceof Context._Code)) {
      const file = Context._File._find(this.constructor)
      const JigClass = file._jig
      return new JigClass(...args)
    }
    // TODO
  }

  static [Symbol.hasInstance] (x) {
    // TODO
    if (typeof x !== 'object' || !x) return false
    let type = Object.getPrototypeOf(x)
    while (type) {
      if (type === this.prototype) return true
      type = Object.getPrototypeOf(type)
    }
    return false
  }
}

Jig.deps = { Context }

Jig.sealed = false

// ------------------------------------------------------------------------------------------------

Jig.toString() // Preserves the class name during compilation

const NativeJig = new Context._File()._installNative(Jig)._jig

module.exports = NativeJig
