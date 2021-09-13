/**
 * run-connect.js
 *
 * Run Connect API that can be used as both a Blockchain and Cache implementation
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
const StateFilter = require('../kernel/state-filter')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const CONFIG_KEY_CODE_FILTER = 'config://code-filter'

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
   * @param {?Cache} options.cache Cache object. Defaults to NodeCache, BrowserCache, or LocalCache.
   */
  constructor (options = {}) {
    this.api = 'run'
    this.network = _parseNetwork(options.network)
    this.cache = _parseCache(options.cache)
    this.request = request
    this.host = 'https://api.run.network'
  }

  // --------------------------------------------------------------------------
  // Blockchain API
  // --------------------------------------------------------------------------

  async broadcast (rawtx) {
    const url = `${this.host}/v1/${this.network}/tx`
    const options = { method: 'POST', body: { rawtx } }
    const txid = await this.request(url, options)
    return txid
  }

  // --------------------------------------------------------------------------

  async fetch (txid) {
    const cachedTx = await this.cache.get(`tx://${txid}`)
    if (cachedTx) return cachedTx

    const data = await _fetchAndCacheTransactionData(txid, this.network, this.request, this.cache, this.host)
    return data.rawtx
  }

  // --------------------------------------------------------------------------

  async utxos (script) {
    const scripthash = await _scripthash(script)
    const utxos = await _fetchAndCacheUtxos(scripthash, this.network, this.request, this.cache, this.host)

    await RecentBroadcasts._correctUtxosUsingCache(this.cache, utxos, script)

    return utxos
  }

  // --------------------------------------------------------------------------

  async time (txid) {
    const cachedTime = await this.cache.get(`time://${txid}`)
    if (cachedTime) return cachedTime

    const data = await _fetchAndCacheTransactionData(txid, this.network, this.request, this.cache, this.host)
    return data.time
  }

  // --------------------------------------------------------------------------

  async spends (txid, vout) {
    const cachedSpend = await this.cache.get(`spend://${txid}_o${vout}`)
    if (cachedSpend) return cachedSpend

    const data = await _fetchAndCacheTransactionData(txid, this.network, this.request, this.cache, this.host)
    return data.spends[vout]
  }

  // --------------------------------------------------------------------------
  // State API
  // --------------------------------------------------------------------------

  async state (location) {
    // Only query state server on mainnet
    if (this.network !== 'main') return undefined

    const states = await _fetchAndCacheStates(location, this.network, this.request, this.cache, this.host)
    const key = location.includes('?') ? `berry://${location}` : `jig://${location}`
    return states[key]
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

async function _fetchAndCacheTransactionData (txid, network, request, cache, host) {
  const response = async json => {
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
  }

  // Fetch tx and cache 404s for 1 second to speed up loads
  const url = `${host}/v1/${network}/tx/${txid}`
  const options = { cache: 1000, response }
  return await request(url, options)
}

// ------------------------------------------------------------------------------------------------

async function _fetchAndCacheUtxos (scripthash, network, request, cache, host) {
  // Fetch UTXOs and cache them for 1 second to prevent too frequent updates
  const url = `${host}/v1/${network}/utxos/${scripthash}`
  const utxos = await request(url, { cache: 1000 })

  // Verify
  if (!Array.isArray(utxos)) throw new Error(`Received invalid utxos: ${utxos}`)

  // Dedup
  const dedupedUtxos = _dedupUtxos(utxos)

  // Return
  return dedupedUtxos
}

// ------------------------------------------------------------------------------------------------

async function _fetchAndCacheStates (location, network, request, cache, host) {
  const response = async states => {
    await Promise.all(Object.entries(states).map(([key, value]) => cache.set(key, value)))
    return states
  }

  // Fetch states and cache 404s for 1 second to speed up loads
  // Get the code filter
  const filter = await cache.get(CONFIG_KEY_CODE_FILTER) || StateFilter.create()
  const base64 = StateFilter.toBase64(filter)

  try {
    const url = `${host}/v1/${network}/state/${encodeURIComponent(location)}?all=1&filter=${base64}`
    const options = { cache: 1000, response }
    return await request(url, options)
  } catch (e) {
    // Even if the state is missing, transaction data might still be present
    const states = typeof e.reason === 'object' ? e.reason : {}
    await Promise.all(Object.entries(states).map(([key, value]) => cache.set(key, value)))
    if (e.status === 404) return states
    throw e
  }
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function _parseNetwork (network) {
  if (typeof network === 'undefined') return 'main'
  if (typeof network !== 'string') throw new Error(`Invalid network: ${network}`)
  if (network !== 'main' && network !== 'test') throw new Error(`RunConnect API does not support the "${network}" network`)
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

module.exports = RunConnect
