/**
 * mattercloud.js
 *
 * MatterCloud blockchain server
 */

const RemoteBlockchain = require('./remote-blockchain')
const Log = require('../util/log')
const REST = require('../util/rest')
const { RequestError, UnimplementedError } = require('../util/errors')
const { _parseNetwork } = RemoteBlockchain

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'MatterCloud'

// ------------------------------------------------------------------------------------------------
// MatterCloud
// ------------------------------------------------------------------------------------------------

class MatterCloud extends RemoteBlockchain {
  constructor (options) {
    options.network = _parseNetwork(options.network)
    if (options.network !== 'main') {
      throw new Error('MatterCloud API only supports mainnet')
    }
    options.api = 'mattercloud'
    super(options)
  }

  async spends (txid, vout) {
    if (Log._debugOn) Log._debug(TAG, 'Spends', txid, vout)
    throw new UnimplementedError('MatterCloud API does not support spends')
  }

  async _postTransaction (rawtx) {
    const url = `https://merchantapi.mattercloud.net/mapi/tx${this._suffix}`
    const result = await REST._post(url, { rawtx }, this.timeout)
    const payload = JSON.parse(result.payload)
    if (payload.returnResult === 'failure') {
      throw new Error(payload.resultDescription)
    }
  }

  async _getTransactionData (txid) {
    const url = `https://api.mattercloud.net/api/v3/${this.network}/tx/${txid}${this._suffix}`
    try {
      const json = await REST._get(url, this.timeout)
      return {
        rawtx: json.rawtx,
        time: json.time,
        spends: []
      }
    } catch (e) {
      if (e instanceof RequestError && e.status === 404) {
        throw new Error('No such mempool or blockchain transaction')
      } else {
        throw e
      }
    }
  }

  async _getUtxos (scripthash, script) {
    const url = `https://api.mattercloud.net/api/v3/${this.network}/scripthash/${scripthash}/utxo${this._suffix}`
    const data = await REST._get(url, this.timeout)
    return data.map(o => Object.assign({}, o, { script }))
  }

  get _suffix () { return this.apiKey ? `?api_key=${this.apiKey}` : '' }
}

// ------------------------------------------------------------------------------------------------

module.exports = MatterCloud
