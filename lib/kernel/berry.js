/**
 * berry.js
 */

// ------------------------------------------------------------------------------------------------
// BerryDeps
// ------------------------------------------------------------------------------------------------

class BerryDeps {
  static get _Code () { return require('./code') }
  static get _BERRIES () { return require('./universal')._BERRIES }
}

// ------------------------------------------------------------------------------------------------
// Berry
// ------------------------------------------------------------------------------------------------

class Berry {
  constructor (...args) {
    if (!(this.constructor instanceof BerryDeps._Code)) {
      // const file = BerryDeps._File._find(this.constructor)
      // const BerryClass = file._jig
      // return new BerryClass(...args)
    }

    BerryDeps._BERRIES.add(this)

    // TODO
  }

  static [Symbol.hasInstance] (x) {
    return BerryDeps._BERRIES.has(x)
  }

  // Pluck location -> path
}

Berry.deps = { BerryDeps }

Berry.sealed = false

// ------------------------------------------------------------------------------------------------

Berry.toString() // Preserves the class name during compilation

const NativeBerry = new BerryDeps._Code()
const editor = BerryDeps._Code._editor(NativeBerry)
const internal = false
editor._installNative(Berry, internal)

module.exports = NativeBerry
