/**
 * user.js
 *
 * Membrane that enforces what users of jigs and code are allowed to do.
 */

const Membrane = require('./membrane')
const { _location, _owner, _satoshis } = require('../util/bindings')
const { _checkState } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// UserMembrane
// ------------------------------------------------------------------------------------------------

class UserMembrane extends Membrane {
  defineProperty (target, prop, desc) {
    // Disable defineProperty because it becomes we can't serialize non-writeable  or
    // non-configurable variables, let alone getters or setters.
    throw new Error('defineProperty disabled')
  }

  get (target, prop, receiver) {
    checkBindingReadable(target, prop)

    return this._inner.get(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    checkBindingReadable(target, prop)

    return this._inner.getOwnPropertyDescriptor(target, prop)
  }

  isExtensible (target) {
    // preventExtensions is disabled so the jig is always extensible
    return true
  }

  preventExtensions (target) {
    // Disable preventExtensions because jigs are always updatable with the owner's approval
    throw new Error('preventExtensions disabled')
  }

  setPrototypeOf (target, prototype) {
    // Disable setPrototypeOf because Run controls that
    throw new Error('setPrototypeOf disabled')
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function checkBindingReadable (target, prop) {
  const val = target[prop]

  try {
    if (prop === 'location' || prop === 'origin' || prop === 'nonce') {
      // Treat nonce the same as location for determining readability
      const loc = _location(prop === 'nonce' ? target.location : val)

      _checkState(!loc.undeployed, 'undeployed\n\nHint: Sync the jig')
      _checkState(!loc.error, `a previous error occurred\n\n${loc.error}`)

      const hint = `Hint: Sync the jig first to assign ${prop} in a transaction`
      _checkState(loc.txid && ('vout' in loc || 'vdel' in loc), `undetermined\n\n${hint}`)
    }

    if (prop === 'owner' || prop === 'satoshis') {
      const Unbound = require('../util/unbound')

      const hint = `Hint: Sync the jig first to bind ${prop} in a transaction`
      _checkState(!(val instanceof Unbound), `unbound\n\n${hint}`)

      if (prop === 'owner') _owner(val, true)
      if (prop === 'satoshis') _satoshis(val)
    }
  } catch (e) {
    throw new Error(`Cannot read ${prop}: ${e.message}`)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = UserMembrane
