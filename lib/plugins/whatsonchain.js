/**
 * whatsonchain.js
 *
 * WhatsOnChain Blockchain API
 */

const bsv = require('bsv')
const { Cache } = require('../kernel/api')
const LocalCache = require('./local-cache')
const BrowserCache = require('./browser-cache')
const { _browser, _text } = require('../util/misc')
const { _scripthash, _dedupUtxos } = require('../util/bsv')
const RecentBroadcasts = require('../util/recent-broadcasts')
const REST = require('../util/rest')
const Log = require('../util/log')
const { RequestError, NotImplementedError } = require('../util/errors')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'WhatsOnChain'

const REQUEST_DEDUP_CACHE = {}
const REQUEST_RESULT_CACHE = {}
const REQUEST_CACHE_DURATION = 1000

// ------------------------------------------------------------------------------------------------
// WhatsOnChain
// ------------------------------------------------------------------------------------------------

class WhatsOnChain {
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
    this.api = 'whatsonchain'
    this.apiKey = options.apiKey
    this.network = _parseNetwork(options.network)
    this.cache = _parseCache(options.cache)

    // Copy the previous cache and known broadcasted transactions if possible
    if (options.lastBlockchain && this.network === options.lastBlockchain.network) {
      this.cache = options.lastBlockchain.cache
    }
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
    const url = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/raw`
    const txid = await REST._post(url, { txhex: rawtx }, undefined, _headers(this.apiKey))

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
    cacheSets.push(RecentBroadcasts._addToCache(tx, txid, this.cache))

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

    if (this.network === 'stn') {
      if (Log._warnOn) Log._warn(TAG, 'Utxos are not available on STN')
      return []
    }

    const utxos = await _fetchAndCacheUtxos(scripthash, bsvScript.toHex(), this.network, this.cache, this.apiKey)

    return await RecentBroadcasts._correctServerUtxos(this.cache, utxos, script)
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
    if (Log._debugOn) Log._debug(TAG, 'Spends', txid, vout)
    throw new NotImplementedError('WhatsOnChain API does not support spends')
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

async function _fetchAndCacheTransactionData (txid, network, cache, apiKey) {
  const key = `tx-${network}-${txid}`

  return REST._dedup(REQUEST_DEDUP_CACHE, key, async () => {
    // Cache 404s for 1 second to speed up loads
    return REST._cache(REQUEST_RESULT_CACHE, key, REQUEST_CACHE_DURATION, async () => {
      try {
        // Fetch
        const jsonUrl = `https://api.whatsonchain.com/v1/bsv/${network}/tx/hash/${txid}`
        const hexUrl = `https://api.whatsonchain.com/v1/bsv/${network}/tx/${txid}/hex`
        const [jsonResult, hexResult] = await Promise.all([
          REST._get(jsonUrl, undefined, _headers(apiKey)),
          REST._get(hexUrl, undefined, _headers(apiKey))
        ])
        const data = {
          rawtx: hexResult,
          time: jsonResult.time * 1000 || Date.now()
        }

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
        if (e instanceof RequestError && (e.status === 404 || e.status === 500)) {
          throw new Error('No such mempool or blockchain transaction')
        } else {
          throw e
        }
      }
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
      const url = `https://api.whatsonchain.com/v1/bsv/${network}/script/${scripthash}/unspent`
      const data = await REST._get(url, undefined, _headers(apiKey))
      const utxos = data.map(o => { return { txid: o.tx_hash, vout: o.tx_pos, satoshis: o.value, script } })

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

function _headers (apiKey) {
  return apiKey ? { 'woc-api-key': apiKey } : {}
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function _parseNetwork (network) {
  if (typeof network === 'undefined') return 'main'
  if (network !== 'main' && network !== 'test' && network !== 'stn') throw new Error(`Unsupported network: ${network}`)
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

module.exports = WhatsOnChain
