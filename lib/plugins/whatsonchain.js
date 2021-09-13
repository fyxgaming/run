/**
 * whatsonchain.js
 *
 * WhatsOnChain Blockchain API
 */

const { Cache } = require('../kernel/api')
const LocalCache = require('./local-cache')
const BrowserCache = require('./browser-cache')
const NodeCache = require('./node-cache')
const { _browser, _nodejs } = require('../kernel/environment')
const { _scripthash, _dedupUtxos } = require('../kernel/bsv')
const RecentBroadcasts = require('../kernel/recent-broadcasts')
const Log = require('../kernel/log')
const { NotImplementedError } = require('../kernel/error')
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
   * @param {?Cache} options.cache Cache object. Defaults to NodeCache, BrowserCache, or LocalCache.
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
    const url = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/raw`
    const options = { method: 'POST', body: { txhex: rawtx }, headers: _headers(this.apiKey) }
    const txid = await this.request(url, options)
    return txid
  }

  // --------------------------------------------------------------------------

  async fetch (txid) {
    try {
      const url = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/${txid}/hex`
      const options = { headers: _headers(this.apiKey), cache: 1000 }
      const json = await request(url, options)
      return json
    } catch (e) {
      if (e instanceof _RequestError && (e.status === 404 || e.status === 500)) {
        throw new Error('No such mempool or blockchain transaction')
      } else {
        throw e
      }
    }
  }

  // --------------------------------------------------------------------------

  async utxos (script) {
    if (this.network === 'stn') {
      if (Log._warnOn) Log._warn(TAG, 'Utxos are not available on STN')
      return []
    }

    const scripthash = await _scripthash(script)
    const utxos = await _fetchAndCacheUtxos(scripthash, script, this.network, this.request, this.cache, this.apiKey)

    await RecentBroadcasts._correctUtxosUsingCache(this.cache, utxos, script)

    return utxos
  }

  // --------------------------------------------------------------------------

  async time (txid) {
    try {
      const url = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/hash/${txid}`
      const options = { headers: _headers(this.apiKey), cache: 1000 }
      const json = await request(url, options)
      return json.time * 1000 || Date.now()
    } catch (e) {
      if (e instanceof _RequestError && (e.status === 404 || e.status === 500)) {
        throw new Error('No such mempool or blockchain transaction')
      } else {
        throw e
      }
    }
  }

  // --------------------------------------------------------------------------

  async spends (txid, vout) {
    throw new NotImplementedError('WhatsOnChain API does not support spends')
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
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
  if (typeof cache === 'undefined') {
    if (_browser()) return new BrowserCache()
    if (_nodejs()) return new NodeCache()
    return new LocalCache()
  }
  throw new Error(`Unsupported cache: ${cache}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = WhatsOnChain
