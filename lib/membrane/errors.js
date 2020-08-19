/**
 * errors.js
 *
 * Membrane that always checks if the jig is in an error state from a previous action
 */

const Membrane = require('./membrane')
const { _hasOwnProperty } = require('../util/misc')
const { _location } = require('../util/bindings')

// ------------------------------------------------------------------------------------------------
// Errors
// ------------------------------------------------------------------------------------------------

class Errors extends Membrane {
  apply (target, thisArg, args) {
    checkNotErrored(target)
    return this._inner.apply(target, thisArg, args)
  }

  construct (target, args, newTarget) {
    checkNotErrored(target)
    return this._inner.construct(target, args, newTarget)
  }

  defineProperty (target, prop, desc) {
    checkNotErrored(target)
    this._inner.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    checkNotErrored(target)
    return this._inner.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    checkNotErrored(target)
    return this._inner.get(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    checkNotErrored(target)
    return this._inner.getOwnPropertyDescriptor(target, prop)
  }

  getPrototypeOf (target) {
    checkNotErrored(target)
    return this._inner.getPrototypeOf(target)
  }

  has (target, prop) {
    checkNotErrored(target)
    return this._inner.has(target, prop)
  }

  isExtensible (target) {
    checkNotErrored(target)
    return this._inner.isExtensible(target)
  }

  ownKeys (target) {
    checkNotErrored(target)
    return this._inner.ownKeys(target)
  }

  preventExtensions (target) {
    checkNotErrored(target)
    return this._inner.preventExtensions()
  }

  set (target, prop, value, receiver) {
    checkNotErrored(target)
    return this._inner.set(target, prop, value, receiver)
  }

  setPrototypeOf (target, prototype) {
    checkNotErrored(target)
    return this._inner.setPrototypeOf(target, prototype)
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

// Every jig or code trap must check if the jig in an error state from a prior action. A jig will
// go into an error state if the user fails to sync and there was an error while publishing.
function checkNotErrored (target) {
  // If location is not defined, then we are setting up the jig and not in an error state.
  // For example, toString() should still be allowed to be called when setting up.
  if (!_hasOwnProperty(target, 'location')) return

  // Undeployed jigs can still be used because they will be deployed after the action completes.
  const { error, undeployed } = _location(target.location)
  if (error && !undeployed) throw new Error(error)
}

// ------------------------------------------------------------------------------------------------

module.exports = Errors
