/**
 * private.js
 *
 * Membrane to enforce encapsulation of private variables and methods
 */

const Membrane = require('./membrane')

// ------------------------------------------------------------------------------------------------
// EnforcePrivateProperties
// ------------------------------------------------------------------------------------------------

class EnforcePrivateProperties extends Membrane {
  defineProperty (target, prop, desc) {
    if (prop.startsWith('_') && !hasPrivateAccess(target)) {
      throw new Error(`Cannot define private property: ${prop}`)
    }

    return this._inner.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    if (prop.startsWith('_') && !hasPrivateAccess(target)) {
      throw new Error(`Cannot delete private property: ${prop}`)
    }

    return this._inner.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    if (prop.startsWith('_') && !hasPrivateAccess(target)) {
      throw new Error(`Cannot get private property: ${prop}`)
    }

    return this._inner.get(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    if (prop.startsWith('_') && !hasPrivateAccess(target)) {
      throw new Error(`Cannot get descriptor for private property: ${prop}`)
    }

    return this._inner.getOwnPropertyDescriptor(target, prop)
  }

  has (target, prop) {
    if (prop.startsWith('_') && !hasPrivateAccess(target)) {
      throw new Error(`Cannot check private property: ${prop}`)
    }

    return this._inner.has(target, prop)
  }

  ownKeys (target) {
    const keys = this._inner.ownKeys(target)

    return hasPrivateAccess(target) ? keys : keys.filter(key => key.startsWith('_'))
  }

  set (target, prop, value, receiver) {
    if (prop.startsWith('_') && !hasPrivateAccess(target)) {
      throw new Error(`Cannot set private property: ${prop}`)
    }

    return this._inner.set(target, prop, value, receiver)
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function hasPrivateAccess (target) {
  const Code = require('../kernel/code')
  const Jig = require('../kernel/jig')
  const Record = require('../kernel/record')
  const Proxy = require('../util/proxy')
  const { _assert } = require('../util/misc')

  const proxy = Proxy._getProxy(target)
  const stack = Record._CURRENT_RECORD._stack

  // Outside of a jig, private properties are inaccessible
  if (!stack.length) return false

  // Get the top of the stack
  const accessor = stack[stack.length - 1]._jig

  // For jig code only the current class may access its private properties.
  // Arbitrary code does not use this membrane.
  if (proxy instanceof Code) {
    return accessor === proxy
  }

  // For jig instances, jigs of the same jig class may access its private properties. Also,
  // the jig class may access private properties of its instances.
  if (proxy instanceof Jig) {
    return accessor.constructor === proxy.constructor || accessor === proxy.constructor
  }

  // Other kinds of proxies should not be here
  _assert(false)
}

// ------------------------------------------------------------------------------------------------

module.exports = EnforcePrivateProperties
