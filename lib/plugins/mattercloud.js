/**
 * mattercloud.js
 *
 * MatterCloud blockchain server
 */

const RemoteBlockchain = require('./remote-blockchain')
const bsv = require('bsv')
const REST = require('../util/rest')
const { RequestError } = require('../util/errors')
const Log = require('../util/log')
const { _parseNetwork } = RemoteBlockchain

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const DUPLICATE_TRANSACTION_ERROR = 'ERROR: Transaction already in the mempool'

const SPENDS_LIMIT = 400

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

    // Not all Mattercloud nodes use the lower fee-per-kb
    bsv.Transaction.FEE_PER_KB = 1000
  }

  async _postTransaction (rawtx) {
    const url = `https://merchantapi.mattercloud.net/mapi/tx${this._suffix}`
    const result = await REST._post(url, { rawtx })
    const payload = JSON.parse(result.payload)

    if (payload.returnResult === 'failure') {
      // Duplicate transactions are not errors
      if (payload.resultDescription === DUPLICATE_TRANSACTION_ERROR) return

      if (Log._debugOn) Log._debug(JSON.stringify(payload, 0, 3))
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

    // MatterCloud has a limit for the number of spends at once, so we spread them out across calls
    const tx = new bsv.Transaction(result.rawtx)
    result.spends = []
    for (let j = 0; j < Math.ceil(tx.outputs.length / SPENDS_LIMIT); j++) {
      const outputs = []
      const lower = j * SPENDS_LIMIT
      const upper = Math.min((j + 1) * SPENDS_LIMIT, tx.outputs.length)
      for (let i = lower; i < upper; i++) {
        outputs.push(`${txid}_o${i}`)
      }

      const spendsurl = `https://txdb.mattercloud.io/api/v1/spends${this._suffix}`
      const json = await REST._post(spendsurl, { outputs: outputs.join(',') })
      const spendtxids = Object.keys(json.result)
        .map(key => json.result[key] ? json.result[key].spend_txid : null)

      result.spends = result.spends.concat(spendtxids)
    }

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
