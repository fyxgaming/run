/**
 * privacy.js
 *
 * Membrane to enforce accessibility of private variables and methods
 */

const Membrane = require('./membrane')

// ------------------------------------------------------------------------------------------------
// PrivacyMembrane
// ------------------------------------------------------------------------------------------------

class PrivacyMembrane extends Membrane {
  apply (target, thisArg, args) {
    return super._inner.apply(target, thisArg, args)
  }

  // --------------------------------------------------------------------------

  construct (target, args, newTarget) {
    return super._inner.construct(target, args, newTarget)
  }

  // --------------------------------------------------------------------------

  defineProperty (target, prop, desc) {
    return super._inner.defineProperty(target, prop, desc)
  }

  // --------------------------------------------------------------------------

  deleteProperty (target, prop) {
    return super._inner.deleteProperty(target, prop)
  }

  // --------------------------------------------------------------------------

  get (target, prop, receiver) {
    return super._inner.get(target, prop, receiver)
  }

  // --------------------------------------------------------------------------

  getOwnPropertyDescriptor (target, prop) {
    return super._inner.getOwnPropertyDescriptor(target, prop)
  }

  // --------------------------------------------------------------------------

  getPrototypeOf (target) {
    return super._inner.getPrototypeOf(target)
  }

  // --------------------------------------------------------------------------

  has (target, prop) {
    return super._inner.has(target, prop)
  }

  // --------------------------------------------------------------------------

  isExtensible (target) {
    return super._inner.isExtensible(target)
  }

  // --------------------------------------------------------------------------

  ownKeys (target) {
    return super._inner.ownKeys(target)
  }

  // --------------------------------------------------------------------------

  preventExtensions (target) {
    return super._inner.preventExtensions(target)
  }

  // --------------------------------------------------------------------------

  set (target, prop, value, receiver) {
    return super._inner.set(target, prop, value, receiver)
  }

  // --------------------------------------------------------------------------

  setPrototypeOf (target, prop) {
    return super._inner.setPrototypeOf(target, prop)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = PrivacyMembrane
