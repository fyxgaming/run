/**
 * user.js
 *
 * Membrane that enforces what users of jigs are allowed to do.
 */

const Membrane = require('./membrane')

// ------------------------------------------------------------------------------------------------
// UserMembrane
// ------------------------------------------------------------------------------------------------

class UserMembrane extends Membrane {
  defineProperty (target, prop, desc) {
    // Disable defineProperty because it becomes we can't serialize non-writeable  or
    // non-configurable variables, let alone getters or setters.
    throw new Error('defineProperty disabled')
  }

  // --------------------------------------------------------------------------

  getOwnPropertyDescriptor (target, prop) {
    // Disable getOwnPropertyDescriptor because it might expose internal details.
    throw new Error('getOwnPropertyDescriptor disabled')
  }

  // --------------------------------------------------------------------------

  isExtensible (target) {
    // preventExtensions is disabled so the jig is always extensible
    return true
  }

  // --------------------------------------------------------------------------

  preventExtensions (target) {
    // Disable preventExtensions because jigs are always updatable with the owner's approval
    throw new Error('preventExtensions disabled')
  }

  // --------------------------------------------------------------------------

  setPrototypeOf (target, prop) {
    // Disable setPrototypeOf because Run controls that
    throw new Error('setPrototypeOf disabled')
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = UserMembrane
