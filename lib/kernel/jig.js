/**
 * jig.js
 *
 * Base class for instance jigs and class jigs with updatable state
 */

// ------------------------------------------------------------------------------------------------
// Context
// ------------------------------------------------------------------------------------------------

class Context {
  static get _Repository () { return require('./file') }
  static get _Code () { return require('./code') }
}

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

class Jig {
  constructor (...args) {
    if (!(this.constructor instanceof Context._Code)) {
      const C = Context._Repository._active()._get(this.constructor)
      return new C(...args)
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

const NativeJig = Context._Repository._native()._install(Jig, { _dep: true })

module.exports = NativeJig
