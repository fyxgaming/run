/**
 * local-owner.js
 *
 * Default implementation of the Owner API
 */

const { PrivateKey, Script, Transaction } = require('bsv')
const { _bsvNetwork, _display } = require('../util/misc')
const { _populatePreviousOutputs } = require('../util/bsv')

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
   * @param {?string|PrivateKey} privkey A private key string or object, or undefined to generate
   * @param {?Blockchain} options.blockchain Optional blockchain
   */
  constructor (options = {}) {
    this.blockchain = options.blockchain

    // Check that the private key passed in is one of our suported types
    if (typeof options.privkey !== 'undefined' && typeof options.privkey !== 'string' &&
      !(options.privkey instanceof PrivateKey)) {
      throw new Error(`Invalid private key: ${_display(options.privkey)}`)
    }

    // Check the network matches if we've received a private key
    const bsvNetwork = this.blockchain && _bsvNetwork(this.blockchain.network)
    if (bsvNetwork && options.privkey && options.privkey instanceof PrivateKey &&
      options.privkey.network.name !== bsvNetwork) {
      throw new Error('Private key network mismatch')
    }

    // Generate a random key if none is specified
    try {
      this.bsvPrivateKey = new PrivateKey(options.privkey, bsvNetwork)
    } catch (e) {
      throw new Error(`Invalid private key: ${_display(options.privkey)}\n\n${e}`)
    }

    // If the private key does not match what's passed in, then it's not a private key
    if (options.privkey && this.bsvPrivateKey.toString() !== options.privkey.toString()) {
      throw new Error(`Invalid private key: ${_display(options.privkey)}`)
    }

    // Setup a bunch of other useful properties
    this.bsvPublicKey = this.bsvPrivateKey.publicKey
    this.bsvAddress = this.bsvPublicKey.toAddress()
    this.privkey = this.bsvPrivateKey.toString()
    this.pubkey = this.bsvPublicKey.toString()
    this.address = this.bsvAddress.toString()
  }

  async sign (txhex, locks) {
    const tx = new Transaction(txhex)

    await _populatePreviousOutputs(tx, this.blockchain)

    for (let i = 0; i < tx.inputs.length; i++) {
      // TODO: Should use actual types
      const lockName = locks[i] && locks[i].constructor.name

      // Sign P2PKH inputs
      if (lockName === 'StandardLock' && locks[i].address === this.address) {
        // The signature method should be present, but if we're using standard bsv, we can still fall back tosign
        if (tx.signature) {
          const sig = tx.signature(i, this.bsvPrivateKey).toString('hex')
          const script = Script.fromASM(`${sig} ${this.pubkey}`)
          tx.inputs[i].setScript(script)
        } else {
          tx.sign(this.bsvPrivateKey)
        }
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

    return tx.toBuffer().toString('hex')
  }

  owner () { return this.address }
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalOwner
