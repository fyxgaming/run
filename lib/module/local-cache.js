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
 * Default implementation of the Cache API that stores jig states in memory in a 10MB LRU cache
 */
class LocalCache {
  constructor (options = {}) {
    this.cache = new Map() // key -> value
    this._sizeBytes = 0
    const maxSizeMB = typeof options.maxSizeMB === 'undefined' ? 10 : options.maxSizeMB
    this._maxSizeBytes = Math.floor(maxSizeMB * 1000 * 1000)
  }

  get maxSizeMB() { return Math.floor(this._maxSizeBytes / 1000 / 1000) }
  set maxSizeMB(value) { this._maxSizeBytes = Math.floor(value * 1000 * 1000) }

  async get (location) {
    Log._debug(TAG, 'Get', location)

    const had = this.cache.has(location)
    const value = this.cache.get(location)

    if (had) {
      // bump the state to the top
      this.set(location, value)

      return value
    }
  }

  async set (location, state) {
    Log._debug(TAG, 'Set', location, 'to', state)

    function deepEqual (a, b) {
      if (typeof a !== typeof b) return false
      if (typeof a !== 'object' || !a || !b) return a === b
      const aKeys = Array.from(Object.keys(a))
      const bKeys = Array.from(Object.keys(b))
      if (aKeys.length !== bKeys.length) return false
      return !aKeys.some(key => !deepEqual(a[key], b[key]))
    }

    const had = this.cache.has(location)
    const previous = this.cache.get(location)

    // If we are overwriting a previous value, check that the states are the same.
    if (had) {
      if (!deepEqual(state, previous)) {
        const hint = 'This is an internal Run bug. Please report it to the library developers.'
        throw new Error(`Attempt to set different states for the same location: ${location}\n\n${hint}`)
      }

      this.cache.delete(location)
    }

    this.cache.set(location, state)

    if (had) return

    this._sizeBytes += LocalCache._estimateSize(state)

    while (this._sizeBytes > this._maxSizeBytes) {
      const oldestLocation = this.cache.keys().next().value
      const state = this.cache.get(oldestLocation)
      this.cache.delete(oldestLocation)
      this._sizeBytes -= LocalCache._estimateSize(state)
    }
  }

  clear () {
    this.cache.clear()
  }

  static _estimateSize (state) {
    // Assumes only JSON-serializable values
    // Assume each property has a 1 byte type field, and pointers are 4 bytes.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures
    switch (typeof state) {
      case 'boolean': return 5
      case 'number': return 9
      case 'string': return state.length * 2 + 1
      case 'object': {
        if (!state) return 5
        const keys = Object.keys(state)
        let size = 1 + keys.length * 4
        keys.forEach(key => {
          size += LocalCache._estimateSize(key)
          size += LocalCache._estimateSize(state[key])
        })
        return size
      }
      default: return 5
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalCache
