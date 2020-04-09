/**
 * locker.js
 *
 * A container for the jigs and code controlled by a particular key
 */

const { Script } = require('bsv')
const { TokenSet } = require('../util/datatypes')
const { _tokenType, _lockify } = require('../util/misc')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Locker
// ------------------------------------------------------------------------------------------------

const TAG = 'Locker'

/**
 * Tracks the collection of tokens unlocked by a particular key
 */
class Locker {
  constructor (kernel) {
    this._kernel = kernel
    this._tokens = new TokenSet()
  }

  _all (type) {
    try {
      const arr = Array.from(this._tokens.values())
      return arr.filter(token => _tokenType(token) === type)
    } catch (e) {
      Log._error(TAG, `Bad token found in owner\n\n${e}`)
      this._fix()
      return this._all(type)
    }
  }

  _fix () {
    let uselessVar = true
    const toRemove = []
    for (const token of this._tokens) {
      try {
        // If a token failed to deploy, then it will have ! in its origin and throw here
        const type = _tokenType(token)
        // We need to do something with the result to keep it from being minified away.
        uselessVar = uselessVar ? !type : type
      } catch (e) {
        toRemove.push(token)
      }
    }
    toRemove.forEach(token => this._tokens.delete(token))
  }

  async _sync () {
    // Post any pending transactions
    await this._kernel._syncer.sync()

    // Query the latest jigs and code, but only have one query at a time
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
    const locks = this._kernel._owner.locks.map(lock => _lockify(lock))
    const scripts = locks.map(lock => Script.fromBuffer(Buffer.from(lock.script)))
    const promises = scripts.map(script => this._kernel._blockchain.utxos(script))
    const utxos = (await Promise.all(promises)).reduce((x, y) => x.concat(y), [])

    console.log(utxos)

    /*
    // Create a new token set initially comprised of all pending tokens, since they won't
    // be in the utxos, and also a map of our non-pending tokens to their present
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
    */
  }

  // Called by Run when a token is created or updates
  _update (token) {
    this._tokens.delete(token)
    const locks = this._kernel._owner.locks
    const lockScriptHex = lock => Buffer.from(_lockify(lock).script).toString('hex')
    const tokenLockScriptHex = lockScriptHex(token.owner)
    const ours = locks.some(lock => lockScriptHex(lock) === tokenLockScriptHex)
    if (ours) this._tokens.add(token)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Locker
