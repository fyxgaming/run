/**
 * bindings.js
 *
 * Membrane that enforces that bindings are not able to be changed willy nilly.
 */

const Membrane = require('./membrane')
const { _location, _owner, _satoshis, _BINDINGS } = require('../util/bindings')
const { _checkState } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// Bindings
// ------------------------------------------------------------------------------------------------

class Bindings extends Membrane {
  defineProperty (target, prop, desc) {
    checkSettable(target, prop, desc)

    // When bindings are set, they are unbound until the record is committed
    const Unbound = require('../util/unbound')
    desc.value = desc.value instanceof Unbound ? desc.value : new Unbound(desc.value)

    return Reflect.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    _checkState(!_BINDINGS.includes(prop), 'Must not delete bindings')

    return super.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    checkGettable(target, prop)

    return super.get(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    checkGettable(target, prop)

    return super.getOwnPropertyDescriptor(target, prop)
  }

  set (target, prop, value, receiver) {
    checkSettable(target, prop, value)

    // When bindings are set, they are unbound until the record is committed
    const Unbound = require('../util/unbound')
    value = value instanceof Unbound ? value : new Unbound(value)

    return super.set(target, prop, value, receiver)
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function checkGettable (target, prop) {
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

function checkSettable (target, prop, value) {
  _checkState(prop !== 'origin', 'Must not set origin')
  _checkState(prop !== 'location', 'Must not set location')
  _checkState(prop !== 'nonce', 'Must not set nonce')

  _owner(value)
}

// ------------------------------------------------------------------------------------------------

module.exports = Bindings
