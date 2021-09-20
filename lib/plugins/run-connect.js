/**
 * run-connect.js
 *
 * Run Connect Blockchain API that can be used as both a Blockchain implementation
 */

const { _scripthash } = require('../kernel/bsv')
const request = require('./request')
const RunSDKBlockchain = require('./run-sdk-blockchain')

// ------------------------------------------------------------------------------------------------
// RunConnect
// ------------------------------------------------------------------------------------------------

class RunConnect extends RunSDKBlockchain {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  /**
   * @param {?object} options Optional configurations options
   * @param {?string} options.network Network string. Defaults to main.
   */
  constructor (options = {}) {
    super()

    this.api = 'run'
    this.network = _parseNetwork(options.network)
    this.request = request
    this.host = 'https://api.run.network'
  }

  // --------------------------------------------------------------------------
  // broadcast
  // --------------------------------------------------------------------------

  async broadcast (rawtx) {
    const url = `${this.host}/v1/${this.network}/tx`
    const options = { method: 'POST', body: { rawtx } }
    const txid = await this.request(url, options)
    return txid
  }

  // --------------------------------------------------------------------------
  // fetch
  // --------------------------------------------------------------------------

  async fetch (txid) {
    const url = `${this.host}/v1/${this.network}/tx/${txid}`
    const options = { cache: 1000 }
    const json = await request(url, options)
    return json.hex
  }

  // --------------------------------------------------------------------------
  // utxos
  // --------------------------------------------------------------------------

  async utxos (script) {
    const scripthash = await _scripthash(script)
    const url = `${this.host}/v1/${this.network}/utxos/${scripthash}`
    const utxos = await request(url, { cache: 1000 })
    return utxos
  }

  // --------------------------------------------------------------------------
  // time
  // --------------------------------------------------------------------------

  async time (txid) {
    const url = `${this.host}/v1/${this.network}/tx/${txid}`
    const options = { cache: 1000 }
    const json = await request(url, options)
    return json.time * 1000 || Date.now()
  }

  // --------------------------------------------------------------------------
  // spends
  // --------------------------------------------------------------------------

  async spends (txid, vout) {
    const url = `${this.host}/v1/${this.network}/tx/${txid}`
    const options = { cache: 1000 }
    const json = await request(url, options)
    return json.vout[vout].spentTxId
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

module.exports = RunConnect
