/**
 * owner.js
 *
 * Membrane that allows inner objects to be retrieved but only modified by their owner.
 */

const Membrane = require('./membrane')
const Proxy = require('../util/proxy')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const BORROWS = new WeakMap() // Target -> Borrowed Proxy

// ------------------------------------------------------------------------------------------------
// Owner
// ------------------------------------------------------------------------------------------------

// Inner ownership only allows changes from the owning jig!
// What about owners of owners? Same thing.
// GetOwner (Proxy -> Jig/Berry/Code)

class Owner extends Membrane {
  get (target, prop, receiver) {
    const value = super.get(target, prop, receiver)

    // Primitive types don't need to be borrowed
    if (typeof value === 'object' || typeof value === 'function') return true

    // Jigs, Code, and Berries have their own ownership rules
    const Jig = require('../kernel/jig')
    const Code = require('../kernel/code')
    const Berry = require('../kernel/berry')
    if (value instanceof Jig || value instanceof Code || value instanceof Berry) return value

    // Create a wrapped version of the object that enforces borrowing rules
    if (BORROWS.has(value)) return BORROWS.get(value)
    const proxy = Proxy._get(target)
    const borrow = new Proxy(value, new Borrow(proxy))
    BORROWS.set(value, borrow)
    return borrow
  }

  getOwnPropertyDescriptor (target, prop) {
    return super.getOwnPropertyDescriptor(target, prop)
  }
}

// ------------------------------------------------------------------------------------------------
// Borrow
// ------------------------------------------------------------------------------------------------

class Borrow extends Membrane {
  constructor (container, inner) {
    super(inner)
    this._container = container
  }

  defineProperty (target, prop, desc) {
    checkMutable(this._container)
    return super.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    checkMutable(this._container)
    return super.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    // TODO - Do inner borrows
    return super.get(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    // TODO - Do inner borrows
    return super.getOwnPropertyDescriptor(target, prop)
  }

  preventExtensions (target) {
    checkMutable(this._container)
    return super.preventExtensions(target)
  }

  set (target, prop, value, receiver) {
    checkMutable(this._container)
    return super.set(target, prop, value, receiver)
  }

  setPrototypeOf (target, prototype) {
    checkMutable(this._container)
    return super.setPrototypeOf(target, prototype)
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function checkMutable (container) {
  // TODO
}

// ------------------------------------------------------------------------------------------------

module.exports = Owner
