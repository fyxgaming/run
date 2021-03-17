/**
 * browser-cache.js
 *
 * A cache that stores both in local memory and in IndexedDB
 */

/* global VARIANT */

if (typeof VARIANT === 'undefined' || VARIANT === 'browser') {
  const LocalCache = require('./local-cache')
  const IndexedDbCache = require('./indexeddb-cache')

  // ----------------------------------------------------------------------------------------------
  // BrowserCache
  // ----------------------------------------------------------------------------------------------

  class BrowserCache {
    constructor (options = { }) {
      this.localCache = new LocalCache({
        maxSizeMB: options.maxMemorySizeMB
      })

      this.indexedDbCache = new IndexedDbCache({
        dbName: options.dbName,
        dbStore: options.dbStore,
        dbVersion: options.dbVersion
      })
    }

    get maxMemorySizeMB () { return this.localCache.maxSizeMB }
    set maxMemorySizeMB (value) { this.localCache.maxSizeMB = value }

    async set (key, value) {
      return Promise.all([
        this.localCache.set(key, value),
        this.indexedDbCache.set(key, value)
      ])
    }

    async get (key) {
      return await this.localCache.get(key) || await this.indexedDbCache.get(key)
    }
  }

  // ----------------------------------------------------------------------------------------------

  module.exports = BrowserCache
} else {
  module.exports = null
}
