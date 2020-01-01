/**
 * state.js
 *
 * Jig state cache
 */

/**
 * Stores the local
 */
class State {
  async get (location) { throw new Error('not implemented') }

  // refresh
  async set (location, state) { throw new Error('not implemented') }
}

class StateCache {
  constructor (options = {}) {
    this.cache = new Map() // location -> state
    this.sizeBytes = 0
    const maxSizeMB = typeof options.maxSizeMB === 'undefined' ? 10 : options.maxSizeMB
    this.maxSizeBytes = Math.floor(maxSizeMB * 1000 * 1000)
  }

  async get (location) {
    const value = this.cache.get(location)
    if (value) return value
  }

  async set (location, state) {
    const removed = this.cache.delete(location)
    this.cache.set(location, state)

    if (removed) return

    this.sizeBytes += StateCache._estimateSize(state)

    while (this.sizeBytes > this.maxSizeBytes) {
      const oldestLocation = this.cache.keys().next().value
      const state = this.cache.get(oldestLocation)
      this.cache.delete(oldestLocation)
      this.sizeBytes -= StateCache._estimateSize(state)
    }
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
          size += StateCache._estimateSize(key)
          size += StateCache._estimateSize(state[key])
        })
        return size
      }
      default: return 5
    }
  }

  clear () {
    this.cache.clear()
    this.sizeBytes = 0
  }
}

module.exports = { State, StateCache }
