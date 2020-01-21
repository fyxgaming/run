const Protocol = require('./protocol')

// ------------------------------------------------------------------------------------------------
// RunSet
// ------------------------------------------------------------------------------------------------

/**
 * A wrapped Set that guarantees tokens are unique
 */
class RunSet {
  constructor (iterable) {
    this._locations = new Map() // Location -> Token
    this._origins = new Map() // Origin -> Token
    this._set = new Set()
    if (iterable) { for (const x of iterable) this.add(x) }
  }

  get size () { return this._set.size }

  get [Symbol.species] () { return RunSet }

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
      throw new Error('Detected two of the same tokens with different locations')
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

    const location = Protocol.getLocation(token)
    const existingToken = this._locations.get(location)

    if (existingToken) {
      this._locations.delete(location)
      this._origins.delete(Protocol.getOrigin(x))
      this._set.delete(existingToken)
      return true
    }

    return false
  }

  has (x) {
    // Check token
    return this._set.has(x)
  }

  [Symbol.iterator] () { return this._set[Symbol.iterator]() }
}

// ------------------------------------------------------------------------------------------------
// RunMap
// ------------------------------------------------------------------------------------------------

/**
 * A wrapped Map that guarantees token keys are unique
 */
class RunMap {

}

// ------------------------------------------------------------------------------------------------

module.exports = { RunSet, RunMap }
