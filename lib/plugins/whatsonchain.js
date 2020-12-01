/**
 * whatsonchain.js
 *
 * Remote blockchain implementation for WOC
 */

const RemoteBlockchain = require('./remote-blockchain')
const Log = require('../util/log')
const REST = require('../util/rest')
const { RequestError, UnimplementedError } = require('../util/errors')
const { _parseNetwork } = RemoteBlockchain

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'WhatsOnChain'

// ------------------------------------------------------------------------------------------------
// WhatsOnChain
// ------------------------------------------------------------------------------------------------

class WhatsOnChain extends RemoteBlockchain {
  constructor (options) {
    options.network = _parseNetwork(options.network)
    if (options.network !== 'main' && options.network !== 'test' && options.network !== 'stn') {
      throw new Error('WhatsOnChain API only supports mainnet, testnet, and STN')
    }
    options.api = 'whatsonchain'
    super(options)
  }

  async spends (txid, vout) {
    if (Log._debugOn) Log._debug(TAG, 'Spends', txid, vout)
    throw new UnimplementedError('WhatsOnChain API does not support spends')
  }

  async _postTransaction (rawtx) {
    const url = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/raw`
    await REST._post(url, { txhex: rawtx }, undefined, this._headers)
  }

  async _getTransactionData (txid) {
    const jsonUrl = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/hash/${txid}`
    const hexUrl = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/${txid}/hex`

    try {
      const [jsonResult, hexResult] = await Promise.all([
        REST._get(jsonUrl, undefined, this._headers),
        REST._get(hexUrl, undefined, this._headers)
      ])

      const { time } = jsonResult
      const rawtx = hexResult
      const spends = []

      return { rawtx, time, spends }
    } catch (e) {
      if (e instanceof RequestError && e.status === 404) {
        throw new Error('No such mempool or blockchain transaction')
      } else {
        throw e
      }
    }
  }

  async _getUtxos (scripthash, script) {
    if (this.network === 'stn') {
      if (Log._warnOn) Log._warn(TAG, 'Utxos are not available on STN')
      return []
    }

    const url = `https://api.whatsonchain.com/v1/bsv/${this.network}/script/${scripthash}/unspent`
    const data = await REST._get(url, undefined, this._headers)

    return data.map(o => {
      return { txid: o.tx_hash, vout: o.tx_pos, satoshis: o.value, script }
    })
  }

  get _headers () { return this.apiKey ? { 'woc-api-key': this.apiKey } : {} }
}

// ------------------------------------------------------------------------------------------------

module.exports = WhatsOnChain
