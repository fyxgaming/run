/**
 * admin.js
 *
 * Membrane that allows admins to perform actions directly without involving the other membranes.
 */

const Membrane = require('./membrane')
const { _admin } = require('../util/admin')

// ------------------------------------------------------------------------------------------------
// AdminMembrane
// ------------------------------------------------------------------------------------------------

class AdminMembrane extends Membrane {
  defineProperty (target, prop, desc) {
    if (_admin()) return Reflect.defineProperty(target, prop, desc)

    return super.defineProperty(target, prop, desc)
  }

  // --------------------------------------------------------------------------

  deleteProperty (target, prop) {
    if (_admin()) return Reflect.deleteProperty(target, prop)

    return super.deleteProperty(target, prop)
  }

  // --------------------------------------------------------------------------

  get (target, prop, receiver) {
    if (_admin()) return Reflect.get(target, prop, receiver)

    return super.get(target, prop, receiver)
  }

  // --------------------------------------------------------------------------

  getOwnPropertyDescriptor (target, prop) {
    if (_admin()) return Reflect.getOwnPropertyDescriptor(target, prop)

    return super.getOwnPropertyDescriptor(target, prop)
  }

  // --------------------------------------------------------------------------

  getPrototypeOf (target) {
    if (_admin()) return Reflect.getPrototypeOf(target)

    return super.getPrototypeOf(target)
  }

  // --------------------------------------------------------------------------

  has (target, prop) {
    if (_admin()) return Reflect.has(target, prop)

    return super.has(target, prop)
  }

  // --------------------------------------------------------------------------

  isExtensible (target) {
    if (_admin()) return Reflect.isExtensible(target)

    return super.isExtensible(target)
  }

  // --------------------------------------------------------------------------

  ownKeys (target) {
    if (_admin()) return Reflect.ownKeys(target)

    return super.ownKeys(target)
  }

  // --------------------------------------------------------------------------

  preventExtensions (target) {
    if (_admin()) return Reflect.preventExtensions(target)

    return super.preventExtensions(target)
  }

  // --------------------------------------------------------------------------

  set (target, prop, value, receiver) {
    if (_admin()) return Reflect.set(target, prop, value, receiver)

    return super.set(target, prop, value, receiver)
  }

  // --------------------------------------------------------------------------

  setPrototypeOf (target, prop) {
    if (_admin()) return Reflect.setPrototypeOf(target, prop)

    return super.setPrototypeOf(target, prop)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = AdminMembrane
