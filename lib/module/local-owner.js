/**
 * local-owner.js
 *
 * Default implementation of the Owner API
 */

const { PrivateKey, PublicKey, Address, Script } = require('bsv')
const { _bsvNetwork } = require('../util/misc')

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
    if (!this.bsvPrivateKey) {
      throw new Error('Cannot sign. LocalKey does not have a private key declared.')
    }

    for (let i = 0; i < tx.inputs.length; i++) {
      // TODO: Should use actual types
      const lockName = locks[i] && locks[i].constructor.name

      // Sign P2PKH inputs
      if (lockName === 'StandardLock' && locks[i].address === this.address) {
        const sig = tx.signature(i, this.bsvPrivateKey).toString('hex')
        const script = Script.fromASM(`${sig} ${this.pubkey}`)
        tx.inputs[i].setScript(script)
      }

      // Sign multi-sig inputs
      if (lockName === 'GroupLock' && locks[i].pubkeys.includes(this.pubkey) &&
          tx.inputs[i].script.chunks.length <= locks[i].m) {
        const sig = tx.signature(i, this.bsvPrivateKey).toString('hex')

        let script = null

        if (tx.inputs[i].script.toBuffer().length) {
          script = Script.fromASM(`${tx.inputs[i].script.toASM()} ${sig}`)
        } else {
          script = Script.fromASM(`OP_0 ${sig}`)
        }

        tx.inputs[i].setScript(script)
      }
    }

    return tx
  }

  async locations () {
    if (!this._blockchain) return []
    const script = Script.fromAddress(this.bsvAddress)
    const utxos = await this._blockchain.utxos(script)
    return utxos.map(utxo => `${utxo.txid}_o${utxo.vout}`)
  }

  ours (lock) {
    return lock.constructor.name === 'StandardLock' && lock.address === this.address
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalOwner
