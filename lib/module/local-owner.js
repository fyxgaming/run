/**
 * local-owner.js
 *
 * Default implementation of the Owner API
 */

const { PrivateKey, PublicKey, Address, Script } = require('bsv')
const { _bsvNetwork } = require('../util/misc')
const StandardLock = require('../util/standard-lock')

// ------------------------------------------------------------------------------------------------
// LocalOwner
// ------------------------------------------------------------------------------------------------

/**
 * An owner that is derived from a local private key
 */
class LocalOwner {
  /**
   * Creates a new LocalOwner
   * @param {object} options Owner configuration
   * @param {string} owner Private key, public key, or address
   * @param {?Blockchain} options.blockchain Blockchain
   */
  constructor (options = {}) {
    this._blockchain = options.blockchain
    const bsvNetwork = this._blockchain && _bsvNetwork(this._blockchain.network)

    // Generate a random key if none is specified
    const owner = options.owner || new PrivateKey(bsvNetwork)

    // Try creating the private key on mainnet and testnet
    try {
      this.bsvPrivateKey = new PrivateKey(owner, bsvNetwork)
      // If the private key does not match what's passed in, then it's not a private key
      if (this.bsvPrivateKey.toString() !== owner.toString()) throw new Error()
      this.bsvPublicKey = this.bsvPrivateKey.publicKey
      this.bsvAddress = this.bsvPublicKey.toAddress()
      this.privkey = this.bsvPrivateKey.toString()
      this.pubkey = this.bsvPublicKey.toString()
      this.address = this.bsvAddress.toString()
      return this
    } catch (e) {
      if (e.message === 'Private key network mismatch') throw e
    }

    // Try creating from a public key
    try {
      this.bsvPublicKey = new PublicKey(owner, { network: bsvNetwork })
      this.bsvAddress = this.bsvPublicKey.toAddress()
      this.pubkey = this.bsvPublicKey.toString()
      this.address = this.bsvAddress.toString()
      return this
    } catch (e) { }

    // Try creating from an address
    try {
      this.bsvAddress = new Address(owner, bsvNetwork)
      this.address = this.bsvAddress.toString()
      return this
    } catch (e) {
      if (e.message === 'Address has mismatched network type') throw e
    }

    throw new Error(`Bad owner: ${owner}`)
  }

  next () { return this.address }

  async sign (tx, locks) {
    // TODO: Write this
    // Cache sigs
    // tx.signature(n) -> Buffer
    // asm(`${sig} ${pubkey}`) for Standard

    // Sign all standard locks, then group locks
    // Test group lock

    if (!this.bsvPrivateKey) {
      throw new Error('Cannot sign. LocalKey does not have a private key declared.')
    }
    tx.sign(this.bsvPrivateKey)
    return tx
  }

  async locations () {
    if (!this._blockchain) return []
    const script = Script.fromAddress(this.bsvAddress)
    const utxos = await this._blockchain.utxos(script)
    return utxos.map(utxo => `${utxo.txid}_o${utxo.vout}`)
  }

  ours (lock) {
    return lock instanceof StandardLock && lock.address === this.address
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalOwner
