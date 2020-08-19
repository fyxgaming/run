/**
 * immutable.js
 *
 * A membrane that enforces that the underlying target not be changed. Any setting oprations
 * will throw an error and any get operations on inner objects wrap those inner objects
 * with another immutable membrane so that they are immutable too.
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

    // Object types are wrapped to be immutable
    if (IMMUTABLES.has(value)) return IMMUTABLES.get(value)
    const immutable = new Proxy(value, new Immutable())
    IMMUTABLES.set(value, immutable)
    return immutable
  }

  getOwnPropertyDescriptor (target, prop) {
    const desc = super.getOwnPropertyDescriptor(target, prop)

    // This immutable membrane does not support getters and setters yet
    _checkState('value' in desc, 'Getters and setters not supported')

    // Primitive types are returned directly
    if (typeof desc.value !== 'object' && typeof desc.value !== 'function') return desc

    // Other Jigs, Code, and Berries are excluded from this object's immutability
    const Jig = require('../kernel/jig')
    const Code = require('../kernel/code')
    const Berry = require('../kernel/berry')
    if (desc.value instanceof Jig || desc.value instanceof Code || desc.value instanceof Berry) return desc

    // Object types are wrapped to be immutable
    if (IMMUTABLES.has(desc.value)) { desc.value = IMMUTABLES.get(desc.value) }
    const immutable = new Proxy(desc.value, new Immutable())
    IMMUTABLES.set(desc.value, immutable)
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
