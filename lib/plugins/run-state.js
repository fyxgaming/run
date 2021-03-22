/**
 * run-state.js
 *
 * Cache that connects to the RUN State API
 */

const LocalCache = require('./local-cache')
const BrowserCache = require('./browser-cache')
const REST = require('../util/rest')
const { _browser } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// RunState
// ------------------------------------------------------------------------------------------------

class RunState {
  constructor (localCache) {
    this.host = `https://api.run.network/v1/main`
    this.localCache = localCache || (_browser() ? new BrowserCache() : new LocalCache())
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
        case 'jig':
          url = `${this.host}/jig/${path}`
          break

        case 'berry':
          url = `${this.host}/berry/${path}`
          break

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
}

// ------------------------------------------------------------------------------------------------

module.exports = RunDB
