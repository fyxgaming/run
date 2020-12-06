/**
 * browser-cache.js
 *
 * A cache that stores both in local memory and in IndexedDB
 */

const LocalCache = require('./local-cache')
const IndexedDbCache = require('./indexeddb-cache')

// ------------------------------------------------------------------------------------------------
// BrowserCache
// ------------------------------------------------------------------------------------------------

class BrowserCache {
  constructor (options = { }) {
    this._localCache = new LocalCache({
      maxSizeMB: options.maxMemorySizeMB
    })

    this._indexedDbCache = new IndexedDbCache({
      dbName: options.dbName,
      dbStore: options.dbStore,
      dbVersion: options.dbVersion
    })
  }

  get maxMemorySizeMB () { return this._localCache.maxSizeMB }
  set maxMemorySizeMB (value) { this._localCache.maxSizeMB = value }

  async set (key, value) {
    return Promise.all([
      this._localCache.set(key, value),
      this._indexedDbCache.set(key, value)
    ])
  }

  async get (key) {
    return await this._localCache.get(key) || await this._indexedDbCache.get(key)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = BrowserCache
