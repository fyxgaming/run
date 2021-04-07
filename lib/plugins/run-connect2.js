/**
 * run-connect.js
 *
 * RUN Connect API that can be used as both a Blockchain and Cache implementation
 */

const { Cache } = require('../kernel/api')
const LocalCache = require('./local-cache')
const BrowserCache = require('./browser-cache')
const { _browser } = require('../util/misc')

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
    throw new Error('Not implemented')
  }

  // --------------------------------------------------------------------------

  async fetch (txid) {
    throw new Error('Not implemented')
  }

  // --------------------------------------------------------------------------

  async utxos (script) {
    throw new Error('Not implemented')
  }

  // --------------------------------------------------------------------------

  async time (txid) {
    throw new Error('Not implemented')
  }

  // --------------------------------------------------------------------------

  async spends (txid, vout) {
    throw new Error('Not implemented')
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
