/**
 * recorder.js
 *
 * Records actions performed on jigs on the Record
 */

const Membrane = require('./membrane')
const Proxy = require('../util/proxy')
const { _assert } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const RECORD = () => require('../kernel/record')._CURRENT_RECORD

// ------------------------------------------------------------------------------------------------
// RecorderMembrane
// ------------------------------------------------------------------------------------------------

class RecorderMembrane extends Membrane {
  apply (target, thisArg, args) {
    // Calling a function requires a read to know its code to execute
    if (RECORD()._stack.length) RECORD()._read(Proxy._get(target))

    return this._inner.apply(target, thisArg, args)
  }

  construct (target, args, newTarget) {
    // Creating an instance requires a read to know its class
    if (RECORD()._stack.length) RECORD()._read(Proxy._get(target))

    return this._inner.construct(target, args, newTarget)
  }

  defineProperty (target, prop, desc) {
    // Defining a property requires an update and must be in another action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._get(target))

    return this._inner.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    // Deleting a property requires an update and must be in another action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._get(target))

    return this._inner.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    // Getting a property requires a read
    if (RECORD()._stack.length) RECORD()._read(Proxy._get(target))

    return this._inner.get(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    // Getting a property descriptor requires a read
    if (RECORD()._stack.length) RECORD()._read(Proxy._get(target))

    return this._inner.getOwnPropertyDescriptor(target, prop)
  }

  getPrototypeOf (target) {
    // Getting a prototype requires a read
    if (RECORD()._stack.length) RECORD()._read(Proxy._get(target))

    return this._inner.getPrototypeOf(target)
  }

  has (target, prop) {
    // Checking a prototype requires a read
    if (RECORD()._stack.length) RECORD()._read(Proxy._get(target))

    return this._inner.has(target, prop)
  }

  isExtensible (target) {
    // Checking if extensible requires a read
    if (RECORD()._stack.length) RECORD()._read(Proxy._get(target))

    return this._inner.isExtensible(target)
  }

  ownKeys (target) {
    // Getting owned keys requires a read
    if (RECORD()._stack.length) RECORD()._read(Proxy._get(target))

    return this._inner.ownKeys(target)
  }

  preventExtensions (target) {
    // Preventing extensions requires an update and must be in an action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._get(target))

    return this._inner.preventExtensions(target)
  }

  set (target, prop, value, receiver) {
    // Setting a property requires an update and must be in an action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._get(target))

    return this._inner.set(target, prop, value, receiver)
  }

  setPrototypeOf (target, prototype) {
    // Changing the prototype requires an update and must be in an action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._get(target))

    return this._inner.setPrototypeOf(target, prototype)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RecorderMembrane
