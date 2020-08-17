/**
 * base.js
 *
 * Base proxy handler at the center of all membranes
 */

// ------------------------------------------------------------------------------------------------
// Base Handler
// ------------------------------------------------------------------------------------------------

class BaseHandler {
  apply (target, thisArg, args) {
    return Reflect.apply(target, thisArg, args)
  }

  // --------------------------------------------------------------------------

  construct (target, args, newTarget) {
    return Reflect.construct(target, args, newTarget)
  }

  // --------------------------------------------------------------------------

  defineProperty (target, prop, desc) {
    return Reflect.defineProperty(target, prop, desc)
  }

  // --------------------------------------------------------------------------

  deleteProperty (target, prop) {
    return Reflect.deleteProperty(target, prop)
  }

  // --------------------------------------------------------------------------

  get (target, prop, receiver) {
    return Reflect.get(target, prop, receiver)
  }

  // --------------------------------------------------------------------------

  getOwnPropertyDescriptor (target, prop) {
    return Reflect.getOwnPropertyDescriptor(target, prop)
  }

  // --------------------------------------------------------------------------

  getPrototypeOf (target) {
    return Reflect.getPrototypeOf(target)
  }

  // --------------------------------------------------------------------------

  has (target, prop) {
    return Reflect.has(target, prop)
  }

  // --------------------------------------------------------------------------

  isExtensible (target) {
    return Reflect.isExtensible(target)
  }

  // --------------------------------------------------------------------------

  ownKeys (target) {
    return Reflect.ownKeys(target)
  }

  // --------------------------------------------------------------------------

  preventExtensions (target) {
    return Reflect.preventExtensions(target)
  }

  // --------------------------------------------------------------------------

  set (target, prop, value, receiver) {
    return Reflect.set(target, prop, value, receiver)
  }

  // --------------------------------------------------------------------------

  setPrototypeOf (target, prototype) {
    return Reflect.setPrototypeOf(target, prototype)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = BaseHandler
