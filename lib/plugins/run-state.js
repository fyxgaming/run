/**
 * run-state.js
 *
 * Cache that connects to the RUN State API
 */

const LocalCache = require('./local-cache')
const BrowserCache = require('./browser-cache')
const REST = require('../util/rest')
const { _browser } = require('../util/misc')
const StateFilter = require('../util/state-filter')

// ------------------------------------------------------------------------------------------------
// RunState
// ------------------------------------------------------------------------------------------------

class RunState {
  constructor (localCache) {
    this.host = 'https://api.run.network/v1/main'
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

      const filter = StateFilter.toBase64(StateFilter.create())

      switch (protocol) {
        case 'jig':
          url = `${this.host}/state/${path}?all=1&filter=${filter}`
          break

        case 'berry':
          url = `${this.host}/state/${encodeURIComponent(path)}?all=1&filter=${filter}`
          break

        default:
          return undefined
      }

      try {
        const data = await REST._get(url)

        for (const [key, value] of Object.entries(data)) {
          // We intentionally check for truthy. Trust will return true/false, and we don't want
          // to set false in our local cache to allow for changes in the RUN-DB instance.
          if (value) {
            await this.localCache.set(key, value)
          }
        }

        const value = data[key]

        // Notify all other code that was also waiting for this request
        this._requests[key].forEach(o => o.resolve(value))

        return value
      } catch (e) {
        // Even if the state is missing, transaction data might still be present
        const data = e.reason
        if (typeof data === 'object') {
          for (const [key, value] of Object.entries(data)) {
            // We intentionally check for truthy. Trust will return true/false, and we don't want
            // to set false in our local cache to allow for changes in the RUN-DB instance.
            if (value) {
              await this.localCache.set(key, value)
            }
          }
        }

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

module.exports = RunState
