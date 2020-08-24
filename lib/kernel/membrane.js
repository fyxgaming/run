/**
 * membrane.js
 * 
 * A flexible proxy handler for jigs, code, berries, and their owned inner objects.
 */

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

class Membrane {
  _apply (target, thisArg, args) {
    return Reflect.apply(target, thisArg, args)
  }

  _construct (target, args, newTarget) {
    return Reflect.construct(target, args, newTarget)
  }

  _defineProperty (target, prop, desc) {
    return Reflect.defineProperty(target, prop, desc)
  }

  _deleteProperty (target, prop) {
    return Reflect.deleteProperty(target, prop)
  }

  _get (target, prop, receiver) {
    return Reflect.get(target, prop, receiver)
  }

  _getOwnPropertyDescriptor (target, prop) {
    return Reflect.getOwnPropertyDescriptor(target, prop)
  }

  _getPrototypeOf (target) {
    return Reflect.getPrototypeOf(target)
  }

  _has (target, prop) {
    return Reflect.has(target, prop)
  }

  _isExtensible (target) {
    return Reflect.isExtensible(target)
  }

  _ownKeys (target) {
    return Reflect.ownKeys(target)
  }

  _preventExtensions (target) {
    return Reflect.preventExtensions(target)
  }

  _set (target, prop, value, receiver) {
    return Reflect.set(target, prop, value, receiver)
  }

  _setPrototypeOf (target, prototype) {
    return Reflect.setPrototypeOf(target, prototype)
  }

  _intrinsicGetMethod () {
    // TODO
  }

  _intrinsicOut (value) {
    // TODO
    return value
  }

  _intrinsicIn (value) {
    // TODO
    return value
  }

  _intrinsicRead () {
    // TODO
  }

  _intrinsicUpdate () {
    // TODO
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Membrane
