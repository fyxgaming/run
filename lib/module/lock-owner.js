/**
 * lock-owner.js
 *
 * A Run owner that is just a wrapper around a custom lock
 */

const { _lockify, _display } = require('../util/misc')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// LockOwner
// ------------------------------------------------------------------------------------------------

const TAG = 'LockOwner'

class LockOwner {
  constructor (owner) {
    this.lock = _lockify(owner)
  }

  next () { return this.lock }

  async sign (tx, locks) {
    Log._warn(TAG, 'LockOwner cannot sign with', _display(this.lock))
    return tx
  }

  async locations () { return [] }

  ours (lock) {
    // Compare
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = LockOwner
