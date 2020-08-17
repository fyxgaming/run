/**
 * encapsulation.js
 *
 * Membrane to enforce encapsulation of private variables and methods
 */

const Membrane = require('./membrane')
const Code = require('../kernel/Code')
const Jig = require('../kernel/Jig')
const Record = require('../kernel/record')
const Proxy = require('../util/proxy')
const { _assert } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// EncapsulationMembrane
// ------------------------------------------------------------------------------------------------

class EncapsulationMembrane extends Membrane {
  defineProperty (target, prop, desc) {
    if (prop.startsWith('_') && !hasPrivateAccess(target)) {
      throw new Error(`Cannot define private property: ${prop}`)
    }

    return super.defineProperty(target, prop, desc)
  }

  // --------------------------------------------------------------------------

  deleteProperty (target, prop) {
    if (prop.startsWith('_') && !hasPrivateAccess(target)) {
      throw new Error(`Cannot delete private property: ${prop}`)
    }

    return super.deleteProperty(target, prop)
  }

  // --------------------------------------------------------------------------

  get (target, prop, receiver) {
    if (prop.startsWith('_') && !hasPrivateAccess(target)) {
      throw new Error(`Cannot get private property: ${prop}`)
    }

    return super.get(target, prop, receiver)
  }

  // --------------------------------------------------------------------------

  getOwnPropertyDescriptor (target, prop) {
    if (prop.startsWith('_') && !hasPrivateAccess(target)) {
      throw new Error(`Cannot get descriptor for private property: ${prop}`)
    }

    return super.getOwnPropertyDescriptor(target, prop)
  }

  // --------------------------------------------------------------------------

  has (target, prop) {
    if (prop.startsWith('_') && !hasPrivateAccess(target)) {
      throw new Error(`Cannot check private property: ${prop}`)
    }

    return super.has(target, prop)
  }

  // --------------------------------------------------------------------------

  ownKeys (target) {
    const keys = super.ownKeys(target)

    return hasPrivateAccess(target) ? keys : keys.filter(key => key.startsWith('_'))
  }

  // --------------------------------------------------------------------------

  set (target, prop, value, receiver) {
    if (prop.startsWith('_') && !hasPrivateAccess(target)) {
      throw new Error(`Cannot set private property: ${prop}`)
    }

    return super.set(target, prop, value, receiver)
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function hasPrivateAccess (target) {
  const proxy = Proxy._get(target)
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

module.exports = EncapsulationMembrane
