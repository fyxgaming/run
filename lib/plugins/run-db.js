/**
 * run-db.js
 *
 * Cache that connects to a Run-DB instnace
 */

const { _scripthash } = require('../kernel/bsv')
const request = require('./request')
const RunSDKState = require('./run-sdk-state')

// ------------------------------------------------------------------------------------------------
// RunDB
// ------------------------------------------------------------------------------------------------

class RunDB extends RunSDKState {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  constructor (host) {
    super()

    this.host = host
    this.request = request
  }

  // --------------------------------------------------------------------------
  // pull
  // --------------------------------------------------------------------------

  async pull (key, options) {
    const [protocol, path] = key.split('://')

    let url = null

    switch (protocol) {
      case 'tx': { url = `${this.host}/tx/${path}`; break }
      case 'jig': { url = `${this.host}/jig/${path}`; break }
      case 'berry': { url = `${this.host}/berry/${encodeURIComponent(path)}`; break }
      case 'spend': { url = `${this.host}/spends/${path}`; break }
      case 'time': { url = `${this.host}/time/${path}`; break }
      case 'trust': { url = `${this.host}/trust/${path}`; break }
      // Bans are not pulled from Run-DB, because if Run-DB bans, then the jig state is also gone
      case 'ban': return
      default: return
    }

    try {
      return await this.request(url)
    } catch (e) {
      if (e.status === 404) return undefined
      throw e
    }
  }

  // --------------------------------------------------------------------------
  // locations
  // --------------------------------------------------------------------------

  async locations (script) {
    const scripthash = await _scripthash(script)
    const url = `${this.host}/unspent?scripthash=${scripthash}`
    return await this.request(url)
  }

  // --------------------------------------------------------------------------
  // broadcast
  // --------------------------------------------------------------------------

  async broadcast (rawtx) {
    await this.request(`${this.host}/tx`, {
      method: 'POST',
      body: rawtx,
      headers: { 'content-type': 'text/plain' }
    })
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RunDB
