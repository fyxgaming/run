/**
 * user.js
 *
 * Membrane that enforces what users of jigs and code are allowed to do.
 */

const Membrane = require('./membrane')
const { _location, _owner, _satoshis, _BINDINGS } = require('../util/bindings')
const {
  _checkState, _hasOwnProperty, _isBasicObject, _isBasicArray,
  _isBasicSet, _isBasicMap, _isBasicUint8Array, _isArbitraryObject
} = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const RECORD = () => require('../kernel/record')._CURRENT_RECORD

// ------------------------------------------------------------------------------------------------
// UserMembrane
// ------------------------------------------------------------------------------------------------

class UserMembrane extends Membrane {
  defineProperty (target, prop, desc) {
    // Disable defineProperty because it becomes we can't serialize non-writeable  or
    // non-configurable variables, let alone getters or setters.
    throw new Error('defineProperty disabled')
  }

  deleteProperty (target, prop) {
    _checkState(inside(target), 'Only the jig may delete its properties')
    _checkState(!_BINDINGS.includes(prop), 'Must not delete bindings')
    _checkState(_hasOwnProperty(target, prop), 'Must only delete own properties')
    _checkState(typeof prop !== 'symbol', 'Must not delete symbols')

    return this._inner.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    checkGettable(target, prop)

    return this._inner.get(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    checkGettable(target, prop)

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

  set (target, prop, value, receiver) {
    checkSettable(target, prop, value)

    return this._inner.set(target, prop, value, receiver)
  }

  setPrototypeOf (target, prototype) {
    // Disable setPrototypeOf because Run controls that
    throw new Error('setPrototypeOf disabled')
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
  _checkState(inside(target), 'Only the jig may set properties')
  _checkState(prop !== 'origin', 'Must not set origin')
  _checkState(prop !== 'location', 'Must not set location')
  _checkState(prop !== 'nonce', 'Must not set nonce')
  _checkState(typeof prop === 'string', 'Must only set string keys')

  // Check property value is serializable
  _checkState(typeof value !== 'symbol', 'Must not set symbols as values')
  const Code = require('../kernel/code')
  _checkState(typeof value !== 'function' || value instanceof Code,
    'Must not set non-jig or non-sidekick code as values')
  _checkState(typeof value !== 'object' ||
        value === null ||
        _isBasicObject(value) ||
        _isBasicArray(value) ||
        _isBasicSet(value) ||
        _isBasicMap(value) ||
        _isBasicUint8Array(value) ||
        _isArbitraryObject(value), 'Must only set serializable objects')
}

// ------------------------------------------------------------------------------------------------

function inside (target) {
  const proxy = Proxy._get(target)
  const stack = RECORD()._stack
  return stack.length && stack[stack.length - 1] === proxy
}

// ------------------------------------------------------------------------------------------------

module.exports = UserMembrane
