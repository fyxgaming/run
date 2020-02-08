const Protocol = require('./protocol')
const Location = require('./location')

// ------------------------------------------------------------------------------------------------
// UniqueMap
// ------------------------------------------------------------------------------------------------

/**
 * A Map that guarantees token keys are unique. The API is intended to be the same as the built-in
 * Map so that this can be a drop-in replacement in sandboxed code.

 * For a given entry, there are 4 cases to consider:
 *    1) Deployed tokens
 *    2) Undeployed tokens
 *    3) Deployable code currently undeployed
 *    4) Everything else
 */
class UniqueMap {
  constructor (iterable) {
    this._undeployed = new Set() // Undeployed tokens without an origin
    this._deployed = new Map() // Origin -> Token
    this._map = new Map()
    if (iterable) { for (const [x, y] of iterable) this.set(x, y) }
  }

  clear () {
    this._undeployed.clear()
    this._deployed.clear()
    this._map.clear()
  }

  _getUniqueKey (x) {
    const inconsistentWorldview = () => {
      const hint = 'Hint: Try syncing the relevant tokens before use.'
      const reason = 'Found two tokens with the same origin at different locations.'
      const message = 'Inconsistent worldview'
      throw new Error(`${message}\n\n${reason}\n\n${hint}`)
    }

    if (Protocol.isToken(x)) {
      const xOrigin = Protocol.getOrigin(x)
      const xLocation = Protocol.getLocation(x)
      const deployed = !!Location.parse(xOrigin).txid

      if (deployed) {
        // Case 1: Deployed token

        // Was this token previously in our undeployed set? If so, update it.
        for (const y of this._undeployed) {
          if (xOrigin === y.origin) {
            const yLocation = Protocol.getLocation(y)
            if (xLocation !== yLocation) inconsistentWorldview()
            this._undeployed.delete(y)
            this._deployed.set(xOrigin, y)
            return y
          }
        }

        // Have we already seen a token at this origin? If so, use that one.
        const y = this._deployed.get(xOrigin)
        if (y) {
          const yLocation = Protocol.getLocation(y)
          if (xLocation !== yLocation) inconsistentWorldview()
          return y
        }

        // First time seeing a token at this origin. Remember it.
        this._deployed.set(xOrigin, x)
        return x
      } else {
        // Case 2: Undeployed token
        this._undeployed.add(x)
        return x
      }
    } else if (Protocol.isDeployable(x)) {
      // Case 3: Undeployed code
      this._undeployed.add(x)
      return x
    } else {
      // Case 4: Everything else
      return x
    }
  }

  delete (x) {
    const key = this._getUniqueKey(x)
    this._undeployed.delete(key)
    this._deployed.delete(key)
    return this._map.delete(key)
  }

  get (x) { return this._map.get(this._getUniqueKey(x)) }
  set (x, y) { this._map.set(this._getUniqueKey(x), y); return this }
  has (x) { return this._map.has(this._getUniqueKey(x)) }
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

const UniqueMapDeps = { Location, Protocol }
const UniqueSetDeps = { UniqueMap }

module.exports = { UniqueMap, UniqueSet, UniqueMapDeps, UniqueSetDeps }
