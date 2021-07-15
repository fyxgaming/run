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
const request = require('../util/request')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'MatterCloud'

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
    this.apiKey = _parseApiKey(options.apiKey)
    this.network = _parseNetwork(options.network)
    this.cache = _parseCache(options.cache)
    this.request = request
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
    const options = { method: 'POST', body: { rawtx } }
    const result = await this.request(url, options)
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

    const data = await _fetchAndCacheTransactionData(txid, this.network, this.request, this.cache, this.apiKey)
    return data.rawtx
  }

  // --------------------------------------------------------------------------

  async utxos (script) {
    script = _parseScript(script)

    const scripthash = await _scripthash(script)
    const utxos = await _fetchAndCacheUtxos(scripthash, script, this.network, this.request, this.cache, this.apiKey)

    await RecentBroadcasts._correctUtxosUsingCache(this.cache, utxos, script)

    return utxos
  }

  // --------------------------------------------------------------------------

  async time (txid) {
    const cachedTime = await this.cache.get(`time://${txid}`)
    if (cachedTime) return cachedTime

    const data = await _fetchAndCacheTransactionData(txid, this.network, this.request, this.cache, this.apiKey)
    return data.time
  }

  // --------------------------------------------------------------------------

  async spends (txid, vout) {
    const cachedSpend = await this.cache.get(`spend://${txid}_o${vout}`)
    if (cachedSpend) return cachedSpend

    return await _fetchAndCacheSpend(txid, vout, this.network, this.request, this.cache, this.apiKey)
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

async function _fetchAndCacheTransactionData (txid, network, request, cache, apiKey) {
  const response = async json => {
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
  }

  try {
    const url = `https://api.mattercloud.net/api/v3/${network}/tx/${txid}${_suffix(apiKey)}`
    const options = { cache: 1000, response }
    return await request(url, options)
  } catch (e) {
    if (e instanceof RequestError && e.status === 404) {
      throw new Error('No such mempool or blockchain transaction')
    } else {
      throw e
    }
  }
}

// ------------------------------------------------------------------------------------------------

async function _fetchAndCacheSpend (txid, vout, network, request, cache, apiKey) {
  const response = async json => {
    const spend = json.result[location].spend_txid || null
    if (spend) await cache.set(`spend://${txid}_o${vout}`, spend)
    return spend
  }

  // Fetch spends and cache them for 1 second to speed up loads
  const location = `${txid}_o${vout}`
  const url = `https://txdb.mattercloud.io/api/v1/spends/${location}${_suffix(apiKey)}`
  const options = { cache: 1000, response }
  return await request(url, options)
}

// ------------------------------------------------------------------------------------------------

async function _fetchAndCacheUtxos (scripthash, script, network, request, cache, apiKey) {
  // Fetch UTXOs and cache them for 1 second to prevent too frequent updates
  const url = `https://api.mattercloud.net/api/v3/${network}/scripthash/${scripthash}/utxo${_suffix(apiKey)}`
  const data = await request(url, { cache: 1000 })
  const utxos = data.map(o => Object.assign({}, o, { script }))

  // Verify
  if (!Array.isArray(utxos)) throw new Error(`Received invalid utxos: ${utxos}`)

  // Dedup
  const dedupedUtxos = _dedupUtxos(utxos)

  // Return
  return dedupedUtxos
}

// ------------------------------------------------------------------------------------------------

function _suffix (apiKey) {
  return apiKey ? `?api_key=${apiKey}` : ''
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function _parseApiKey (apiKey) {
  if (typeof apiKey === 'undefined' || typeof apiKey === 'string') return apiKey
  throw new Error(`Invalid API key: ${apiKey}`)
}

// ------------------------------------------------------------------------------------------------

function _parseNetwork (network) {
  if (typeof network === 'undefined') return 'main'
  if (typeof network !== 'string') throw new Error(`Invalid network: ${network}`)
  if (network !== 'main') throw new Error(`MatterCloud API does not support the "${network}" network`)
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
      return bsv.Script.fromAddress(script).toHex()
    } catch (e) {
      return new bsv.Script(script).toHex()
    }
  } else if (script instanceof bsv.Address) {
    script = bsv.Script.fromAddress(script).toHex()
  } else if (script instanceof bsv.Script) {
    return script.toHex()
  } else {
    throw new Error(`Invalid script: ${_text(script)}`)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = MatterCloud
