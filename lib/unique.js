const Protocol = require('./protocol')
const Location = require('./location')

const UniquePrivates = new WeakMap()

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
    const priv = {
      undeployed: new Set(), // Undeployed tokens without an origin
      deployed: new Map(), // Origin -> Token
      map: new Map()
    }
    UniquePrivates.set(this, priv)
    if (iterable) { for (const [x, y] of iterable) this.set(x, y) }
  }

  clear () {
    const priv = UniquePrivates.get(this)
    priv.undeployed.clear()
    priv.deployed.clear()
    priv.map.clear()
  }

  _getUniqueKey (x) {
    const priv = UniquePrivates.get(this)

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
        for (const y of priv.undeployed) {
          if (xOrigin === y.origin) {
            const yLocation = Protocol.getLocation(y)
            if (xLocation !== yLocation) inconsistentWorldview()
            priv.undeployed.delete(y)
            priv.deployed.set(xOrigin, y)
            return y
          }
        }

        // Have we already seen a token at this origin? If so, use that one.
        const y = priv.deployed.get(xOrigin)
        if (y) {
          const yLocation = Protocol.getLocation(y)
          if (xLocation !== yLocation) inconsistentWorldview()
          return y
        }

        // First time seeing a token at this origin. Remember it.
        priv.deployed.set(xOrigin, x)
        return x
      } else {
        // Case 2: Undeployed token
        priv.undeployed.add(x)
        return x
      }
    } else if (Protocol.isDeployable(x)) {
      // Case 3: Undeployed code
      priv.undeployed.add(x)
      return x
    } else {
      // Case 4: Everything else
      return x
    }
  }

  delete (x) {
    const key = this._getUniqueKey(x)
    const priv = UniquePrivates.get(this)
    priv.undeployed.delete(key)
    priv.deployed.delete(key)
    return priv.map.delete(key)
  }

  get (x) { return UniquePrivates.get(this).map.get(this._getUniqueKey(x)) }
  set (x, y) { UniquePrivates.get(this).map.set(this._getUniqueKey(x), y); return this }
  has (x) { return UniquePrivates.get(this).map.has(this._getUniqueKey(x)) }
  get size () { return UniquePrivates.get(this).map.size }
  get [Symbol.species] () { return UniqueMap }
  entries () { return UniquePrivates.get(this).map.entries() }
  keys () { return UniquePrivates.get(this).map.keys() }
  forEach (callback, thisArg) { return UniquePrivates.get(this).map.forEach(callback, thisArg) }
  values () { return UniquePrivates.get(this).map.values() }
  [Symbol.iterator] () { return UniquePrivates.get(this).map[Symbol.iterator]() }
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
    UniquePrivates.set(this, new UniqueMap())
    if (iterable) { for (const x of iterable) this.add(x) }
  }

  get size () { return UniquePrivates.get(this).size }
  get [Symbol.species] () { return UniqueSet }
  add (x) { UniquePrivates.get(this).set(x, x); return this }
  clear () { UniquePrivates.get(this).clear() }
  delete (x) { return UniquePrivates.get(this).delete(x) }
  entries () { return UniquePrivates.get(this).entries() }
  forEach (callback, thisArg) { return UniquePrivates.get(this).forEach(x => callback.call(thisArg, x)) }
  has (x) { return UniquePrivates.get(this).has(x) }
  values () { return UniquePrivates.get(this).values() }
  [Symbol.iterator] () { return UniquePrivates.get(this).keys() }
}

// ------------------------------------------------------------------------------------------------

const UniqueMapDeps = { Location, Protocol, UniquePrivates }
const UniqueSetDeps = { UniqueMap, UniquePrivates }

module.exports = { UniqueMap, UniqueSet, UniqueMapDeps, UniqueSetDeps }
