/**
 * membrane.js
 *
 * The single external membrane for many different kinds of jigs and code
 */

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// Handlers which will be defined below
const CODE_TRAPS = { }

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------

CODE_TRAPS.set = function (target, prop, value, receiver) {
  // Stop proxy parent classes from intercepting sets on children. It doesn't make sense!
  if (typeof target === 'function') {
    const proto = Object.getPrototypeOf(target)
    try {
      Object.setPrototypeOf(target, Object.getPrototypeOf(Object))
      return setInternal(target, prop, value, receiver)
    } finally {
      Object.setPrototypeOf(target, proto)
    }
  }

  return setInternal(target, prop, value, receiver)
}

// ------------------------------------------------------------------------------------------------

function setInternal (target, prop, value, receiver) {
  // Check that the property is settable
  // this._checkSettable(prop, value)

  // All sets become spends, even if the value doesn't change
  // The user likely intended this value to change, and it saves us a deep traverse later.
  // if (STACK.length) RECORD._spend(this._proxy)

  Reflect.set(target, prop, value)

  return true
}

// ------------------------------------------------------------------------------------------------
