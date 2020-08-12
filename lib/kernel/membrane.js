/**
 * membrane.js
 *
 * Proxy handler common to all code and instance jigs
 */

const Sandbox = require('../util/sandbox')
const Code = require('./code')
const { _location } = require('../util/bindings')
const { StateError } = require('../util/errors')

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
  _init (kind, proxy, target) {
    this._kind = kind
    this._proxy = proxy
    this._target = target
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
      // Return code methods immediately. We don't bind because binding is bad
      // and they are capable of being run on any receiver.
      const isCodeMethod = Object.keys(CODE_METHODS).includes(prop)
      if (isCodeMethod) return CODE_METHODS[prop]
    }

    // TODO
    return target[prop]
  }

  // --------------------------------------------------------------------------
  // isExtensible
  // --------------------------------------------------------------------------

  isExtensible (target) {
    this._checkNotErrored()

    // Jigs can be always changed with an owner's approval. We don't allow freezing jigs.
    return true
  }

  getOwnPropertyDescriptor (target, prop) {
    // Code methods require no special handling. They will return undefined because they can't be
    // defined, and that is expected because code methods would have been owned by a prototyped.

    // TODO
    return Object.getOwnPropertyDescriptor(target, prop)
  }

  // --------------------------------------------------------------------------
  // _checkNotErrored
  // --------------------------------------------------------------------------

  // Every trap will check if the jig in an error state from a prior action.
  // A jig will go into an error state if the user fails to sync and there was an error.
  _checkNotErrored () {
    if (ADMIN) return

    // If location is not defined, then we are setting up the jig and not in an error state.
    // For example, toString() should still be allowed to be called when setting up.
    if (!Object.getOwnPropertyNames(this._target).includes('location')) return

    // Undeployed jigs can still be used because they will be deployed after the action completes.
    const { error, undeployed } = _location(this._target.location)
    if (error && !undeployed) throw new StateError(error)
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
