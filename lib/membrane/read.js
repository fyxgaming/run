/**
 * read.js
 *
 * Records reads on the current record
 */

const Membrane = require('./membrane')
const Proxy = require('../util/proxy')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const RECORD = () => require('../kernel/record')._CURRENT_RECORD

// ------------------------------------------------------------------------------------------------
// RecordReads
// ------------------------------------------------------------------------------------------------

class RecordReads extends Membrane {
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
}

// ------------------------------------------------------------------------------------------------

module.exports = RecordReads
