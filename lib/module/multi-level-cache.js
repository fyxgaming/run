/**
 * multilevel-cache.js
 *
 * A wrapper cache that checks multiple other caches in order
 */

const { Cache } = require('../kernel/api')
const { _text } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// MultiLevelCache
// ------------------------------------------------------------------------------------------------

class MultiLevelCache {
  constructor (...caches) {
    if (!caches.length) throw new Error('No caches')

    const badCache = caches.find(cache => !(cache instanceof Cache))
    if (badCache) throw new Error(`Invalid cache: ${_text(badCache)}`)

    this._caches = caches
  }

  async set (key, value) {
    const promises = this._caches.map(cache => cache.set(key, value))
    await Promise.all(promises)
  }

  async get (key) {
    for (const cache of this._caches) {
      const value = await cache.get(key)
      if (typeof value !== 'undefined') return value
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = MultiLevelCache
