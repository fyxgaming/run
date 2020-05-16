/**
 * local-owner.js
 *
 * Default implementation of the Owner API
 */

const { PrivateKey, Script, Transaction } = require('bsv')
const { _bsvNetwork, _display } = require('../util/misc')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// LocalOwner
// ------------------------------------------------------------------------------------------------

const TAG = 'LocalOwner'

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

  async sign (rawtx, parents) {
    const tx = new Transaction(rawtx)

    Log._info(TAG, 'Signing', tx.hash)

    // Populate previous outputs
    parents.forEach((parent, n) => {
      if (!parent) return

      tx.inputs[n].output = new Transaction.Output({
        satoshis: parent.satoshis,
        script: new Script(parent.script)
      })
    })

    for (let i = 0; i < tx.inputs.length; i++) {
      const parent = parents[i]
      if (!parent) continue

      // TODO: Should use actual types
      const lockName = parent.lock && parent.lock.constructor.name

      // Sign P2PKH inputs
      const isStandardLock = lockName === 'StandardLock' && parent.lock.address === this.address
      const isPayToPublicKeyHashOut = tx.inputs[i].output &&
      tx.inputs[i].output.script.isPublicKeyHashOut() &&
        tx.inputs[i].output.script.toAddress().toString() === this.address
      if (isStandardLock || isPayToPublicKeyHashOut) {
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
      if (lockName === 'GroupLock' && parent.lock.pubkeys.includes(this.pubkey) &&
          tx.inputs[i].script.chunks.length <= parent.lock.m) {
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

    return tx.toString('hex')
  }

  owner () { return this.address }
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalOwner
