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

/**
 * An owner to wrap a lock. This provides inventory access and the ability to build transactions,
 * but signing will not happen without the keys. Transactions will fail to post.
 */
class LockOwner {
  /**
   * Creates a new LockOwner
   * @param {object} options Owner configuration
   * @param {string|object} owner Address string, pubkey string, or custom lock
   * @param {?Blockchain} options.blockchain Optional blockchain
   */
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
    if (!this.blockchain) return []
    const utxos = await this.blockchain.utxos(this.script)
    return utxos.map(utxo => `${utxo.txid}_o${utxo.vout}`)
  }

  ours (lock) {
    const buf1 = this.script.toBuffer()
    const buf2 = lock.script
    if (buf1.length !== buf2.length) return false
    for (let i = 0; i < buf1.length; i++) {
      if (buf1[i] !== buf2[i]) return false
    }
    return true
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = LockOwner
