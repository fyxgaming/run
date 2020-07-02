/**
 * unbound.js
 */

const Repository = require('./repository')

// ------------------------------------------------------------------------------------------------
// Unbound
// ------------------------------------------------------------------------------------------------

/**
 * A property of a blockchain object that is not yet bound to a transaction.
 *
 * The owner or satoshis values may be unbound until the next transaction.
 *
 * An undefined value means it has not yet been determined. A defined value means it is determined
 * but not yet bound to a transaction.
 */
class Unbound {
  constructor (value) {
    this._value = value
  }
}

// ------------------------------------------------------------------------------------------------

Unbound.toString() // Preserves the class name during compilation

const NativeUnbound = Repository._installNative(Unbound)

module.exports = NativeUnbound
