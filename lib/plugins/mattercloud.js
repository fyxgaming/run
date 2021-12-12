/**
 * mattercloud.js
 *
 * MatterCloud Blockchain API
 */

const bsv = require('bsv')
const { _scripthash } = require('../kernel/bsv')
const request = require('./request')
const { _RequestError } = request
const Log = require('../kernel/log')
const { NotImplementedError } = require('../kernel/error')
const WrappedBlockchain = require('./wrapped-blockchain')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'MatterCloud'

const DUPLICATE_TRANSACTION_ERROR = 'ERROR: Transaction already in the mempool'

// ------------------------------------------------------------------------------------------------
// MatterCloud
// ------------------------------------------------------------------------------------------------

class MatterCloud extends WrappedBlockchain {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  /**
   * @param {?object} options Optional configurations options
   * @param {?string} options.apiKey API key
   * @param {?string} options.network Network string. Defaults to main.
   */
  constructor (options = {}) {
    super()

    this.api = 'mattercloud'
    this.apiKey = _parseApiKey(options.apiKey)
    this.network = _parseNetwork(options.network)
    this.request = request
  }

  // --------------------------------------------------------------------------
  // Blockchain API
  // --------------------------------------------------------------------------

  async broadcast (rawtx) {
    const suffix = this.apiKey ? `?api_key=${this.apiKey}` : ''
    const url = `https://merchantapi.mattercloud.net/mapi/tx${suffix}`
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
      const suffix = this.apiKey ? `?api_key=${this.apiKey}` : ''
      const url = `https://api.mattercloud.net/api/v3/${this.network}/tx/${txid}${suffix}`
      const options = { cache: 1000 }
      const json = await this.request(url, options)
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
    const suffix = this.apiKey ? `?api_key=${this.apiKey}` : ''
    const url = `https://api.mattercloud.net/api/v3/${this.network}/scripthash/${scripthash}/utxo${suffix}`
    const data = await this.request(url, { cache: 1000 })
    const utxos = data.map(o => Object.assign({}, o, { script }))
    return utxos
  }

  // --------------------------------------------------------------------------

  async time (txid) {
    try {
      const suffix = this.apiKey ? `?api_key=${this.apiKey}` : ''
      const url = `https://api.mattercloud.net/api/v3/${this.network}/tx/${txid}${suffix}`
      const options = { cache: 1000 }
      const json = await this.request(url, options)
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
    throw new NotImplementedError('MatterCloud API does not support spends')
  }
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

module.exports = MatterCloud
