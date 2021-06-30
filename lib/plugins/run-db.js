/**
 * run-db.js
 *
 * Cache that connects to a RUN-DB instnace
 */

const LocalCache = require('./local-cache')
const BrowserCache = require('./browser-cache')
const request = require('../util/request')
const { _browser } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// RunDB
// ------------------------------------------------------------------------------------------------

class RunDB {
  constructor (host, localCache) {
    this.host = host
    this.localCache = localCache || (_browser() ? new BrowserCache() : new LocalCache())
    this.request = request
  }

  async get (key) {
    const localValue = await this.localCache.get(key)
    if (localValue) {
      return localValue
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
        await this.localCache.set(key, value)
      }

      return value
    } catch (e) {
      if (e.status === 404) return undefined
      throw e
    }
  }

  async set (key, value) {
    const [keyType, keyValue] = key.split('://')
    const alreadyKnown = !!await this.localCache.get(key)
    if (!alreadyKnown && ['berry', 'jig', 'tx'].includes(keyType)) {
      await this.request(`${this.host}/tx/${keyValue}`, 'POST', value)
    }

    await this.localCache.set(key, value)
  }

  async unspent (scripthash) {
    const url = `${this.host}/unspent?scripthash=${scripthash}`

    return await this.request(url)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RunDB
