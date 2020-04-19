/**
 * pay-server.js
 *
 * API to connect to the Run Pay Server
 */

const bsv = require('bsv')
const { _fetchWithTimeout, _parseJsonResponse } = require('../util/fetch')
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

    const method = 'post'
    const body = JSON.stringify(payload)
    const headers = { 'Content-Type': 'application/json' }
    const options = { method, body, headers }

    const url = `https://api.run.network/v1/${this.network}/pay`
    const json = await _fetchWithTimeout(url, this.timeout, options).then(_parseJsonResponse)

    return new bsv.Transaction(json)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = PayServer
