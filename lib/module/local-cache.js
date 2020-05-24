/**
 * local-cache.js
 *
 * In-memory implementation of the Cache API
 */

const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// LocalCache
// ------------------------------------------------------------------------------------------------

const TAG = 'LocalCache'

/**
 * Default implementation of the Cache API that caches data in memory in a 10MB LRU cache
 */
class LocalCache {
  constructor (options = {}) {
    this._map = new Map()
    this._sizeBytes = 0
    const maxSizeMB = typeof options.maxSizeMB === 'undefined' ? 10 : options.maxSizeMB
    this._maxSizeBytes = Math.floor(maxSizeMB * 1000 * 1000)
  }

  get maxSizeMB () { return Math.floor(this._maxSizeBytes / 1000 / 1000) }
  set maxSizeMB (value) { this._maxSizeBytes = Math.floor(value * 1000 * 1000) }

  async get (key) {
    Log._debug(TAG, 'Get', key)

    const had = this._map.has(key)
    const value = this._map.get(key)

    if (had) {
      // bump the entry to the top
      this.set(key, value)

      return value
    }
  }

  async set (key, value) {
    Log._debug(TAG, 'Set', key, 'to', value)

    function deepEqual (a, b) {
      if (typeof a !== typeof b) return false
      if (typeof a !== 'object' || !a || !b) return a === b
      const aKeys = Array.from(Object.keys(a))
      const bKeys = Array.from(Object.keys(b))
      if (aKeys.length !== bKeys.length) return false
      return !aKeys.some(key => !deepEqual(a[key], b[key]))
    }

    const had = this._map.has(key)
    const previous = this._map.get(key)

    // If we are overwriting a previous value, check that the values are the same.
    if (had) {
      if (!deepEqual(value, previous)) {
        const hint = 'This is an internal Run bug. Please report it to the library developers.'
        throw new Error(`Attempt to set different values for the same key: ${key}\n\n${hint}`)
      }

      this._map.delete(key)
    }

    this._map.set(key, value)

    if (had) return

    this._sizeBytes += LocalCache._estimateSize(value)

    while (this._sizeBytes > this._maxSizeBytes) {
      const oldestKey = this._map.keys().next().value
      const value = this._map.get(oldestKey)
      this._map.delete(oldestKey)
      this._sizeBytes -= LocalCache._estimateSize(value)
    }
  }

  clear () {
    this._map.clear()
    this._sizeBytes = 0
  }

  static _estimateSize (value) {
    // Assumes only JSON-serializable values
    // Assume each property has a 1 byte type field, and pointers are 4 bytes.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures
    switch (typeof value) {
      case 'boolean': return 5
      case 'number': return 9
      case 'string': return value.length * 2 + 1
      case 'object': {
        if (!value) return 5
        const keys = Object.keys(value)
        let size = 1 + keys.length * 4
        keys.forEach(key => {
          size += LocalCache._estimateSize(key)
          size += LocalCache._estimateSize(value[key])
        })
        return size
      }
      default: return 5
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalCache
