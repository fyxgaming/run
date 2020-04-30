/**
 * pay-server.js
 *
 * API to connect to the Run Pay Server
 */

const bsv = require('bsv')
const REST = require('../util/rest')
const { _display } = require('../util/misc')

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

    this.network = hdkey.network.name === 'mainnet' ? 'main' : 'test'
    this.apiKey = apiKey
    this.timeout = 2000
  }

  async pay (tx) {
    const payload = { tx: tx.toJSON(), key: this.apiKey }
    const url = `https://api.run.network/v1/${this.network}/pay`
    const json = await REST._post(url, payload, this.timeout)
    return new bsv.Transaction(json)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = PayServer
