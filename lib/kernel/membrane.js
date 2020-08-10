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
