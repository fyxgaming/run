const Protocol = require('./protocol')
const Location = require('../location')

// ------------------------------------------------------------------------------------------------
// UniqueMap
// ------------------------------------------------------------------------------------------------

/**
 * A Map that guarantees token keys are unique. The API is intended to be the same as the built-in
 * Map so that this can be a drop-in replacement in sandboxed code.

 * For a given entry, there are 4 cases to consider:
 *    1) Deployed tokens - need to make sure locations don't conflict
 *    2) Undeployed tokens
 *    3) Deployable code currently undeployed - need to monitor when deployed
 *    4) Everything else
 */
class UniqueMap {
  constructor (iterable) {
    this._tokensUndeployed = new Set() // Undeployed tokens without an origin
    this._tokensByLocation = new Map() // Location -> Token
    this._tokensByOrigin = new Map() // Origin -> Token
    this._map = new Map()
    if (iterable) { for (const [x, y] of iterable) this.set(x, y) }
  }

  clear () {
    // TODO
    this._locations.clear()
    this._origins.clear()
    this._map.clear()
  }

  get (x) { this._map.get(this._getUniqueKey(x)) }
  set (x, y) { this._map.set(this._getUniqueKey(x), y); return this }
  delete (x) { return this._map.delete(this._getUniqueKey(x)) }
  has (x) { return this._map.has(this._getUniqueKey(x)) }

  _getUniqueKey (x) {
    return x
    if (Protocol.isToken(x)) {
      const origin = Protocol.getOrigin(x)
      const deployed = !!Location.parse(origin).txid
      if (deployed) {
        // Case 1: Deployed token
        if (this._tokensUndeployed.has(x)) {
          // Case 1.a: Previously undeployed, now deployed token
          this._tokensUndeployed.delete(x)
        }
        const existingToken = _tokensByOrigin.get(origin)
        const location = Protocol.getLocation(x)

        // Case 1.a: Deployed token with a same known location
        // Case 1.b: Deployed token with a different location
      } else {
        // Case 2: Undeployed token
      }
    } else if (Protocol.isDeployable(x)) {
      // Case 3: Undeployed code
      return this._map.get(x)
    } else {
      // Case 4: Everything else
      return this._map.get(x)
    }
  }

  get size () { return this._map.size }
  get [Symbol.species] () { return UniqueMap }
  entries () { return this._map.entries() }
  keys () { return this._map.keys() }
  forEach (callback, thisArg) { return this._map.forEach(callback, thisArg) }
  values () { return this._map.values() }
  [Symbol.iterator] () { return this._map[Symbol.iterator]() }
}

// ------------------------------------------------------------------------------------------------
// UniqueSet
// ------------------------------------------------------------------------------------------------

/**
 * A Set that guarantees tokens are unique. The API is intended to be the same as the built-in
 * Set so that this can be a drop-in replacement in sandboxed code.
 */
class UniqueSet {
  constructor (iterable) {
    this.map = new UniqueMap()
    if (iterable) { for (const x of iterable) this.add(x) }
  }

  get size () { return this.map.size }
  get [Symbol.species] () { return UniqueSet }
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

module.exports = { UniqueSet, UniqueMap }
