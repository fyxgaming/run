/**
 * whatsonchain.js
 *
 * WhatsOnChain Blockchain API
 */

const bsv = require('bsv')
const { Cache } = require('../kernel/api')
const LocalCache = require('./local-cache')
const BrowserCache = require('./browser-cache')
const { _text } = require('../kernel/misc')
const { _browser } = require('../kernel/environment')
const { _scripthash, _dedupUtxos } = require('../kernel/bsv')
const RecentBroadcasts = require('./recent-broadcasts')
const Log = require('../kernel/log')
const { NotImplementedError } = require('../kernel/errors')
const request = require('./request')
const { _RequestError } = request

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'WhatsOnChain'

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
    const url = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/raw`
    const options = { method: 'POST', body: { txhex: rawtx }, headers: _headers(this.apiKey) }
    const txid = await this.request(url, options)

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
    if (this.network === 'stn') {
      if (Log._warnOn) Log._warn(TAG, 'Utxos are not available on STN')
      return []
    }

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
    if (Log._debugOn) Log._debug(TAG, 'Spends', txid, vout)
    throw new NotImplementedError('WhatsOnChain API does not support spends')
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

async function _fetchAndCacheTransactionData (txid, network, request, cache, apiKey) {
  const hexResponse = async rawtx => {
    // Verify
    if (typeof rawtx !== 'string' || !rawtx.length) throw new Error(`Invalid rawtx fetched for ${txid}: ${rawtx}`)
    const bsvtx = new bsv.Transaction(rawtx)

    // Cache
    const cacheSets = []
    cacheSets.push(cache.set(`tx://${txid}`, rawtx))
    bsvtx.inputs.forEach(input => {
      const prevtxid = input.prevTxId.toString('hex')
      const location = `${prevtxid}_o${input.outputIndex}`
      cacheSets.push(cache.set(`spend://${location}`, txid))
    })
    await Promise.all(cacheSets)

    // Return
    return rawtx
  }

  const jsonResponse = async json => {
    const time = json.time * 1000 || Date.now()

    // Verify
    if (typeof time !== 'number' || json.time < 0) throw new Error(`Invalid time fetched for ${txid}: ${json.time}`)

    /// Cache
    await cache.set(`time://${txid}`, time)

    // Return
    return time
  }

  // Fetch tx and cache 404s for 1 second to speed up loads
  try {
    const hexUrl = `https://api.whatsonchain.com/v1/bsv/${network}/tx/${txid}/hex`
    const jsonUrl = `https://api.whatsonchain.com/v1/bsv/${network}/tx/hash/${txid}`

    const [rawtx, time] = await Promise.all([
      request(hexUrl, { headers: _headers(apiKey), cache: 1000, response: hexResponse }),
      request(jsonUrl, { headers: _headers(apiKey), cache: 1000, response: jsonResponse })
    ])

    return { rawtx, time }
  } catch (e) {
    if (e instanceof _RequestError && (e.status === 404 || e.status === 500)) {
      throw new Error('No such mempool or blockchain transaction')
    } else {
      throw e
    }
  }
}

// ------------------------------------------------------------------------------------------------

async function _fetchAndCacheUtxos (scripthash, script, network, request, cache, apiKey) {
  // Fetch UTXOs and cache them for 1 second to prevent too frequent updates
  const url = `https://api.whatsonchain.com/v1/bsv/${network}/script/${scripthash}/unspent`
  const data = await request(url, { headers: _headers(apiKey), cache: 1000 })
  const utxos = data.map(o => { return { txid: o.tx_hash, vout: o.tx_pos, satoshis: o.value, script } })

  // Verify
  if (!Array.isArray(utxos)) throw new Error(`Received invalid utxos: ${utxos}`)

  // Dedup
  const dedupedUtxos = _dedupUtxos(utxos)

  // Return
  return dedupedUtxos
}

// ------------------------------------------------------------------------------------------------

function _headers (apiKey) {
  return apiKey ? { 'woc-api-key': apiKey } : {}
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
  if (network !== 'main' && network !== 'test' && network !== 'stn') throw new Error(`WhatsOnChain API does not support the "${network}" network`)
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

module.exports = WhatsOnChain
