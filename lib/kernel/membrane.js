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

  // construct (target, args, newTarget) {
  // const x = Reflect.construct(target, args, newTarget)
  // console.log('construct', args, x, x._value)
  // return x
  // }

  // definePropery (target, prop, desc) {
  // TODO
  // }

  get (target, prop, receiver) {
    // Return code methods directly
    if (Object.keys(CODE_METHODS).includes(prop)) {
      return CODE_METHODS[prop].bind(receiver)
    }

    //
    // if (prop === 'toString') {
    // console.log('TO STRING')
    // return target[prop].bind(receiver)
    // return target[prop].bind(target)
    // }

    return target[prop]
  }

  // getOwnPropertyDescriptor (target, prop) {
  // TODO
  // }

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
