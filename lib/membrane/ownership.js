
// set:
// Check the value being set does not belong to another jig
//   _checkState(!PROXY_OWNERS.has(value) || PROXY_OWNERS.get(value) === this._proxy,
// 'Cannot set properties belonging to another jig')

/**
 * ownership.js
 *
 * Membrane that enforces ownership of inner objects
 */

const Membrane = require('./membrane')

// ------------------------------------------------------------------------------------------------
// OwnershipMembrane
// ------------------------------------------------------------------------------------------------

class OwnershipMembrane extends Membrane {
  apply (target, thisArg, args) {
    return this._inner.apply(target, thisArg, args)
  }

  construct (target, args, newTarget) {
    return this._inner.construct(target, args, newTarget)
  }

  defineProperty (target, prop, desc) {
    return this._inner.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    return this._inner.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    return this._inner.get(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    return this._inner.getOwnPropertyDescriptor(target, prop)
  }

  getPrototypeOf (target) {
    return this._inner.getPrototypeOf(target)
  }

  has (target, prop) {
    return this._inner.has(target, prop)
  }

  isExtensible (target) {
    return this._inner.isExtensible(target)
  }

  ownKeys (target) {
    return this._inner.ownKeys(target)
  }

  preventExtensions (target) {
    return this._inner.preventExtensions(target)
  }

  set (target, prop, value, receiver) {
    return this._inner.set(target, prop, value, receiver)
  }

  setPrototypeOf (target, prototype) {
    return this._inner.setPrototypeOf(target, prototype)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = OwnershipMembrane
