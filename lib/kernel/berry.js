/**
 * berry.js
 */

// ------------------------------------------------------------------------------------------------
// Context
// ------------------------------------------------------------------------------------------------

class Context {
  static get _Repository () { return require('./file') }
  static get _Code () { return require('./code') }
}

// ------------------------------------------------------------------------------------------------
// Berry
// ------------------------------------------------------------------------------------------------

class Berry {
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

Berry.deps = { Context }

Berry.sealed = false

// ------------------------------------------------------------------------------------------------

Berry.toString() // Preserves the class name during compilation

const NativeBerry = Context._Repository._native()._install(Berry, { _dep: true })

module.exports = NativeBerry
