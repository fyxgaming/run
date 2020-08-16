/**
 * readonly.js
 *
 * A membrane that enforces that the underlying target not be changed
 */

const Membrane = require('./membrane')

// ------------------------------------------------------------------------------------------------
// ReadOnlyMembrane
// ------------------------------------------------------------------------------------------------

class ReadOnlyMembrane extends Membrane {
  defineProperty (target, prop, desc) {
    throw new Error('defineProperty disabled')
  }

  // --------------------------------------------------------------------------

  deleteProperty (target, prop) {
    throw new Error('deleteProperty disabled')
  }

  // --------------------------------------------------------------------------

  preventExtensions (target) {
    throw new Error('preventExtensions disabled')
  }

  // --------------------------------------------------------------------------

  set (target, prop, value, receiver) {
    throw new Error('set disabled')
  }

  // --------------------------------------------------------------------------

  setPrototypeOf (target, prop) {
    throw new Error('setPrototypeOf disabled')
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = ReadOnlyMembrane
