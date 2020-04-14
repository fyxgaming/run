/**
 * lock-owner.js
 *
 * A Run owner that is just a wrapper around a custom lock
 */

const { _lockify, _display } = require('../util/misc')
const bsv = require('bsv')
const { Script } = bsv
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// LockOwner
// ------------------------------------------------------------------------------------------------

const TAG = 'LockOwner'

class LockOwner {
  constructor (options = {}) {
    this.lock = _lockify(options.owner)
    this.blockchain = options.blockchain
    this.script = new Script(bsv.deps.Buffer.from(this.lock.script))
  }

  next () { return this.lock }

  async sign (tx, locks) {
    Log._warn(TAG, 'LockOwner cannot sign with', _display(this.lock))
    return tx
  }

  async locations () {
    if (this.blockchain) {
      const utxos = await this.blockchain.utxos(this.script)
      console.log(utxos)
    }
  }

  ours (lock) {
    // Compare
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = LockOwner
