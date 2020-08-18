/**
 * method.js
 *
 * Membrane that allows for internal methods to be called to update state
 */

const Membrane = require('./membrane')

// ------------------------------------------------------------------------------------------------
// CallMethodMembrane
// ------------------------------------------------------------------------------------------------

class CallMethodMembrane extends Membrane {
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
}

// ------------------------------------------------------------------------------------------------

module.exports = CallMethodMembrane
