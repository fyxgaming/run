
/**
 * mutable.js
 *
 * A membrane that allows a jig to be changed by calling methods
 */

const Membrane = require('./membrane')

// All

// _checkState(typeof prop !== 'symbol', 'Must not delete symbols')
// _checkState(typeof prop === 'string', 'Must only set string keys')

// set:
// Check the value being set does not belong to another jig
//   _checkState(!PROXY_OWNERS.has(value) || PROXY_OWNERS.get(value) === this._proxy,
// 'Cannot set properties belonging to another jig')

// TODO
class Method {

}

// ------------------------------------------------------------------------------------------------
// MutableSet
// ------------------------------------------------------------------------------------------------

class MutableSet {

}

// ------------------------------------------------------------------------------------------------
// Mutable
// ------------------------------------------------------------------------------------------------

class Mutable extends Membrane {
  defineProperty (target, prop, desc) {
    return this._inner.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    return this._inner.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    const val = this._inner.get(target, prop, receiver)

    if (typeof val === 'function') {
      // TODO
    }

    return val
  }

  getOwnPropertyDescriptor (target, prop) {
    const desc = this._inner.getOwnPropertyDescriptor(target, prop)

    if (typeof desc.value === 'function') {
      // TODO
    }

    return desc
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

module.exports = Mutable
