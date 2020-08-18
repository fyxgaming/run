/**
 * admin.js
 *
 * Membrane that allows admins to perform actions directly without involving the other membranes.
 */

const Membrane = require('./membrane')
const { _admin } = require('../util/admin')

// ------------------------------------------------------------------------------------------------
// AdminFastPath
// ------------------------------------------------------------------------------------------------

class AdminFastPath extends Membrane {
  defineProperty (target, prop, desc) {
    if (_admin()) return Reflect.defineProperty(target, prop, desc)
    return this._inner.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    if (_admin()) return Reflect.deleteProperty(target, prop)
    return this._inner.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    if (_admin()) return Reflect.get(target, prop, receiver)
    return this._inner.get(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    if (_admin()) return Reflect.getOwnPropertyDescriptor(target, prop)
    return this._inner.getOwnPropertyDescriptor(target, prop)
  }

  getPrototypeOf (target) {
    if (_admin()) return Reflect.getPrototypeOf(target)
    return this._inner.getPrototypeOf(target)
  }

  has (target, prop) {
    if (_admin()) return Reflect.has(target, prop)
    return this._inner.has(target, prop)
  }

  isExtensible (target) {
    if (_admin()) return Reflect.isExtensible(target)
    return this._inner.isExtensible(target)
  }

  ownKeys (target) {
    if (_admin()) return Reflect.ownKeys(target)
    return this._inner.ownKeys(target)
  }

  preventExtensions (target) {
    if (_admin()) return Reflect.preventExtensions(target)
    return this._inner.preventExtensions(target)
  }

  set (target, prop, value, receiver) {
    if (_admin()) return Reflect.set(target, prop, value, receiver)
    return this._inner.set(target, prop, value, receiver)
  }

  setPrototypeOf (target, prototype) {
    if (_admin()) return Reflect.setPrototypeOf(target, prototype)
    return this._inner.setPrototypeOf(target, prototype)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = AdminFastPath
