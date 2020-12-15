/**
 * run-connect.js
 *
 * Run blockchain server
 */

const RemoteBlockchain = require('./remote-blockchain')
const REST = require('../util/rest')
const { _parseNetwork } = RemoteBlockchain

// ------------------------------------------------------------------------------------------------
// Run Connect
// ------------------------------------------------------------------------------------------------

class RunConnect extends RemoteBlockchain {
  constructor (options) {
    options.network = _parseNetwork(options.network)
    if (options.network !== 'main' && options.network !== 'test') {
      throw new Error('Run Blockchain Server only supports mainnet and testnet')
    }
    options.api = 'run'
    super(options)
  }

  async _postTransaction (rawtx) {
    const url = `https://api.run.network/v1/${this.network}/tx`
    await REST._post(url, { rawtx })
  }

  async _getTransactionData (txid) {
    const url = `https://api.run.network/v1/${this.network}/tx/${txid}`
    const json = await REST._get(url)
    return {
      rawtx: json.hex,
      time: json.time || Date.now() / 1000,
      spends: json.vout.map(x => x.spentTxId)
    }
  }

  async _getUtxos (scripthash, script) {
    const url = `https://api.run.network/v1/${this.network}/utxos/${scripthash}`
    const data = await REST._get(url)
    return data
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RunConnect
