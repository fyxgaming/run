/**
 * local-owner.js
 *
 * Default implementation of the Owner API
 */

const { PrivateKey, Script, Transaction } = require('bsv')
const { _bsvNetwork, _text, _kernel } = require('../util/misc')
const { _signature } = require('../util/bsv')
const StandardLock = require('../util/standard-lock')
const Group = require('../extra/group')

// ------------------------------------------------------------------------------------------------
// LocalOwner
// ------------------------------------------------------------------------------------------------

/**
 * An owner that is derived from a local private key
 */
class LocalOwner {
  /**
   * Creates a new LocalOwner
   * @param {?string|PrivateKey} privkey A private key string or object, or undefined to generate
   * @param {?string} network Optional blockchain network to use if generating a privkey
   */
  constructor (privkey, network = undefined) {
    // Get network if don't have one
    try { network = network || _kernel()._blockchainAPI().network } catch (e) { }
    const bsvNetwork = network && _bsvNetwork(network)

    // Check that the private key passed in is one of our suported types
    if (typeof privkey !== 'undefined' && typeof privkey !== 'string' && !(privkey instanceof PrivateKey)) {
      throw new Error(`Invalid private key: ${_text(privkey)}`)
    }

    // Check the network matches if we've received a private key
    if (bsvNetwork && privkey && privkey instanceof PrivateKey && privkey.network.name !== bsvNetwork) {
      throw new Error('Private key network mismatch')
    }

    // Generate a random key if none is specified
    try {
      this.bsvPrivateKey = new PrivateKey(privkey, bsvNetwork)
    } catch (e) {
      throw new Error(`Invalid private key: ${_text(privkey)}\n\n${e}`)
    }

    // If the private key does not match what's passed in, then it's not a private key
    if (privkey && this.bsvPrivateKey.toString() !== privkey.toString()) {
      throw new Error(`Invalid private key: ${_text(privkey)}`)
    }

    // Setup a bunch of other useful properties
    this.bsvPublicKey = this.bsvPrivateKey.publicKey
    this.bsvAddress = this.bsvPublicKey.toAddress()
    this.privkey = this.bsvPrivateKey.toString()
    this.pubkey = this.bsvPublicKey.toString()
    this.address = this.bsvAddress.toString()
  }

  // --------------------------------------------------------------------------

  async sign (rawtx, parents, locks) {
    const tx = new Transaction(rawtx)

    // Populate previous outputs
    parents.forEach((parent, n) => {
      if (!parent) return

      tx.inputs[n].output = new Transaction.Output({
        satoshis: parent.satoshis,
        script: new Script(parent.script)
      })
    })

    for (let i = 0; i < tx.inputs.length; i++) {
      // Sign P2PKH inputs

      const isStandardLock = locks[i] instanceof StandardLock

      const isPayToPublicKeyHashOut = tx.inputs[i].output &&
        tx.inputs[i].output.script.isPublicKeyHashOut() &&
        tx.inputs[i].output.script.toAddress().toString() === this.address

      if (isStandardLock || isPayToPublicKeyHashOut) {
        const parentScript = new Script(parents[i].script)
        if (parentScript.toAddress().toString() !== this.address) continue

        const sig = _signature(tx, i, parentScript, parents[i].satoshis, this.bsvPrivateKey)
        const script = Script.fromASM(`${sig} ${this.pubkey}`)
        tx.inputs[i].setScript(script)
      }

      // Sign multi-sig inputs

      const isGroup = locks[i] instanceof Group &&
        locks[i].pubkeys.includes(this.pubkey) &&
        tx.inputs[i].script.chunks.length <= locks[i].required

      if (isGroup) {
        const parentScript = new Script(parents[i].script)
        const sig = _signature(tx, i, parentScript, parents[i].satoshis, this.bsvPrivateKey)

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

  // --------------------------------------------------------------------------

  async nextOwner () { return this.address }
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalOwner
