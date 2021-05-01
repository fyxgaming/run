/**
 * pay-server.js
 *
 * API to connect to the RUN Pay Server
 */

const bsv = require('bsv')
const request = require('../util/request')
const { _text } = require('../util/misc')

// ------------------------------------------------------------------------------------------------

/**
 * A Purse implementation that pays for transactions using RUN's remote server
 *
 * To generate an API key: https://api.run.network/v1/test/pay/generate
 */
class PayServer {
  constructor (apiKey) {
    let hdkey = null
    try {
      hdkey = new bsv.HDPublicKey(apiKey)
    } catch (e) {
      throw new Error(`Invalid API key: ${_text(apiKey)}`)
    }

    this.network = hdkey.network.name === 'mainnet' || hdkey.network.name === 'livenet' ? 'main' : 'test'
    this.apiKey = apiKey
    this.timeout = 5000
    this.request = request
  }

  // --------------------------------------------------------------------------

  async pay (rawtx, parents) {
    const url = `https://api.run.network/v1/${this.network}/pay`
    const body = { rawtx, parents, key: this.apiKey }
    const options = { method: 'POST', body, timeout: this.timeout }
    return (await this.request(url, options)).rawtx
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = PayServer
