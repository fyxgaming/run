/**
 * rundb-cache.js
 *
 * Cache that connects to a RUN-DB instnace
 */

const LocalCache = require('./local-cache')
const REST = require('../util/rest')

// ------------------------------------------------------------------------------------------------
// RunDB
// ------------------------------------------------------------------------------------------------

class RunDB {
  constructor (host) {
    this.host = host
    this.localCache = new LocalCache()
    this._requests = {} // key -> [Promise]
  }

  async get (key) {
    const prev = this._requests[key]
    if (prev) return new Promise((resolve, reject) => prev.push({ resolve, reject }))

    this._requests[key] = []

    try {
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
          url = `${this.host}/berry/${path}`
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
        const value = await REST._get(url)

        // We intentionally check for truthy. Trust will return true/false, and we don't want
        // to set false in our local cache to allow for changes in the RUN-DB instance.
        if (value) {
          await this.localCache.set(key, value)
        }

        // Notify all other code that was also waiting for this request
        this._requests[key].forEach(o => o.resolve(value))

        return value
      } catch (e) {
        if (e.status === 404) return undefined
        throw e
      }
    } catch (e) {
      // Notify all other code that this request failed
      this._requests[key].forEach(o => o.reject(e))

      throw e
    } finally {
      delete this._requests[key]
    }
  }

  async set (key, value) {
    await this.localCache.set(key, value)
  }

  async unspent (scripthash) {
    const url = `${this.host}/unspent?scripthash=${scripthash}`

    return await REST._get(url)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RunDB
