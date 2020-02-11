/**
 * owner.js
 *
 * Owner API that manages jigs and signs transactions
 */

const bsv = require('bsv')
const util = require('./util')

// ------------------------------------------------------------------------------------------------
// Script API
// ------------------------------------------------------------------------------------------------

/**
 * API that all custom scripts need to implement to become jig owners
 */
class Script {
  /**
   * Calculates a buffer for the script. This should be calculated on-demand.
   * @returns {Uint8Array} Uint8Array script
   */
  getBuffer () {
    throw new Error('Not implemented')
  }
}

// ------------------------------------------------------------------------------------------------
// P2PKH Script
// ------------------------------------------------------------------------------------------------

class AddressScript {
  constructor (address) {
    this.address = address
  }

  getBuffer () {
    // Based on https://gist.github.com/diafygi/90a3e80ca1c2793220e5/
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    var d = [] // the array for storing the stream of decoded bytes
    var b = [] // the result byte array that will be returned
    var i // the iterator variable for the base58 string
    var j // the iterator variable for the byte array (d)
    var c // the carry amount variable that is used to overflow from the current byte to the next byte
    var n // a temporary placeholder variable for the current byte
    const s = this.address
    for (i in s) { // loop through each base58 character in the input string
      j = 0 // reset the byte iterator
      c = A.indexOf(s[i]) // set the initial carry amount equal to the current base58 digit
      if (c < 0) throw new Error(`Invalid base58 char: ${s[i]}`) // see if each char is base 58
      if (!(c || b.length ^ i)) b.push(0) // prepend the result array with a zero if the base58 digit is zero and non-zero characters haven't been seen yet (to ensure correct decode length)
      while (j in d || c) { // start looping through the bytes until there are no more bytes and no carry amount
        n = d[j] // set the placeholder for the current byte
        n = n ? n * 58 + c : c // shift the current byte 58 units and add the carry amount (or just add the carry amount if this is a new byte)
        c = n >> 8 // find the new carry amount (1-byte shift of current byte value)
        d[j] = n % 256 // reset the current byte to the remainder (the carry amount will pass on the overflow)
        j++ // iterate to the next byte
      }
    }
    while (j--) { b.push(d[j]) } // since the byte array is backwards, loop through it in reverse order, and append
    if (b.length < 6) throw new Error(`Base58 check string too short: ${b.length}`)
    // TODO: Verify the checksum. To do this, we need an onchain sha256.
    if (b[0] !== 0 && b[0] !== 111) throw new Error('P2SH addresses are not supported')
    const hash160 = b.slice(1, b.length - 4)
    const script = [118, 169, ...hash160, 135, 172] // OP_DUP OP_HASH160 <PKH> OP_EQUAL OP_CHECKSIG
    return new Uint8Array(script)
  }
}

// ------------------------------------------------------------------------------------------------
// P2PKH Script
// ------------------------------------------------------------------------------------------------

class PubKeyScript {
  constructor (pubkey) {
    // Check if string
    this.pubkey = pubkey
  }

  getBuffer () {
    // TODO
  }
}

// ------------------------------------------------------------------------------------------------
// Sign API
// ------------------------------------------------------------------------------------------------

class Sign {
  /**
   * Returns an owner script that is used for new jigs
   * @returns {Script} New owner script
   */
  getScript () {
    throw new Error('Not implemented')
  }

  /**
   * Signs run tokens inputs
   *
   * In a server, maybe it loads the tx to see what it's signing
   * @param {bsv.Transaction} tx Transaction to sign
   * @returns {bsv.Transaction} Signed transaction
   */
  async sign (tx) {
    throw new Error('Not implemented')
  }
}

// ------------------------------------------------------------------------------------------------
// Owner wrapper to private syncing and tracking
// ------------------------------------------------------------------------------------------------

/**
 * Base owner class that may be derived from to track jigs and code
 */
class Owner extends Sign {
  constructor () {
    super()

    // Each asset should only be stored once. If we have an origin, prefer it
    this.assets = new Map() // origin|Jig|Class|Function -> Jig|Class|Function
  }

  get run () { return util.activeRunInstance() }
  get logger () { return util.activeRunInstance().logger }

  get jigs () {
    try {
      return Array.from(this.assets.values())
        .filter(asset => asset instanceof this.run.constructor.Jig)
    } catch (e) {
      if (this.logger) this.logger.error(`Bad asset found in owner. Removing.\n\n${e}`)
      this.removeBadAssets()
      return this.jigs
    }
  }

  get code () {
    try {
      return Array.from(this.assets.values())
        .filter(asset => !(asset instanceof this.run.constructor.Jig))
    } catch (e) {
      if (this.logger) this.logger.error(`Bad asset found in owner. Removing.\n\n${e}`)
      this.removeBadAssets()
      return this.code
    }
  }

  removeBadAssets () {
    let uselessVar = true
    const toRemove = []
    for (const [key, asset] of this.assets) {
      try {
        // If a asset failed to deploy, then it will have ! in its origin and throw here
        const isJig = asset instanceof this.run.constructor.Jig
        // We need to do something with the result to keep it from being minified away.
        uselessVar = uselessVar ? !isJig : isJig
      } catch (e) {
        toRemove.push(key)
      }
    }
    toRemove.forEach(key => this.assets.delete(key))
  }

  async sync () {
    // Post any pending transactions
    await this.run.syncer.sync()

    // Query the latest jigs and code, but only have one query at a time
    if (!this.query) {
      this.query = new Promise((resolve, reject) => {
        this.queryLatest()
          .then(() => { this.query = null; resolve() })
          .catch(e => { this.query = null; reject(e) })
      })
    }
    return this.query
  }

  async queryLatest () {
    const queryString = this.address ? this.address
      : bsv.crypto.Hash.sha256(this.getScript()).toString('hex') // script hash
    const newUtxos = await this.run.blockchain.utxos(queryString)

    // Create a new asset set initially comprised of all pending assets, since they won't
    // be in the utxos, and also a map of our non-pending jigs to their present
    // locations so we don't reload them.
    const newAssets = new Map()
    const locationMap = new Map()
    for (const [key, asset] of this.assets) {
      if (typeof key !== 'string') newAssets.set(key, asset)
      try { locationMap.set(asset.location, asset) } catch (e) { }
    }

    // load each new utxo, and if we come across a jig we already know, re-use it
    for (const utxo of newUtxos) {
      const location = `${utxo.txid}_o${utxo.vout}`
      const prevAsset = locationMap.get(location)
      if (prevAsset) {
        newAssets.delete(prevAsset)
        newAssets.set(location, prevAsset)
        continue
      }
      try {
        const asset = await this.run.load(location)
        newAssets.set(asset.origin, asset)
      } catch (e) {
        if (this.logger) this.logger.error(`Failed to load owner location ${location}\n\n${e.toString()}`)
      }
    }

    this.assets = newAssets
  }

  update (asset) {
    this.assets.delete(asset)
    try {
      // TODO: Update this
      if (asset.owner === this.pubkey) {
        try {
          if (typeof asset.origin === 'undefined') throw new Error()
          if (asset.origin.startsWith('_')) throw new Error()
          this.assets.set(asset.origin, asset)
        } catch (e) { this.assets.set(asset, asset) }
      } else {
        try { this.assets.delete(asset.origin) } catch (e) { }
      }
    } catch (e) { }
  }
}

// ------------------------------------------------------------------------------------------------
// P2PKH owner class
// ------------------------------------------------------------------------------------------------

class AddressOwner extends Owner {
  constructor (keyOrAddress, network) {
    super()

    const bsvNetwork = util.bsvNetwork(network)
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
    this.addressScript = new AddressScript(this.address)
    return this
  }

  getScript () {
    return this.addressScript
  }

  async sign (tx) {
    if (!this.bsvPrivateKey) throw new Error('Cannot sign. Owner does not have a private key declared.')
    tx.sign(this.bsvPrivateKey)
    return tx
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { Script, AddressScript, PubKeyScript, Sign, Owner, AddressOwner }
