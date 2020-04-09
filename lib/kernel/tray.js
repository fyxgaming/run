/**
 * owner.js
 *
 * Owner API that manages jigs and signs transactions
 */

const bsv = require('bsv')
const { _activeRun, _bsvNetwork } = require('../util/misc')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Owner wrapper to private syncing and tracking
// ------------------------------------------------------------------------------------------------

const TAG = 'Owner'

/**
 * Base owner class that may be derived from to track jigs and code
 */
class Owner {
  constructor () {
    // Each asset should only be stored once. If we have an origin, prefer it
    this.assets = new Map() // origin|Jig|Class|Function -> Jig|Class|Function
  }

  get run () { return _activeRun() }

  get jigs () {
    try {
      return Array.from(this.assets.values())
        .filter(asset => asset instanceof this.run.constructor.Jig)
    } catch (e) {
      Log._error(TAG, `Bad asset found in owner. Removing.\n\n${e}`)
      this.removeBadAssets()
      return this.jigs
    }
  }

  get code () {
    try {
      return Array.from(this.assets.values())
        .filter(asset => !(asset instanceof this.run.constructor.Jig))
    } catch (e) {
      Log._error(TAG, `Bad asset found in owner. Removing.\n\n${e}`)
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
    await this.run._kernel._syncer.sync()

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
    // TODO: Query more than one lock?
    let query = this.locks[0]

    // If owner is not an address of pubkey string, then it's a script object
    // We'll query the UTXOs by script hash in this case.
    if (typeof query === 'object') {
      const scriptHash = bsv.crypto.Hash.sha256(Buffer.from(query.script))
      query = scriptHash.toString('hex')
    }

    const newUtxos = await this.run.blockchain.utxos(query)

    // Create a new asset set initially comprised of all pending assets, since they won't
    // be in the utxos, and also a map of our non-pending jigs to their present
    // locations so we don't reload them.
    const newAssets = new Map()
    const locationMap = new Map()
    for (const [key, asset] of this.assets) {
      if (typeof key !== 'string') newAssets.set(key, asset)
      try { locationMap.set(asset.location, asset) } catch (e) { }
    }

    // Load each new utxo, and if we come across a jig we already know, re-use it
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
        Log._error(TAG, `Failed to load owner location ${location}\n\n${e.toString()}`)
      }
    }

    this.assets = newAssets
  }

  update (asset) {
    this.assets.delete(asset)
    try {
      // TODO: Allow more than one lock?
      if (this.sameOwner(asset.owner, this.locks[0])) {
        try {
          if (typeof asset.origin === 'undefined') throw new Error()
          if (asset.origin.startsWith('_')) throw new Error()
          this.assets.set(asset.origin, asset)
        } catch (e) {
          this.assets.set(asset, asset)
        }
      } else {
        try {
          // The owner is not us anymore. Remove it.
          this.assets.delete(asset.origin)
        } catch (e) {}
      }
    } catch (e) {}
  }

  sameOwner (x, y) {
    if (typeof x !== typeof y) return false
    if (typeof x === 'string') return x === y
    if (typeof x !== 'object' || !x) return false
    const xbuf = Buffer.from(x.script)
    const ybuf = Buffer.from(y.script)
    const z = xbuf.toString('hex') === ybuf.toString('hex')
    return z
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { AddressLock, PubKeyLock, Owner, BasicOwner }
