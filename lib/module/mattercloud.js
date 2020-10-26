/**
 * mattercloud.js
 *
 * MatterCloud blockchain server
 */

const RemoteBlockchain = require('./remote-blockchain')
const bsv = require('bsv')
const REST = require('../util/rest')
const { RequestError } = require('../util/errors')
const { _parseNetwork } = RemoteBlockchain

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

  async _postTransaction (rawtx) {
    const url = `https://merchantapi.mattercloud.net/mapi/tx${this._suffix}`
    const result = await REST._post(url, { rawtx })
    const payload = JSON.parse(result.payload)
    if (payload.returnResult === 'failure') {
      throw new Error(payload.resultDescription)
    }
  }

  async _getTransactionData (txid) {
    let result = null

    const fetchurl = `https://api.mattercloud.net/api/v3/${this.network}/tx/${txid}${this._suffix}`
    try {
      const json = await REST._get(fetchurl)

      result = {
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

    const tx = new bsv.Transaction(result.rawtx)
    const outputs = []
    for (let i = 0; i < tx.outputs.length; i++) {
      outputs.push(`${txid}_o${i}`)
    }
    const spendsurl = `https://txdb.mattercloud.io/api/v1/spends${this._suffix}`
    const json = await REST._post(spendsurl, { outputs: outputs.join(',') })
    result.spends = Object.keys(json.result).map(key => json.result[key] ? json.result[key].spend_txid : null)
    return result
  }

  async _getUtxos (scripthash, script) {
    const url = `https://api.mattercloud.net/api/v3/${this.network}/scripthash/${scripthash}/utxo${this._suffix}`
    const data = await REST._get(url)
    return data.map(o => Object.assign({}, o, { script }))
  }

  get _suffix () { return this.apiKey ? `?api_key=${this.apiKey}` : '' }
}

// ------------------------------------------------------------------------------------------------

module.exports = MatterCloud
