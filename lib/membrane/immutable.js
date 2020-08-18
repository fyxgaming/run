/**
 * immutable.js
 *
 * A membrane that enforces that the underlying target not be changed
 */

const Membrane = require('./membrane')

// ------------------------------------------------------------------------------------------------
// MakeImmutable
// ------------------------------------------------------------------------------------------------

class MakeImmutable extends Membrane {
  defineProperty (target, prop, desc) {
    throw new Error('defineProperty disabled')
  }

  deleteProperty (target, prop) {
    throw new Error('deleteProperty disabled')
  }

  preventExtensions (target) {
    throw new Error('preventExtensions disabled')
  }

  set (target, prop, value, receiver) {
    throw new Error('set disabled')
  }

  setPrototypeOf (target, prototype) {
    throw new Error('setPrototypeOf disabled')
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = MakeImmutable
