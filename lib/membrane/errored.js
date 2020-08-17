/**
 * errored.js
 *
 * Membrane that checks the jig for errors before allowing an action
 */

const Membrane = require('./membrane')
const { _hasOwnProperty } = require('../util/misc')
const { _location } = require('../util/bindings')

// ------------------------------------------------------------------------------------------------
// ErroredMembrane
// ------------------------------------------------------------------------------------------------

class ErroredMembrane extends Membrane {
  apply (target, thisArg, args) {
    checkNotErrored(target)
    return super.apply(target, thisArg, args)
  }

  construct (target, args, newTarget) {
    checkNotErrored(target)
    return super.construct(target, args, newTarget)
  }

  defineProperty (target, prop, desc) {
    checkNotErrored(target)
    return super.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    checkNotErrored(target)
    return super.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    checkNotErrored(target)
    return super.get(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    checkNotErrored(target)
    return super.getOwnPropertyDescriptor(target, prop)
  }

  getPrototypeOf (target) {
    checkNotErrored(target)
    return super.getPrototypeOf(target)
  }

  has (target, prop) {
    checkNotErrored(target)
    return super.has(target, prop)
  }

  isExtensible (target) {
    checkNotErrored(target)
    return super.isExtensible(target)
  }

  ownKeys (target) {
    checkNotErrored(target)
    return super.ownKeys(target)
  }

  preventExtensions (target) {
    checkNotErrored(target)
    return super.preventExtensions(target)
  }

  set (target, prop, value, receiver) {
    checkNotErrored(target)
    return super.set(target, prop, value, receiver)
  }

  setPrototypeOf (target, prototype) {
    checkNotErrored(target)
    return super.setPrototypeOf(target, prototype)
  }
}

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

module.exports = ErroredMembrane
