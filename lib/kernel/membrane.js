/**
 * membrane.js
 *
 * The single external membrane for many different kinds of jigs and code
 */

const Sandbox = require('../util/sandbox')
const Code = require('./code')
const { _checkState } = require('../util/misc')
const { _location, _owner, _satoshis } = require('../util/bindings')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// Whether the normal jig safety checks for users are bypassed. Used internally.
let ADMIN = false

// Kinds of proxies this membrane supports
const KIND_CODE = 'code'
const KIND_NATIVE = 'native'
const KIND_JIG = 'jig'

// Handlers which will be defined below
const NATIVE_TRAPS = { }
const CODE_TRAPS = { }
const JIG_TRAPS = { }

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

/**
 * Single membrane that can be configured for different kinds of jigs
 */
class Membrane {
  _init (kind, proxy, target) {
    this._kind = kind
    this._proxy = proxy
    this._target = target

    if (kind === KIND_NATIVE) Object.assign(this, NATIVE_TRAPS)
    if (kind === KIND_CODE) Object.assign(this, CODE_TRAPS)
    if (kind === KIND_JIG) Object.assign(this, JIG_TRAPS)
  }
}

// ------------------------------------------------------------------------------------------------
// Native Traps
// ------------------------------------------------------------------------------------------------

const throwNativeError = () => { throw new Error('Native code is immutable') }

// Native code cannot be changed. The traps enforce this.
NATIVE_TRAPS.defineProperty = () => throwNativeError()
NATIVE_TRAPS.deleteProperty = () => throwNativeError()
NATIVE_TRAPS.isExtensible = () => false
NATIVE_TRAPS.preventExtensions = () => throwNativeError()
NATIVE_TRAPS.set = () => throwNativeError()
NATIVE_TRAPS.setPrototypeOf = () => throwNativeError()

// ------------------------------------------------------------------------------------------------
// Code Traps
// ------------------------------------------------------------------------------------------------

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

// TODO
CODE_TRAPS.defineProperty = function (target, prop, desc) {
  // In non-admin mode, disable defineProperty because it becomes we can't serialize
  // non-writeable  or non-configurable variables, let alone getters or setters.
  if (!ADMIN) throw new Error('defineProperty disallowed')

  Object.defineProperty(target, prop, desc)
  return true
}

// ------------------------------------------------------------------------------------------------

// TODO
CODE_TRAPS.get = function (target, prop, receiver) {
  // checkNotErrored(target)

  // Return code methods immediately. We don't bind because binding is bad
  // and they are capable of being run on any receiver.
  const isCodeMethod = Object.keys(CODE_METHODS).includes(prop)
  if (isCodeMethod) return CODE_METHODS[prop]

  // If this property is a binding, check that it can be read
  checkBindingReadable(target, prop)

  return target[prop]
}

// ------------------------------------------------------------------------------------------------

CODE_TRAPS.isExtensible = function (target) {
  checkNotErrored(target)

  // Jigs can be always changed with an owner's approval. We don't allow freezing jigs.
  return true
}

// ------------------------------------------------------------------------------------------------

// TODO
CODE_TRAPS.getOwnPropertyDescriptor = function (target, prop) {
  // Code methods require no special handling. They will return undefined because they can't be
  // defined, and that is expected because code methods would have been owned by a prototyped.

  return Object.getOwnPropertyDescriptor(target, prop)
}

// ------------------------------------------------------------------------------------------------
// Jig Traps
// ------------------------------------------------------------------------------------------------

// TODO

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

// Every trap will check if the jig in an error state from a prior action.
// A jig will go into an error state if the user fails to sync and there was an error.
function checkNotErrored (target) {
  if (ADMIN) return

  // If location is not defined, then we are setting up the jig and not in an error state.
  // For example, toString() should still be allowed to be called when setting up.
  if (!Object.getOwnPropertyNames(target).includes('location')) return

  // Undeployed jigs can still be used because they will be deployed after the action completes.
  const { error, undeployed } = _location(target.location)
  if (error && !undeployed) throw new Error(error)
}

// ------------------------------------------------------------------------------------------------

function checkBindingReadable (target, prop) {
  if (ADMIN) return

  const val = target[prop]

  try {
    if (prop === 'location' || prop === 'origin' || prop === 'nonce') {
      // Treat nonce the same as location for determining readability
      const loc = _location(prop === 'nonce' ? target.location : val)

      _checkState(!loc.undeployed, 'undeployed\n\nHint:Please sync.')
      _checkState(!loc.error, `a previous error occurred\n\n${loc.error}`)

      const hint = `Hint: Sync the jig first to assign ${prop} in a transaction`
      _checkState(loc.txid && ('vout' in loc || 'vdel' in loc), `undetermined\n\n${hint}`)
    }

    if (prop === 'owner' || prop === 'satoshis') {
      const Unbound = require('../util/unbound')

      const hint = `Hint: Sync the jig first to bind ${prop} in a transaction`
      _checkState(!(val instanceof Unbound), `unbound\n\n${hint}`)

      if (prop === 'owner') _owner(val)
      if (prop === 'satoshis') _satoshis(val)
    }
  } catch (e) {
    throw new Error(`Cannot read ${prop}: ${e.message}`)
  }
}

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
