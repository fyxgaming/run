/**
 * rundb-cache.js
 *
 * Cache that connects to a RunDB instnace
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
  }

  async get (key) {
    const localValue = await this.localCache.get(key)
    if (localValue) {
      return localValue
    }

    let url

    if (key.startsWith('tx://')) {
      const txid = key.slice('tx://'.length)
      url = `${this.host}/tx/${txid}`
    } else if (key.startsWith('jig://')) {
      const location = key.slice('jig://'.length)
      url = `${this.host}/jig/${location}`
    } else if (key.startsWith('berry://')) {
      const location = key.slice('berry://'.length)
      url = `${this.host}/location/${location}`
    } else if (key.startsWith('trust://')) {
      const txid = key.slice('trust://'.length)
      url = `${this.host}/trust/${txid}`
    } else {
      return
    }

    try {
      const value = await REST._get(url)

      await this.localCache.set(key, value)

      return value
    } catch (e) {
      if (e.status === 404) return undefined
      throw e
    }
  }

  async set (key, value) {
    await this.localCache.set(key, value)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RunDB
