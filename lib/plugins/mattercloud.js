/**
 * mattercloud.js
 *
 * MatterCloud Blockchain API
 */

const bsv = require('bsv')
const { Cache } = require('../kernel/api')
const LocalCache = require('./local-cache')
const BrowserCache = require('./browser-cache')
const NodeCache = require('./node-cache')
const { _browser, _nodejs } = require('../kernel/environment')
const { _scripthash, _dedupUtxos } = require('../kernel/bsv')
const RecentBroadcasts = require('../kernel/recent-broadcasts')
const request = require('./request')
const { _RequestError } = request
const Log = require('../kernel/log')

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
   * @param {?Cache} options.cache Cache object. Defaults to NodeCache, BrowserCache, or LocalCache.
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
    const url = `https://merchantapi.mattercloud.net/mapi/tx${_suffix(this.apiKey)}`
    const options = { method: 'POST', body: { rawtx } }
    const result = await this.request(url, options)
    const payload = JSON.parse(result.payload)
    const txid = payload.txid || new bsv.Transaction(rawtx).hash

    if (payload.returnResult === 'failure' && payload.resultDescription !== DUPLICATE_TRANSACTION_ERROR) {
      if (Log._debugOn) Log._debug(TAG, JSON.stringify(payload, 0, 3))
      throw new Error(payload.resultDescription)
    }

    return txid
  }

  // --------------------------------------------------------------------------

  async fetch (txid) {
    try {
      const url = `https://api.mattercloud.net/api/v3/${this.network}/tx/${txid}${_suffix(this.apiKey)}`
      const options = { cache: 1000 }
      const json = await request(url, options)
      return json.rawtx
    } catch (e) {
      if (e instanceof _RequestError && e.status === 404) {
        throw new Error('No such mempool or blockchain transaction')
      } else {
        throw e
      }
    }
  }

  // --------------------------------------------------------------------------

  async utxos (script) {
    const scripthash = await _scripthash(script)
    const utxos = await _fetchAndCacheUtxos(scripthash, script, this.network, this.request, this.cache, this.apiKey)

    await RecentBroadcasts._correctUtxosUsingCache(this.cache, utxos, script)

    return utxos
  }

  // --------------------------------------------------------------------------

  async time (txid) {
    try {
      const url = `https://api.mattercloud.net/api/v3/${this.network}/tx/${txid}${_suffix(this.apiKey)}`
      const options = { cache: 1000 }
      const json = await request(url, options)
      return json.time * 1000
    } catch (e) {
      if (e instanceof _RequestError && e.status === 404) {
        throw new Error('No such mempool or blockchain transaction')
      } else {
        throw e
      }
    }
  }

  // --------------------------------------------------------------------------

  async spends (txid, vout) {
    const location = `${txid}_o${vout}`
    const url = `https://txdb.mattercloud.io/api/v1/spends/${location}${_suffix(this.apiKey)}`
    const options = { cache: 1000 }
    const json = await request(url, options)
    const spend = (json && json.result && json.result[location] && json.result[location].spend_txid) || null
    return spend
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
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
  if (typeof cache === 'undefined') {
    if (_browser()) return new BrowserCache()
    if (_nodejs()) return new NodeCache()
    return new LocalCache()
  }
  throw new Error(`Unsupported cache: ${cache}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = MatterCloud
