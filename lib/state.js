/**
 * state.js
 *
 * State API and its default StateCache implementation that ships with Run
 */

const Location = require('./location')

// ------------------------------------------------------------------------------------------------

/**
 * API to save and provide jig states quickly.
 *
 * Jig states come in a special format and should not be created by hand. They are deterministic
 * and will not change for a given location.
 */
class State {
  /**
   * Gets the known state of a jig if it exists
   *
   * If this is an LRU cache, get should also bump the jig to the front.
   * @param {string} location Jig location string
   * @returns State object previously given with set, or undefined if it's not available
   */
  async get (location) { throw new Error('Not implemented') }

  /**
   * Saves the known state of a jig
   * @param {string} location Jig location to save
   * @param {object} state Known state
   */
  async set (location, state) { throw new Error('Not implemented') }
}

// ------------------------------------------------------------------------------------------------

/**
 * Default implementation of the State API that stores jig states in memory in a 10MB LRU cache
 */
class StateCache {
  constructor (options = {}) {
    this.cache = new Map() // location -> state
    this.sizeBytes = 0
    const maxSizeMB = typeof options.maxSizeMB === 'undefined' ? 10 : options.maxSizeMB
    this.maxSizeBytes = Math.floor(maxSizeMB * 1000 * 1000)
  }

  async get (location) {
    Location.parse(location)

    const had = this.cache.has(location)
    const value = this.cache.get(location)

    if (had) {
      // bump the state to the top
      this.set(location, value)

      return value
    }
  }

  async set (location, state) {
    Location.parse(location)

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

    this.sizeBytes += StateCache.estimateSize(state)

    while (this.sizeBytes > this.maxSizeBytes) {
      const oldestLocation = this.cache.keys().next().value
      const state = this.cache.get(oldestLocation)
      this.cache.delete(oldestLocation)
      this.sizeBytes -= StateCache.estimateSize(state)
    }
  }

  static estimateSize (state) {
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
          size += StateCache.estimateSize(key)
          size += StateCache.estimateSize(state[key])
        })
        return size
      }
      default: return 5
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { State, StateCache }
