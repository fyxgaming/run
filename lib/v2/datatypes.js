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
    this._locations = new Map() // Location -> Token
    this._origins = new Map() // Origin -> Token
    this._set = new Set()
    if (iterable) { for (const x of iterable) this.add(x) }
  }

  add (x) {
    if (!Protocol.isToken(x)) {
      this._set.add(x)
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
    this._set.add(x)

    return this
  }

  clear () {
    this._locations.clear()
    this._origins.clear()
    this._set.clear()
  }

  delete (x) {
    if (!Protocol.isToken(x)) {
      return this._set.delete(x)
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
    this._set.delete(existingToken)
    return true
  }

  has (x) {
    if (!Protocol.isToken(x)) {
      return this._set.has(x)
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

  get size () { return this._set.size }
  get [Symbol.species] () { return RunSet }
  entries () { return this._set.entries() }
  forEach (callback, thisArg) { return this._set.forEach(callback, thisArg) }
  values () { return this._set.values() }
  [Symbol.iterator] () { return this._set[Symbol.iterator]() }
}

// ------------------------------------------------------------------------------------------------
// RunMap
// ------------------------------------------------------------------------------------------------

/**
 * A Map that guarantees token keys are unique. The API is intended to be the same as the built-in
 * Set so that this can be a drop-in replacement in sandboxed code.
 */
class RunMap {

}

// ------------------------------------------------------------------------------------------------

module.exports = { RunSet, RunMap }
