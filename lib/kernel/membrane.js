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

// Kinds of proxies this membrane supports
const KIND_CODE = 'code'
const KIND_NATIVE = 'native'
const KIND_JIG = 'jig'

// Creates a code prototype method that can be safely returned from the membrane
function makeCodeMethod (name) {
  const script = `function ${name} (...args) { return Code.prototype[${name}].apply(this, args) }`
  const method = Sandbox._evaluate(script, { Code })[0]
  return Object.freeze(method)
}

// Methods on every code instance
const CODE_METHODS = {
  sync: makeCodeMethod('sync'),
  upgrade: makeCodeMethod('upgrade'),
  destroy: makeCodeMethod('destroy'),
  auth: makeCodeMethod('auth')
}

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

class Membrane {
  _init (kind, proxy) {
    this._kind = kind
    this._proxy = proxy
  }

  definePropery (target, prop, desc) {
    // In non-admin mode, disable defineProperty because it becomes we can't serialize
    // non-writeable  or non-configurable variables, let alone getters or setters.
    if (!ADMIN) throw new Error('defineProperty disallowed')

    Object.defineProperty(target, prop, desc)
    return true
  }

  get (target, prop, receiver) {
    if (this._kind === KIND_CODE) {
      // Return code methods immediately. We don't need to bind them because they
      // are capable of being run on any receiver.
      const isCodeMethod = Object.keys(CODE_METHODS).includes(prop)
      if (isCodeMethod) return CODE_METHODS[prop]

      // Always bind toString to the the function prototype method.
      // This allows child classes that are not yet code to have correct source.
      if (prop === 'toString') {
        console.log('get', receiver.name, target[prop], target[prop].apply(receiver))
        const x = target[prop].bind(receiver)
        return x
        // return SI.Function.prototype.toString.bind(receiver)
      }
      /*
      if (typeof target[prop] === 'function') {
        // toString requires special handling because we change inner types
        if (prop === 'toString') {
          // When user calls toString on us, get source for the inner type
          // When they call on a child class, return prototype of that child class.
          const callingThis = receiver === this._proxy
          const toStringTarget = callingThis ? target : receiver
          return SI.Function.prototype.toString.bind(toStringTarget)
        }

        // Other functions should run on the proxy
        return target[prop].bind(receiver)
      }
      */
    }

    // TODO
    return target[prop]
  }

  getOwnPropertyDescriptor (target, prop) {
    // Code methods require no special handling. They will return undefined because they can't be
    // defined, and that is expected because code methods would have been owned by a prototyped.

    // TODO
    return Object.getOwnPropertyDescriptor(target, prop)
  }
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

Membrane._KIND_CODE = KIND_CODE
Membrane._KIND_NATIVE = KIND_NATIVE
Membrane._KIND_JIG = KIND_JIG

Membrane._sudo = sudo

module.exports = Membrane
