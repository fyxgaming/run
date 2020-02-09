const Context = require('./context')

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
    Context.uniquePrivates.set(this, priv)
    if (iterable) { for (const [x, y] of iterable) this.set(x, y) }
  }

  clear () {
    const priv = Context.uniquePrivates.get(this)
    priv.undeployed.clear()
    priv.deployed.clear()
    priv.map.clear()
  }

  _getUniqueKey (x) {
    const priv = Context.uniquePrivates.get(this)

    const inconsistentWorldview = () => {
      const hint = 'Hint: Try syncing the relevant tokens before use.'
      const reason = 'Found two tokens with the same origin at different locations.'
      const message = 'Inconsistent worldview'
      throw new Error(`${message}\n\n${reason}\n\n${hint}`)
    }

    if (Context.Protocol.isToken(x)) {
      const xOrigin = Context.Protocol.getOrigin(x)
      const xLocation = Context.Protocol.getLocation(x)
      const deployed = !!Context.Location.parse(xOrigin).txid

      if (deployed) {
        // Case 1: Deployed token

        // Was this token previously in our undeployed set? If so, update it.
        for (const y of priv.undeployed) {
          if (xOrigin === y.origin) {
            const yLocation = Context.Protocol.getLocation(y)
            if (xLocation !== yLocation) inconsistentWorldview()
            priv.undeployed.delete(y)
            priv.deployed.set(xOrigin, y)
            return y
          }
        }

        // Have we already seen a token at this origin? If so, use that one.
        const y = priv.deployed.get(xOrigin)
        if (y) {
          const yLocation = Context.Protocol.getLocation(y)
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
    } else if (Context.Protocol.isDeployable(x)) {
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
    const priv = Context.uniquePrivates.get(this)
    priv.undeployed.delete(key)
    priv.deployed.delete(key)
    return priv.map.delete(key)
  }

  get (x) { return Context.uniquePrivates.get(this).map.get(this._getUniqueKey(x)) }
  set (x, y) { Context.uniquePrivates.get(this).map.set(this._getUniqueKey(x), y); return this }
  has (x) { return Context.uniquePrivates.get(this).map.has(this._getUniqueKey(x)) }
  get size () { return Context.uniquePrivates.get(this).map.size }
  get [Symbol.species] () { return UniqueMap }
  entries () { return Context.uniquePrivates.get(this).map.entries() }
  keys () { return Context.uniquePrivates.get(this).map.keys() }
  forEach (callback, thisArg) { return Context.uniquePrivates.get(this).map.forEach(callback, thisArg) }
  values () { return Context.uniquePrivates.get(this).map.values() }
  [Symbol.iterator] () { return Context.uniquePrivates.get(this).map[Symbol.iterator]() }
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
    Context.uniquePrivates.set(this, new Context.UniqueMap())
    if (iterable) { for (const x of iterable) this.add(x) }
  }

  get size () { return Context.uniquePrivates.get(this).size }
  get [Symbol.species] () { return UniqueSet }
  add (x) { Context.uniquePrivates.get(this).set(x, x); return this }
  clear () { Context.uniquePrivates.get(this).clear() }
  delete (x) { return Context.uniquePrivates.get(this).delete(x) }
  entries () { return Context.uniquePrivates.get(this).entries() }
  forEach (callback, thisArg) { return Context.uniquePrivates.get(this).forEach(x => callback.call(thisArg, x)) }
  has (x) { return Context.uniquePrivates.get(this).has(x) }
  values () { return Context.uniquePrivates.get(this).values() }
  [Symbol.iterator] () { return Context.uniquePrivates.get(this).keys() }
}

// ------------------------------------------------------------------------------------------------

module.exports = { UniqueMap, UniqueSet }
