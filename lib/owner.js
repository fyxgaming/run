/**
 * owner.js
 *
 * Owner API that manages jigs and signs transactions
 */

const bsv = require('bsv')

class Owner {
  constructor (keyOrAddress, bsvNetwork, logger) {
    this.logger = logger

    // Try creating the private key on mainnet and testnet
    try {
      const bsvPrivateKey = new bsv.PrivateKey(keyOrAddress, bsvNetwork)
      if (bsvPrivateKey.toString() !== keyOrAddress.toString()) throw new Error()
      return this._fromPrivateKey(bsvPrivateKey)
    } catch (e) {
      if (e.message === 'Private key network mismatch') throw e
    }

    // Try creating from a public key
    try {
      return this._fromPublicKey(new bsv.PublicKey(keyOrAddress, { network: bsvNetwork }))
    } catch (e) { }

    // Try creating from an address
    try {
      return this._fromAddress(new bsv.Address(keyOrAddress, bsvNetwork))
    } catch (e) {
      if (e.message === 'Address has mismatched network type.') throw e
    }

    throw new Error(`bad owner key or address: ${keyOrAddress}`)
  }

  _fromPrivateKey (bsvPrivateKey) {
    this.bsvPrivateKey = bsvPrivateKey
    this.privkey = bsvPrivateKey.toString()
    return this._fromPublicKey(bsvPrivateKey.publicKey)
  }

  _fromPublicKey (bsvPublicKey) {
    this.bsvPublicKey = bsvPublicKey
    this.pubkey = bsvPublicKey.toString()
    return this._fromAddress(bsvPublicKey.toAddress())
  }

  _fromAddress (bsvAddress) {
    this.bsvAddress = bsvAddress
    this.address = bsvAddress.toString()

    // Each ref should only be stored once. If we have an origin, prefer it
    this.refs = new Map() // origin|Jig|Class -> Jig|Class

    const Run = require('.')
    this.run = Run.instance
    return this
  }

  get jigs () {
    try {
      return Array.from(this.refs.values())
        .filter(ref => ref instanceof this.run.constructor.Jig)
    } catch (e) {
      this.logger.error(`Bad token found in owner refs. Removing.\n\n${e}`)
      this._removeErrorRefs()
      return this.jigs
    }
  }

  get code () {
    try {
      return Array.from(this.refs.values())
        .filter(ref => !(ref instanceof this.run.constructor.Jig))
    } catch (e) {
      this.logger.error(`Bad token found in owner refs. Removing.\n\n${e}`)
      this._removeErrorRefs()
      return this.code
    }
  }

  _removeErrorRefs () {
    let uselessVar = true
    const toRemove = []
    for (const [key, ref] of this.refs) {
      try {
        // If a ref failed to deploy, then it will have ! in its origin and throw here
        const isJig = ref instanceof this.run.constructor.Jig
        // We need to do something with the result to keep it from being minified away.
        uselessVar = uselessVar ? !isJig : isJig
      } catch (e) {
        toRemove.push(key)
      }
    }
    toRemove.forEach(key => this.refs.delete(key))
  }

  async sync () {
    // post any pending transactions
    await this.run.syncer.sync()

    // query the latest jigs and code, but only do once at a time
    if (!this._query) {
      this._query = new Promise((resolve, reject) => {
        this._queryLatest()
          .then(() => { this._query = null; resolve() })
          .catch(e => { this._query = null; reject(e) })
      })
    }
    return this._query
  }

  async _queryLatest () {
    const newUtxos = await this.run.blockchain.utxos(this.bsvAddress)

    // create a new ref set initially comprised of all pending refs, since they won't
    // be in the utxos, and also a map of our non-pending jigs to their present
    // locations so we don't reload them.
    const newRefs = new Map()
    const locationMap = new Map()
    for (const [key, ref] of this.refs) {
      if (typeof key !== 'string') newRefs.set(key, ref)
      try { locationMap.set(ref.location, ref) } catch (e) { }
    }

    // load each new utxo, and if we come across a jig we already know, re-use it
    for (const utxo of newUtxos) {
      const location = `${utxo.txid}_o${utxo.vout}`
      const prevRef = locationMap.get(location)
      if (prevRef) {
        newRefs.delete(prevRef)
        newRefs.set(location, prevRef)
        continue
      }
      try {
        const ref = await this.run.load(location)
        newRefs.set(ref.origin, ref)
      } catch (e) {
        this.logger.error(`Failed to load owner location ${location}\n\n${e.toString()}`)
      }
    }

    this.refs = newRefs
  }

  _update (ref) {
    this.refs.delete(ref)
    try {
      if (ref.owner === this.pubkey) {
        try {
          if (typeof ref.origin === 'undefined') throw new Error()
          if (ref.origin.startsWith('_')) throw new Error()
          this.refs.set(ref.origin, ref)
        } catch (e) { this.refs.set(ref, ref) }
      } else {
        try { this.refs.delete(ref.origin) } catch (e) { }
      }
    } catch (e) { }
  }
}

module.exports = Owner
