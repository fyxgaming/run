/**
 * membrane.js
 *
 * Proxy handler common to all code and instance jigs
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

  // TODO
  definePropery (target, prop, desc) {
    // In non-admin mode, disable defineProperty because it becomes we can't serialize
    // non-writeable  or non-configurable variables, let alone getters or setters.
    if (!ADMIN) throw new Error('defineProperty disallowed')

    Object.defineProperty(target, prop, desc)
    return true
  }

  // TODO
  get (target, prop, receiver) {
    // checkNotErrored(target)

    if (this._kind === KIND_CODE) {
      // Return code methods immediately. We don't bind because binding is bad
      // and they are capable of being run on any receiver.
      const isCodeMethod = Object.keys(CODE_METHODS).includes(prop)
      if (isCodeMethod) return CODE_METHODS[prop]
    }

    // If this property is a binding, check that it can be read
    this._checkBindingReadable(prop)

    return target[prop]
  }

  isExtensible (target) {
    this._checkNotErrored()

    // Jigs can be always changed with an owner's approval. We don't allow freezing jigs.
    return true
  }

  // TODO
  getOwnPropertyDescriptor (target, prop) {
    // Code methods require no special handling. They will return undefined because they can't be
    // defined, and that is expected because code methods would have been owned by a prototyped.

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
    if (error && !undeployed) throw new Error(error)
  }

  // --------------------------------------------------------------------------
  // _checkBindingReadable
  // --------------------------------------------------------------------------

  _checkBindingReadable (prop) {
    if (ADMIN) return
    if (this._kind === KIND_NATIVE) return

    const val = this._target[prop]

    try {
      if (prop === 'location' || prop === 'origin' || prop === 'nonce') {
        // Treat nonce the same as location for determining readability
        const loc = _location(prop === 'nonce' ? this._target.location : val)

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
