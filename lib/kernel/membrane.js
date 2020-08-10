/**
 * membrane.js
 *
 * Proxy handler common to all code and instance jigs
 */

const Sandbox = require('../util/sandbox')

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

  // construct (target, args, newTarget) {
  // const x = Reflect.construct(target, args, newTarget)
  // console.log('construct', args, x, x._value)
  // return x
  // }

  get (target, prop, receiver) {
    const Code = require('./code')

    class SandboxedCodePrototype {
      static sync (...args) { return Code.prototype.sync.apply(this, args) }
      static upgrade (...args) { return Code.prototype.upgrade.apply(this, args) }
      static destroy (...args) { return Code.prototype.destroy.apply(this, args) }
      static auth (...args) { return Code.prototype.auth.apply(this, args) }
    }

    const SSS = Sandbox._sandboxType(SandboxedCodePrototype, { Code })[0]
    Object.freeze(SSS)

    console.log(Object.getOwnPropertyNames(SSS))

    if (prop === 'sync') return Code.prototype.sync.bind(receiver)
    if (prop === 'upgrade') return Code.prototype.upgrade.bind(receiver)
    if (prop === 'destroy') return Code.prototype.destroy.bind(receiver)
    if (prop === 'auth') return Code.prototype.auth.bind(receiver)

    //
    // if (prop === 'toString') {
    // console.log('TO STRING')
    // return target[prop].bind(receiver)
    // return target[prop].bind(target)
    // }

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
