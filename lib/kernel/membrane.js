/**
 * membrane.js
 *
 * Proxy handler common to all code and instance jigs
 */

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// Whether the normal jig safety checks for users are bypassed. Used internally.
let ADMIN = false

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

class Membrane {
  constructor (editor) {
    // TODO: Does this work for jigs?

    this._editor = editor
  }

  // When constructing this
  // The prototype of the instance is the dynamic's prototype
  // It needs to be the code.
  // Basically Object.getPrototypeOf(instance).constructor === Dynamic
  // Ideas:
  // - when construct instance, create a temp prototype with the code constructor only
  // - allow dynamic constructor to be customized ... Dynamic._setConstructor(x)
  // But its not the constructor! Need on the class. Outer type, only way.

  get (target, prop, receiver) {
    if (prop === 'toString') {
      return target[prop].bind(target)
    }

    return target[prop]
  }

  // TODO
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function sudo (f) {
  const prevAdmin = ADMIN
  try {
    ADMIN = true
    return f()
  } finally {
    ADMIN = prevAdmin
  }
}

// ------------------------------------------------------------------------------------------------

Membrane._sudo = sudo

module.exports = Membrane
