/**
 * berry.js
 */

// ------------------------------------------------------------------------------------------------
// Context
// ------------------------------------------------------------------------------------------------

// TODO: BerryDeps
class Context {
  static get _Code () { return require('./code') }
  static get _BERRIES () { return require('./universal')._BERRIES }
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

    Context._BERRIES.add(this)

    // TODO
  }

  static [Symbol.hasInstance] (x) {
    return Context._BERRIES.has(x)
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
