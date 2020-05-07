/**
 * pay-server.js
 *
 * API to connect to the Run Pay Server
 */

const bsv = require('bsv')
const REST = require('../util/rest')
const { _display } = require('../util/misc')
const { _populatePreviousOutputs } = require('../util/bsv')

// ------------------------------------------------------------------------------------------------

/**
 * A Purse implementation that pays for transactions using Run's remote server
 *
 * To generate an API key: https://api.run.network/v1/test/pay/generate
 */
class PayServer {
  constructor (apiKey) {
    let hdkey = null
    try {
      hdkey = new bsv.HDPublicKey(apiKey)
    } catch (e) {
      throw new Error(`Invalid API key: ${_display(apiKey)}`)
    }

    this.network = hdkey.network.name === 'mainnet' || hdkey.network.name === 'livenet' ? 'main' : 'test'
    this.apiKey = apiKey
    this.timeout = 5000
  }

  async pay (txhex) {
    const tx = new bsv.Transaction(txhex)
    const Run = require('../run')
    await _populatePreviousOutputs(tx, Run.instance.blockchain)
    const payload = { tx: tx.toJSON(), key: this.apiKey }
    const url = `https://api.run.network/v1/${this.network}/pay`
    const json = await REST._post(url, payload, this.timeout)
    return new bsv.Transaction(json).toString('hex')
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = PayServer
