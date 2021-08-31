/**
 * run-db.js
 *
 * Cache that connects to a RUN-DB instnace
 */

const { Cache } = require('../kernel/api')
const LocalCache = require('./local-cache')
const BrowserCache = require('./browser-cache')
const NodeCache = require('./node-cache')
const { _browser, _nodejs } = require('../kernel/environment')
const request = require('./request')

// ------------------------------------------------------------------------------------------------
// RunDB
// ------------------------------------------------------------------------------------------------

class RunDB {
  constructor (host, cache) {
    this.host = host
    this.cache = _parseCache(cache)
    this.request = request
  }

  async get (key) {
    const cachedValue = await this.cache.get(key)
    if (cachedValue) {
      return cachedValue
    }

    let url

    const [protocol, path] = key.split('://')

    switch (protocol) {
      case 'tx':
        url = `${this.host}/tx/${path}`
        break

      case 'jig':
        url = `${this.host}/jig/${path}`
        break

      case 'berry':
        url = `${this.host}/berry/${encodeURIComponent(path)}`
        break

      case 'spend':
        url = `${this.host}/spends/${path}`
        break

      case 'time':
        url = `${this.host}/time/${path}`
        break

      // Trust is pulled from RUN-DB to allow local imports without multiple trust lists
      case 'trust':
        url = `${this.host}/trust/${path}`
        break

      // Bans are not pulled from RUN-DB, because if RUN-DB bans, then the jig state is also gone
      case 'ban':
        return

      default:
        return
    }

    try {
      const value = await this.request(url)

      // We intentionally check for truthy. Trust will return true/false, and we don't want
      // to set false in our local cache to allow for changes in the RUN-DB instance.
      if (value) {
        await this.cache.set(key, value)
      }

      return value
    } catch (e) {
      if (e.status === 404) return undefined
      throw e
    }
  }

  async set (key, value) {
    // If setting a tx we don't know about, notify RUN-DB to add it
    const [protocol, path] = key.split('://')
    if (protocol === 'tx') {
      const alreadyKnown = !!await this.cache.get(key)
      if (!alreadyKnown) {
        await this.request(`${this.host}/tx/${path}`, {
          method: 'POST',
          body: value,
          headers: { 'content-type': 'text/plain' }
        })
      }
    }

    await this.cache.set(key, value)
  }

  async unspent (scripthash) {
    const url = `${this.host}/unspent?scripthash=${scripthash}`

    return await this.request(url)
  }
}

// ------------------------------------------------------------------------------------------------

function _parseCache (cache) {
  if (cache instanceof Cache) return cache
  if (typeof cache === 'undefined') {
    if (_browser()) return new BrowserCache()
    if (_nodejs()) return new NodeCache()
    return new LocalCache()
  }
  throw new Error(`Unsupported cache: ${cache}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = RunDB
