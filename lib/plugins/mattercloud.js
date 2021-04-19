/**
 * mattercloud.js
 *
 * MatterCloud Blockchain API
 */

const bsv = require('bsv')
const { Cache } = require('../kernel/api')
const LocalCache = require('./local-cache')
const BrowserCache = require('./browser-cache')
const { _browser, _text } = require('../util/misc')
const { _scripthash, _dedupUtxos } = require('../util/bsv')
const RecentBroadcasts = require('../util/recent-broadcasts')
const { RequestError } = require('../util/errors')
const REST = require('../util/rest')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'MatterCloud'

const REQUEST_DEDUP_CACHE = {}
const REQUEST_RESULT_CACHE = {}
const REQUEST_CACHE_DURATION = 1000

const DUPLICATE_TRANSACTION_ERROR = 'ERROR: Transaction already in the mempool'

// ------------------------------------------------------------------------------------------------
// MatterCloud
// ------------------------------------------------------------------------------------------------

class MatterCloud {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  /**
   * @param {?object} options Optional configurations options
   * @param {?string} options.apiKey API key
   * @param {?string} options.network Network string. Defaults to main.
   * @param {?Cache} options.cache Cache object. Defaults to LocalCache or BrowserCache.
   */
  constructor (options = {}) {
    this.api = 'mattercloud'
    this.apiKey = options.apiKey
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
    const url = `https://merchantapi.mattercloud.net/mapi/tx${_suffix(this.apiKey)}`
    const result = await REST._post(url, { rawtx })
    const payload = JSON.parse(result.payload)
    const txid = payload.txid || tx.hash

    // Detect errors
    if (payload.returnResult === 'failure' && payload.resultDescription !== DUPLICATE_TRANSACTION_ERROR) {
      if (Log._debugOn) Log._debug(TAG, JSON.stringify(payload, 0, 3))
      throw new Error(payload.resultDescription)
    }

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

    // Update our recent broadcasts
    cacheSets.push(RecentBroadcasts._addToCache(this.cache, tx, txid))

    // Wait for all cache updates to finish
    await Promise.all(cacheSets)

    return txid
  }

  // --------------------------------------------------------------------------

  async fetch (txid) {
    const cachedTx = await this.cache.get(`tx://${txid}`)
    if (cachedTx) return cachedTx

    const data = await _fetchAndCacheTransactionData(txid, this.network, this.cache, this.apiKey)
    return data.rawtx
  }

  // --------------------------------------------------------------------------

  async utxos (script) {
    const bsvScript = _parseScript(script)
    const scripthash = await _scripthash(bsvScript)

    const utxos = await _fetchAndCacheUtxos(scripthash, bsvScript.toHex(), this.network, this.cache, this.apiKey)

    return await RecentBroadcasts._correctUtxosUsingCache(this.cache, utxos, script)
  }

  // --------------------------------------------------------------------------

  async time (txid) {
    const cachedTime = await this.cache.get(`time://${txid}`)
    if (cachedTime) return cachedTime

    const data = await _fetchAndCacheTransactionData(txid, this.network, this.cache, this.apiKey)
    return data.time
  }

  // --------------------------------------------------------------------------

  async spends (txid, vout) {
    const cachedSpend = await this.cache.get(`spend://${txid}_o${vout}`)
    if (cachedSpend) return cachedSpend

    return await _fetchAndCacheSpend(txid, vout, this.network, this.cache, this.apiKey)
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

async function _fetchAndCacheTransactionData (txid, network, cache, apiKey) {
  const key = `tx-${network}-${txid}`

  return REST._dedup(REQUEST_DEDUP_CACHE, key, async () => {
    // Cache 404s and spends for 1 second to speed up loads
    return REST._cache(REQUEST_RESULT_CACHE, key, REQUEST_CACHE_DURATION, async () => {
      try {
        // Fetch
        const url = `https://api.mattercloud.net/api/v3/${network}/tx/${txid}${_suffix(apiKey)}`
        const json = await REST._get(url)
        const data = { rawtx: json.rawtx, time: json.time * 1000 }

        // Verify
        if (typeof data.rawtx !== 'string' || !data.rawtx.length) throw new Error(`Invalid rawtx fetched for ${data.txid}: ${data.rawtx}`)
        if (typeof data.time !== 'number' || data.time < 0) throw new Error(`Invalid time fetched for ${txid}: ${data.time}`)
        const bsvtx = new bsv.Transaction(data.rawtx)

        // Cache
        const cacheSets = []
        cacheSets.push(cache.set(`tx://${txid}`, data.rawtx))
        cacheSets.push(cache.set(`time://${txid}`, data.time))
        bsvtx.inputs.forEach(input => {
          const prevtxid = input.prevTxId.toString('hex')
          const location = `${prevtxid}_o${input.outputIndex}`
          cacheSets.push(cache.set(`spend://${location}`, txid))
        })
        await Promise.all(cacheSets)

        // Return
        return data
      } catch (e) {
        if (e instanceof RequestError && e.status === 404) {
          throw new Error('No such mempool or blockchain transaction')
        } else {
          throw e
        }
      }
    })
  })
}

// ------------------------------------------------------------------------------------------------

async function _fetchAndCacheSpend (txid, vout, network, cache, apiKey) {
  const key = `spend-${network}-${txid}_o${vout}`

  return REST._dedup(REQUEST_DEDUP_CACHE, key, async () => {
    // Cache spends for 1 second to speed up loads
    return REST._cache(REQUEST_RESULT_CACHE, key, REQUEST_CACHE_DURATION, async () => {
      const location = `${txid}_o${vout}`
      const url = `https://txdb.mattercloud.io/api/v1/spends/${location}${_suffix(apiKey)}`
      const json = await REST._get(url)

      return json.result[location]
    })
  })
}

// ------------------------------------------------------------------------------------------------

async function _fetchAndCacheUtxos (scripthash, script, network, cache, apiKey) {
  const key = `utxos-${network}-${scripthash}`

  return REST._dedup(REQUEST_DEDUP_CACHE, key, async () => {
    // Cache UTXOs for 1 second to prevent too frequent updates
    return REST._cache(REQUEST_RESULT_CACHE, key, REQUEST_CACHE_DURATION, async () => {
      // Fetch
      const url = `https://api.mattercloud.net/api/v3/${network}/scripthash/${scripthash}/utxo${_suffix(apiKey)}`
      const data = await REST._get(url)
      const utxos = data.map(o => Object.assign({}, o, { script }))

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

function _suffix (apiKey) {
  return apiKey ? `?api_key=${apiKey}` : ''
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function _parseNetwork (network) {
  if (typeof network === 'undefined') return 'main'
  if (network !== 'main') throw new Error(`Unsupported network: ${network}`)
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

module.exports = MatterCloud
