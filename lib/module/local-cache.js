/**
 * local-cache.js
 *
 * In-memory implementation of the Cache API
 */

const Log = require('../util/log')
const { _text, _limit } = require('../util/misc')
const { _deepEqual } = require('../util/deep')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'LocalCache'

// ------------------------------------------------------------------------------------------------
// LocalCache
// ------------------------------------------------------------------------------------------------

/**
 * Default implementation of the Cache API that caches data in memory in a 10MB LRU cache
 */
class LocalCache {
  constructor (options = {}) {
    this._map = new Map()
    this._sizeBytes = 0
    this._maxSizeBytes = parseMaxSizeMB(options.maxSizeMB) * 1000 * 1000
  }

  // --------------------------------------------------------------------------

  get maxSizeMB () {
    return this._maxSizeBytes / 1000 / 1000
  }

  // --------------------------------------------------------------------------

  set maxSizeMB (value) {
    this._maxSizeBytes = parseMaxSizeMB(value) * 1000 * 1000
    this._reduceToFit()
  }

  // --------------------------------------------------------------------------

  async get (key) {
    const had = this._map.has(key)
    const value = this._map.get(key)

    if (had) {
      // Bump the entry to the top
      this._map.delete(key)
      this._map.set(key, value)

      return value
    }
  }

  // --------------------------------------------------------------------------

  async set (key, value) {
    const had = this._map.has(key)
    const previous = this._map.get(key)

    // If we are overwriting a previous value, check that the values are the same.
    if (had && !_deepEqual(value, previous)) {
      const hint = 'This is an internal Run bug. Please report it to the library developers.'
      throw new Error(`Attempt to set different values for the same key: ${key}\n\n${hint}`)
    }

    // Bump the entry to the top, or set the new value
    this._map.delete(key)
    this._map.set(key, value)

    if (had) return

    this._sizeBytes += LocalCache._estimateSize(key)
    this._sizeBytes += LocalCache._estimateSize(value)

    this._reduceToFit()
  }

  // --------------------------------------------------------------------------

  clear () {
    if (Log._debugOn) Log._debug(TAG, 'Clear')

    this._map.clear()
    this._sizeBytes = 0
  }

  // --------------------------------------------------------------------------

  _reduceToFit () {
    while (this._sizeBytes > _limit(this._maxSizeBytes)) {
      const oldestKey = this._map.keys().next().value
      const oldestValue = this._map.get(oldestKey)
      this._map.delete(oldestKey)
      this._sizeBytes -= LocalCache._estimateSize(oldestKey)
      this._sizeBytes -= LocalCache._estimateSize(oldestValue)
    }
  }

  // --------------------------------------------------------------------------

  static _estimateSize (value) {
    // Assumes only JSON-serializable values
    // Assume each property has a 1 byte type field, and pointers are 4 bytes
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures
    switch (typeof value) {
      case 'undefined': throw new Error('Cannot cache undefined')
      case 'boolean': return 5
      case 'number':
        if (Number.isFinite(value)) return 9
        throw new Error(`Cannot cache number: ${_text(value)}`)
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
      case 'function': throw new Error(`Cannot cache function: ${_text(value)}`)
      case 'symbol': throw new Error(`Cannot cache symbol: ${_text(value)}`)
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseMaxSizeMB (maxSizeMB) {
  if (typeof maxSizeMB === 'undefined') return 10
  if (typeof maxSizeMB === 'number' && !Number.isNaN(maxSizeMB) && maxSizeMB >= 0) return maxSizeMB
  throw new Error(`Invalid maxSizeMB: ${_text(maxSizeMB)}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalCache
