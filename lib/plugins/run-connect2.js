/**
 * run-connect.js
 *
 * RUN Connect API that can be used as both a Blockchain and Cache implementation
 */

const bsv = require('bsv')
const { Cache } = require('../kernel/api')
const LocalCache = require('./local-cache')
const BrowserCache = require('./browser-cache')
const { _browser, _text } = require('../util/misc')
const { _scripthash } = require('../util/bsv')
const {
  _dedupRequest, _cacheResponse, _dedupUtxos, _addToBroadcastCache, _updateUtxosWithBroadcasts
} = require('../util/network')
const REST = require('../util/rest')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const FETCH_DEDUP_CACHE = {}
const FETCH_RESULT_CACHE = {}
const FETCH_CACHE_DURATION = 1000

const UTXOS_DEDUP_CACHE = {}
const UTXOS_RESULT_CACHE = {}
const UTXOS_CACHE_DURATION = 1000

const INDEXING_DELAY = 10000

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
    this._broadcasts = []
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
    const url = `https://api.run.network/v1/${this.network}/tx`
    const txid = await REST._post(url, { rawtx })

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

    // Update our broadcast cache
    _addToBroadcastCache(this._broadcasts, INDEXING_DELAY, txid, tx)

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
    const bsvScript = _parseScript(script)
    const scripthash = await _scripthash(bsvScript)

    const utxos = await _fetchAndCacheUtxos(scripthash, this.network, this.cache)

    return _updateUtxosWithBroadcasts(this._broadcasts, INDEXING_DELAY, utxos, bsvScript)
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

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

async function _fetchAndCacheTransactionData (txid, network, cache) {
  const key = `${network}-${txid}`

  return _dedupRequest(FETCH_DEDUP_CACHE, key, async () => {
    // Cache 404s and spends for 1 second to speed up loads
    return _cacheResponse(FETCH_RESULT_CACHE, key, FETCH_CACHE_DURATION, async () => {
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

async function _fetchAndCacheUtxos (scripthash, network, cache) {
  const key = `${network}-${scripthash}`

  return _dedupRequest(UTXOS_DEDUP_CACHE, key, async () => {
    // Cache UTXOs for 1 second to prevent too frequent updates
    return _cacheResponse(UTXOS_RESULT_CACHE, key, UTXOS_CACHE_DURATION, async () => {
      // Fetch
      const url = `https://api.run.network/v1/${this.network}/utxos/${scripthash}`
      const utxos = await REST._get(url)

      // Verify
      if (!Array.isArray(utxos)) throw new Error(`Received invalid utxos: ${utxos}`)

      // Dedup
      const dedupedUtxos = _dedupUtxos(utxos)

      // Return
      return dedupedUtxos
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

function _parseScript (script) {
  if (typeof script === 'string') {
    try {
      return bsv.Script.fromAddress(script)
    } catch (e) {
      return new bsv.Script(script)
    }
  } else if (script instanceof bsv.Address) {
    script = bsv.Script.fromAddress(script)
  } else if (script instanceof bsv.Script) {
    return script
  } else {
    throw new Error(`Invalid script: ${_text(script)}`)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RunConnect
