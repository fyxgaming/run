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

  add (token) {
    if (!Protocol.isToken(token)) {
      this._set.add(token)
      return this
    }

    const location = Protocol.getLocation(token)
    if (this._locations.has(location)) {
      return this
    }

    const origin = Protocol.getOrigin(token)
    if (this._origins.has(origin)) {
      throw new Error('Detected two of the same tokens with different locations')
    }

    this._locations.set(location, token)
    this._origins.set(origin, token)
    this._set.add(token)

    return this
  }

  clear () {
    this._locations.clear()
    this._origins.clear()
    this._set.clear()
  }

  delete (token) {
    if (!Protocol.isToken(token)) throw new Error(`Only tokens may be removed from a token set. Added: ${token}`)

    const location = Protocol.getLocation(token)
    const existingToken = this._locations.get(location)

    if (existingToken) {
      this._locations.delete(location)
      this._origins.delete(Protocol.getOrigin(token))
      this._tokens.delete(existingToken)
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
