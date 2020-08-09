/**
 * berry.js
 */

// ------------------------------------------------------------------------------------------------
// Context
// ------------------------------------------------------------------------------------------------

class Context {
  static get _Code () { return require('./code') }
}

// ------------------------------------------------------------------------------------------------
// Berry
// ------------------------------------------------------------------------------------------------

class Berry {
  constructor (...args) {
    if (!(this.constructor instanceof Context._Code)) {
      // const file = Context._File._find(this.constructor)
      // const BerryClass = file._jig
      // return new BerryClass(...args)
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

  // Pluck location -> path
}

Berry.deps = { Context }

Berry.sealed = false

// ------------------------------------------------------------------------------------------------

Berry.toString() // Preserves the class name during compilation

const NativeBerry = new Context._Code()
const editor = Context._Code._editor(NativeBerry)
const internal = false
editor._installNative(Berry, internal)

module.exports = NativeBerry
