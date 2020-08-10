/**
 * membrane.js
 *
 * Proxy handler common to all code and instance jigs
 */

const Sandbox = require('../util/sandbox')
const Code = require('./code')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// Whether the normal jig safety checks for users are bypassed. Used internally.
let ADMIN = false

// Creates a code prototype method that can be safely returned from the membrane
const makeCodeMethod = name => {
  const script = `function ${name} (...args) { return Code.prototype[${name}].apply(this, args) }`
  const method = Sandbox._evaluate(script, { Code })[0]
  return Object.freeze(method)
}

// Methods available on all code
const CODE_METHODS = {
  sync: makeCodeMethod('sync'),
  upgrade: makeCodeMethod('sync'),
  destroy: makeCodeMethod('sync'),
  auth: makeCodeMethod('sync')
}

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

class Membrane {
  constructor (editor) {
    // TODO: Does this work for jigs?

    this._editor = editor
  }

  // --------------------------------------------------------------------------

  // definePropery (target, prop, desc) {
  // TODO
  // }

  // --------------------------------------------------------------------------

  get (target, prop, receiver) {
    const isCode = typeof target === 'function'

    // Return code methods immediately
    if (isCode && Object.keys(CODE_METHODS).includes(prop)) {
      return CODE_METHODS[prop].bind(receiver)
    }

    // TODO
    return target[prop]
  }

  // --------------------------------------------------------------------------

  getOwnPropertyDescriptor (target, prop) {
    // Code methods require no special handling. They will return undefined because they can't be
    // defined, and that is expected because code methods would have been owned by a prototyped.

    // TODO
    return Object.getOwnPropertyDescriptor(target, prop)
  }

  // --------------------------------------------------------------------------
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
