/**
 * membrane.js
 *
 * Base membrane class that wraps another membrane or proxy handler to field actions
 */

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

class Membrane {
  constructor (inner = {}) {
    this._inner = inner
  }

  apply (target, thisArg, args) {
    return (this._inner.apply || Reflect.apply)(target, thisArg, args)
  }

  construct (target, args, newTarget) {
    return (this._inner.construct || Reflect.construct)(target, args, newTarget)
  }

  defineProperty (target, prop, desc) {
    return (this._inner.defineProperty || Reflect.defineProperty)(target, prop, desc)
  }

  deleteProperty (target, prop) {
    return (this._inner.deleteProperty || Reflect.deleteProperty)(target, prop)
  }

  get (target, prop, receiver) {
    return (this._inner.get || Reflect.get)(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    return (this._inner.getOwnPropertyDescriptor || Reflect.getOwnPropertyDescriptor)(target, prop)
  }

  getPrototypeOf (target) {
    return (this._inner.getPrototypeOf || Reflect.getPrototypeOf)(target)
  }

  has (target, prop) {
    return (this._inner.has || Reflect.has)(target, prop)
  }

  isExtensible (target) {
    return (this._inner.isExtensible || Reflect.isExtensible)(target)
  }

  ownKeys (target) {
    return (this._inner.ownKeys || Reflect.ownKeys)(target)
  }

  preventExtensions (target) {
    return (this._inner.preventExtensions || Reflect.preventExtensions)(target)
  }

  set (target, prop, value, receiver) {
    return (this._inner.set || Reflect.set)(target, prop, value, receiver)
  }

  setPrototypeOf (target, prototype) {
    return (this._inner.setPrototypeOf || Reflect.setPrototypeOf)(target, prototype)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Membrane
