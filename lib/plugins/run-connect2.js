/**
 * run-connect.js
 *
 * RUN Connect API that can be used as both a Blockchain and Cache implementation
 */

const bsv = require('bsv')
const { Cache } = require('../kernel/api')
const LocalCache = require('./local-cache')
const BrowserCache = require('./browser-cache')
const { _browser, _dedup, _cache } = require('../util/misc')
const REST = require('../util/rest')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const FETCHING_CACHE = {}
const FETCHED_CACHE = {}

// ------------------------------------------------------------------------------------------------
// RunConnect
// ------------------------------------------------------------------------------------------------

class RunConnect {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  /**
   * @param {?object} options Optional configurations options
   * @param {?string} options.network Network string. Defaults to main.
   * @param {?Cache} options.cache Cache object. Defaults to LocalCache or BrowserCache.
   */
  constructor (options = {}) {
    this.api = 'run'
    this.network = _parseNetwork(options.network)
    this.cache = _parseCache(options.cache)
  }

  // --------------------------------------------------------------------------
  // Blockchain API
  // --------------------------------------------------------------------------

  async broadcast (rawtx) {
    // Verify the tx locally. It is faster to find problems here than to wait for a server response.
    const tx = new bsv.Transaction(rawtx)
    if (tx.inputs.length === 0) throw new Error('tx has no inputs')
    if (tx.outputs.length === 0) throw new Error('tx has no outputs')
    if (tx.verify() !== true) throw new Error(tx.verify())

    // Broadcast the transaction
    const txid = await this._postTransaction(rawtx)

    const cacheSets = []

    // Store the transaction time. Allow errors if there are dups.
    const previousTime = await this.cache.get(`time://${txid}`)
    if (typeof previousTime === 'undefined') {
      const promise = this.cache.set(`time://${txid}`, Date.now())
      if (promise instanceof Promise) promise.catch(e => {})
      cacheSets.push(promise)
    }

    // Mark inputs as spent
    for (const input of tx.inputs) {
      const prevtxid = input.prevTxId.toString('hex')
      const location = `${prevtxid}_o${input.outputIndex}`
      cacheSets.push(this.cache.set(`spend://${location}`, txid))
    }

    // Cache the transaction itself
    cacheSets.push(this.cache.set(`tx://${txid}`, rawtx))

    // Wait for all cache updates to finish
    await Promise.all(cacheSets)

    // Put the transaction into a recent broadcast list used to correct server UTXOs
    // this._broadcasts.filter(([tx]) => Date.now() - tx.time < this._indexingDelay)
    // tx.time = Date.now()
    // this._broadcasts.push([tx, txid])

    return txid
  }

  // --------------------------------------------------------------------------

  async fetch (txid) {
    const cachedTx = await this.cache.get(`tx://${txid}`)
    if (cachedTx) return cachedTx

    const data = await _fetchAndCacheTransactionData(txid, this.network, this.cache)
    return data.rawtx
  }

  // --------------------------------------------------------------------------

  async utxos (script) {
    throw new Error('Not implemented')
  }

  // --------------------------------------------------------------------------

  async time (txid) {
    const cachedTime = await this.cache.get(`time://${txid}`)
    if (cachedTime) return cachedTime

    const data = await _fetchAndCacheTransactionData(txid, this.network, this.cache)
    return data.time
  }

  // --------------------------------------------------------------------------

  async spends (txid, vout) {
    const cachedSpend = await this.cache.get(`spend://${txid}_o${vout}`)
    if (cachedSpend) return cachedSpend

    const data = await _fetchAndCacheTransactionData(txid, this.network, this.cache)
    return data.spends[vout]
  }

  // --------------------------------------------------------------------------
  // Cache API
  // --------------------------------------------------------------------------

  async set (key, value) {
    throw new Error('Not implemented')
  }

  // --------------------------------------------------------------------------

  async get (key) {
    throw new Error('Not implemented')
  }
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

async function _fetchAndCacheTransactionData (txid, network, cache) {
  const key = `${network}-${txid}`

  return _dedup(FETCHING_CACHE, key, async () => {
    // Cache 404s and spends for 1 second to speed up loads
    return _cache(FETCHED_CACHE, key, 1000, async () => {
      // Fetch
      const url = `https://api.run.network/v1/${network}/tx/${txid}`
      const json = await REST._get(url)
      const data = {
        rawtx: json.hex,
        time: json.time * 1000 || Date.now(),
        spends: json.vout.map(x => x.spentTxId)
      }

      // Verify
      if (typeof data.rawtx !== 'string' || !data.rawtx.length) throw new Error(`Invalid rawtx fetched for ${data.txid}: ${data.rawtx}`)
      if (typeof data.time !== 'number' || data.time < 0) throw new Error(`Invalid time fetched for ${txid}: ${data.time}`)
      const bsvtx = new bsv.Transaction(data.rawtx)

      // Cache
      const cacheSets = []
      cacheSets.push(cache.set(`tx://${txid}`, data.rawtx))
      cacheSets.push(cache.set(`time://${txid}`, data.time))
      data.spends.forEach((spendtxid, vout) => {
        if (spendtxid) cacheSets.push(cache.set(`spend://${txid}_o${vout}`, spendtxid))
      })
      bsvtx.inputs.forEach(input => {
        const prevtxid = input.prevTxId.toString('hex')
        const location = `${prevtxid}_o${input.outputIndex}`
        cacheSets.push(cache.set(`spend://${location}`, txid))
      })
      await Promise.all(cacheSets)

      // Return
      return data
    })
  })
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function _parseNetwork (network) {
  if (typeof network === 'undefined') return 'main'
  if (network !== 'main' && network !== 'test') throw new Error(`Unsupported network: ${network}`)
  return network
}

// ------------------------------------------------------------------------------------------------

function _parseCache (cache) {
  if (cache instanceof Cache) return cache
  if (typeof cache === 'undefined') return _browser() ? new BrowserCache() : new LocalCache()
  throw new Error(`Unsupported cache: ${cache}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = RunConnect
