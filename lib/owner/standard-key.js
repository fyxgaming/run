/**
 * standard-key.js
 * 
 * The default lock and key used for jigs: P2PKH outputs.
 */

// ------------------------------------------------------------------------------------------------
// StandardKey
// ------------------------------------------------------------------------------------------------

class StandardKey {
  constructor (keyOrAddress, network) {
    const bsvNetwork = _bsvNetwork(network)
    keyOrAddress = keyOrAddress || new bsv.PrivateKey(bsvNetwork)

    // Try creating the private key on mainnet and testnet
    try {
      const bsvPrivateKey = new bsv.PrivateKey(keyOrAddress, bsvNetwork)
      if (bsvPrivateKey.toString() !== keyOrAddress.toString()) throw new Error()
      return this.setupFromPrivateKey(bsvPrivateKey)
    } catch (e) {
      if (e.message === 'Private key network mismatch') throw e
    }

    // Try creating from a public key
    try {
      return this.setupFromPublicKey(new bsv.PublicKey(keyOrAddress, { network: bsvNetwork }))
    } catch (e) { }

    // Try creating from an address
    try {
      return this.setupFromAddress(new bsv.Address(keyOrAddress, bsvNetwork))
    } catch (e) {
      if (e.message === 'Address has mismatched network type.') throw e
    }

    throw new Error(`bad owner key or address: ${keyOrAddress}`)
  }

  setupFromPrivateKey (bsvPrivateKey) {
    this.bsvPrivateKey = bsvPrivateKey
    this.privkey = bsvPrivateKey.toString()
    return this.setupFromPublicKey(bsvPrivateKey.publicKey)
  }

  setupFromPublicKey (bsvPublicKey) {
    this.bsvPublicKey = bsvPublicKey
    this.pubkey = bsvPublicKey.toString()
    return this.setupFromAddress(bsvPublicKey.toAddress())
  }

  setupFromAddress (bsvAddress) {
    this.bsvAddress = bsvAddress
    this.address = bsvAddress.toString()
    return this
  }

  get locks () {
    // return new AddressLock(this.address)
    return [this.address]
  }

  async sign (tx) {
    if (!this.bsvPrivateKey) throw new Error('Cannot sign. Owner does not have a private key declared.')
    tx.sign(this.bsvPrivateKey)
    return tx
  }
}


// ------------------------------------------------------------------------------------------------