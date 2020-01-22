const Protocol = require('./protocol')

// ------------------------------------------------------------------------------------------------
// RunSet
// ------------------------------------------------------------------------------------------------

/**
 * A Set that guarantees tokens are unique. The API is intended to be the same as the built-in
 * Set so that this can be a drop-in replacement in sandboxed code.
 */
class RunSet {
  constructor (iterable) {
    this.map = new RunMap()
    if (iterable) { for (const x of iterable) this.add(x) }
  }

  get size () { return this.map.size }
  get [Symbol.species] () { return RunSet }

  add (x) { this.map.set(x, x); return this }
  clear () { this.map.clear() }
  delete (x) { return this.map.delete(x) }
  entries () { return this.map.entries() }
  forEach (callback, thisArg) { return this.map.forEach(x => callback.call(thisArg, x)) }
  has (x) { return this.map.has(x) }
  values () { return this.map.values() }

  [Symbol.iterator] () { return this.map.keys() }
}

// ------------------------------------------------------------------------------------------------
// RunMap
// ------------------------------------------------------------------------------------------------

/**
 * A Map that guarantees token keys are unique. The API is intended to be the same as the built-in
 * Set so that this can be a drop-in replacement in sandboxed code.
 */
class RunMap {
  constructor (iterable) {
    this._locations = new Map() // Location -> Token
    this._origins = new Map() // Origin -> Token
    this._map = new Map()
    if (iterable) { for (const [x, y] of iterable) this.set(x, y) }
  }

  set (x, y) {
    if (!Protocol.isToken(x)) {
      this._map.set(x, y)
      return this
    }

    const location = Protocol.getLocation(x)
    if (this._locations.has(location)) {
      return this
    }

    const origin = Protocol.getOrigin(x)
    if (this._origins.has(origin)) {
      throw new Error('Detected two of the same token with different locations')
    }

    this._locations.set(location, x)
    this._origins.set(origin, x)
    this._map.set(x, y)

    return this
  }

  clear () {
    this._locations.clear()
    this._origins.clear()
    this._map.clear()
  }

  delete (x) {
    if (!Protocol.isToken(x)) {
      return this._map.delete(x)
    }

    const location = Protocol.getLocation(x)
    const origin = Protocol.getOrigin(x)
    const existingToken = this._origins.get(origin) || this._locations.get(location)
    if (!existingToken) return false

    if (Protocol.getLocation(existingToken) !== location) {
      throw new Error('Detected two of the same token with different locations')
    }

    this._locations.delete(location)
    this._origins.delete(origin)
    this._map.delete(existingToken)
    return true
  }

  has (x) {
    if (!Protocol.isToken(x)) {
      return this._map.has(x)
    }

    const location = Protocol.getLocation(x)
    const origin = Protocol.getOrigin(x)
    const existingToken = this._origins.get(origin) || this._locations.get(location)
    if (!existingToken) return false

    if (Protocol.getLocation(existingToken) !== location) {
      throw new Error('Detected two of the same token with different locations')
    }

    return !!existingToken
  }

  get size () { return this._map.size }
  get [Symbol.species] () { return RunMap }
  entries () { return this._map.entries() }
  keys () { return this._map.keys() }
  forEach (callback, thisArg) { return this._map.forEach(callback, thisArg) }
  values () { return this._map.values() }
  [Symbol.iterator] () { return this._map[Symbol.iterator]() }
}

// ------------------------------------------------------------------------------------------------

module.exports = { RunSet, RunMap }
