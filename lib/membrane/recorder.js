/**
 * recorder.js
 *
 * Records reads and writes of a jig, code, or berry on the current record
 */

const Membrane = require('./membrane')
const Proxy = require('../util/proxy')
const { _hasOwnProperty, _assert } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const RECORD = () => require('../kernel/record')._CURRENT_RECORD

// ------------------------------------------------------------------------------------------------
// Recorder
// ------------------------------------------------------------------------------------------------

class Recorder extends Membrane {
  apply (target, thisArg, args) {
    // Calling a function requires a read to know its code to execute
    if (RECORD()._stack.length) RECORD()._read(Proxy._getProxy(target))

    return super.apply(target, thisArg, args)
  }

  construct (target, args, newTarget) {
    // Creating an instance requires a read to know its class
    if (RECORD()._stack.length) RECORD()._read(Proxy._getProxy(target))

    return super.construct(target, args, newTarget)
  }

  defineProperty (target, prop, desc) {
    // Defining a property requires an update and must be in another action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._getProxy(target))

    return super.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    // Deleting a property requires an update and must be in another action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._getProxy(target))

    return super.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    // Getting a property requires a read up the prototype chain
    if (RECORD()._stack.length) readProperty(target, prop)

    return super.get(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    // Getting a property descriptor requires a read
    if (RECORD()._stack.length) RECORD()._read(Proxy._getProxy(target))

    return super.getOwnPropertyDescriptor(target, prop)
  }

  getPrototypeOf (target) {
    // Getting a prototype requires a read
    if (RECORD()._stack.length) RECORD()._read(Proxy._getProxy(target))

    return super.getPrototypeOf(target)
  }

  has (target, prop) {
    // Checking a prototype requires a read up the prototype chain
    if (RECORD()._stack.length) readProperty(target, prop)

    return super.has(target, prop)
  }

  isExtensible (target) {
    // Checking if extensible requires a read
    if (RECORD()._stack.length) RECORD()._read(Proxy._getProxy(target))

    return super.isExtensible(target)
  }

  ownKeys (target) {
    // Getting owned keys requires a read
    if (RECORD()._stack.length) RECORD()._read(Proxy._getProxy(target))

    return super.ownKeys(target)
  }

  preventExtensions (target) {
    // Preventing extensions requires an update and must be in an action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._getProxy(target))

    return super.preventExtensions(target)
  }

  set (target, prop, value, receiver) {
    // Setting a property requires an update and must be in an action.
    // Setting a property updates receiver. The target doesn't matter.
    _assert(RECORD()._stack.length)
    RECORD()._update(receiver)

    return super.set(target, prop, value, receiver)
  }

  setPrototypeOf (target, prototype) {
    // Changing the prototype requires an update and must be in an action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._getProxy(target))

    return super.setPrototypeOf(target, prototype)
  }
}

// ------------------------------------------------------------------------------------------------

function readProperty (target, prop) {
  // Read original object
  const proxy = Proxy._getProxy(target)
  RECORD()._read(proxy)

  // If property is on the original, then no more reads
  if (_hasOwnProperty(target, prop)) return

  // Read up the prototype chain until we find the property
  let T = typeof target === 'function' ? Object.getPrototypeOf(proxy) : proxy.constructor

  const Code = require('../kernel/code')
  while (T instanceof Code) {
    const container = typeof target === 'function' ? T : T.prototype
    if (_hasOwnProperty(container, prop)) break

    RECORD()._read(T)
    T = Object.getPrototypeOf(T)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Recorder
