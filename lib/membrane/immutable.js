/**
 * immutable.js
 *
 * A membrane that enforces that the underlying target not be changed. Any set operations,
 * both on this object and any inner objects, will throw an error. Also, any method calls that
 * change intrinsics, like Set.prototype.add, will also throw an error. This is achieved by
 * wrapping inner objects with an immutable membrane when they are retrieved.
 */

const Membrane = require('./membrane')
const { _checkState } = require('../util/misc')
const Proxy = require('../util/proxy')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const IMMUTABLES = new WeakMap() // Target -> Immutable Proxy

// ------------------------------------------------------------------------------------------------
// Immutable
// ------------------------------------------------------------------------------------------------

// TODO: Handle sets and maps

class Immutable extends Membrane {
  defineProperty (target, prop, desc) {
    throw new Error('defineProperty disabled')
  }

  deleteProperty (target, prop) {
    throw new Error('deleteProperty disabled')
  }

  get (target, prop, receiver) {
    const value = super.get(target, prop, receiver)

    // Primitive types are returned directly
    if (typeof value !== 'object' && typeof value !== 'function') return value

    // Other Jigs, Code, and Berries are excluded from this object's immutability
    const Jig = require('../kernel/jig')
    const Code = require('../kernel/code')
    const Berry = require('../kernel/berry')
    if (value instanceof Jig || value instanceof Code || value instanceof Berry) return value

    // Check if we've already created a wrapped value
    if (IMMUTABLES.has(value)) return IMMUTABLES.get(value)

    // Object types are wrapped to be immutable
    const immutable = new Proxy(value, new Immutable())
    IMMUTABLES.set(value, immutable)
    return immutable
  }

  getOwnPropertyDescriptor (target, prop) {
    const desc = super.getOwnPropertyDescriptor(target, prop)
    const { value } = desc

    // This immutable membrane does not support getters and setters yet
    _checkState('value' in desc, 'Getters and setters not supported')

    // Primitive types are returned directly
    if (typeof value !== 'object' && typeof value !== 'function') return desc

    // Other Jigs, Code, and Berries are excluded from this object's immutability
    const Jig = require('../kernel/jig')
    const Code = require('../kernel/code')
    const Berry = require('../kernel/berry')
    if (value instanceof Jig || value instanceof Code || value instanceof Berry) return desc

    // Check if we've already created a wrapped value
    if (IMMUTABLES.has(desc.value)) {
      desc.value = IMMUTABLES.get(value)
      return desc
    }

    // Object types are wrapped to be immutable
    const immutable = new Proxy(value, new Immutable())
    IMMUTABLES.set(value, immutable)
    desc.value = immutable
    return desc
  }

  preventExtensions (target) {
    throw new Error('preventExtensions disabled')
  }

  set (target, prop, value, receiver) {
    throw new Error('set disabled')
  }

  setPrototypeOf (target, prototype) {
    throw new Error('setPrototypeOf disabled')
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Immutable
