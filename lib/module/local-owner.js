/**
 * local-key.js
 *
 * The default key to sign P2PKH outputs
 */

const { PrivateKey, PublicKey, Address } = require('bsv')
const { _bsvNetwork } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// LocalOwner
// ------------------------------------------------------------------------------------------------

class LocalOwner {
  constructor (keyOrAddress, network) {
    const bsvNetwork = _bsvNetwork(network)

    // Generate a random key if none is specified
    keyOrAddress = keyOrAddress || new PrivateKey(bsvNetwork)

    // Try creating the private key on mainnet and testnet
    try {
      this.bsvPrivateKey = new PrivateKey(keyOrAddress, bsvNetwork)
      // If the private key does not match what's passed in, then it's not a private key
      if (this.bsvPrivateKey.toString() !== keyOrAddress.toString()) throw new Error()
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
      this.bsvPublicKey = new PublicKey(keyOrAddress, { network: bsvNetwork })
      this.bsvAddress = this.bsvPublicKey.toAddress()
      this.pubkey = this.bsvPublicKey.toString()
      this.address = this.bsvAddress.toString()
      return this
    } catch (e) { }

    // Try creating from an address
    try {
      this.bsvAddress = new Address(keyOrAddress, bsvNetwork)
      this.address = this.bsvAddress.toString()
      return this
    } catch (e) {
      if (e.message === 'Address has mismatched network type') throw e
    }

    throw new Error(`Bad owner key or address: ${keyOrAddress}`)
  }

  get locks () {
    return [this.address]
  }

  async sign (tx) {
    if (!this.bsvPrivateKey) throw new Error('Cannot sign. LocalKey does not have a private key declared.')
    tx.sign(this.bsvPrivateKey)
    return tx
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalOwner
