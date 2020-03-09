/**
 * friendly.js
 *
 * Data structures that are safe for working with pickups. We call them friendly data structures.
 */

const Protocol = require('./protocol')
const Location = require('./location')

// ------------------------------------------------------------------------------------------------
// FriendlyMap
// ------------------------------------------------------------------------------------------------

/**
 * A Map that guarantees pickup keys are always unique.
 *
 * When you load the same pickup twice, you may have two different Javascript objects referring
 * to the same blockchain location. A friendly map ensures that keys are identified by their
 * onchain location and not just their Javascript object.
 *
 * The API is intended to be the same as the built-in Map.
 */
class FriendlyMap {
  constructor (iterable) {
    const internals = internal(this)
    internals.map = new Map() // Underlying map
    internals.deployed = new Map() // Origin -> Pickup
    internals.undeployed = new Set() // Undeployed pickups with no origin
    if (iterable) { for (const [x, y] of iterable) this.set(x, y) }
  }

  clear () {
    const internals = internal(this)
    internals.map.clear()
    internals.deployed.clear()
    internals.undeployed.clear()
  }

  delete (x) {
    const internals = internal(this)
    const key = friendlyKey(internals, x)
    internals.undeployed.delete(key)
    internals.deployed.delete(key)
    return internals.map.delete(key)
  }

  get (x) { return internal(this).map.get(friendlyKey(internal(this), x)) }
  set (x, y) { internal(this).map.set(friendlyKey(internal(this), x), y); return this }
  has (x) { return internal(this).map.has(friendlyKey(internal(this), x)) }
  get size () { return internal(this).map.size }
  get [Symbol.species] () { return FriendlyMap }
  entries () { return internal(this).map.entries() }
  keys () { return internal(this).map.keys() }
  forEach (callback, thisArg) { return internal(this).map.forEach(callback, thisArg) }
  values () { return internal(this).map.values() }
  [Symbol.iterator] () { return internal(this).map[Symbol.iterator]() }
}

// ------------------------------------------------------------------------------------------------
// FriendlySet
// ------------------------------------------------------------------------------------------------

/**
 * The Set version of FriendlyMap
 *
 * This essentially wraps FriendlyMap and makes values the same as keys.
 */
class FriendlySet {
  constructor (iterable) {
    internal(this).map = new FriendlyMap()
    if (iterable) { for (const x of iterable) this.add(x) }
  }

  get size () { return internal(this).map.size }
  get [Symbol.species] () { return FriendlySet }
  add (x) { internal(this).map.set(x, x); return this }
  clear () { internal(this).map.clear() }
  delete (x) { return internal(this).map.delete(x) }
  entries () { return internal(this).map.entries() }
  forEach (callback, thisArg) { return internal(this).map.forEach(x => callback.call(thisArg, x)) }
  has (x) { return internal(this).map.has(x) }
  values () { return internal(this).map.values() }
  [Symbol.iterator] () { return internal(this).map.keys() }
}

// ------------------------------------------------------------------------------------------------
// Gets a unique key that respects pickups
// ------------------------------------------------------------------------------------------------

function friendlyKey (internals, x) {
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
      for (const y of internals.undeployed) {
        if (xOrigin === y.origin) {
          const yLocation = Protocol.getLocation(y)
          if (xLocation !== yLocation) inconsistentWorldview()
          internals.undeployed.delete(y)
          internals.deployed.set(xOrigin, y)
          return y
        }
      }

      // Have we already seen a pickup at this origin? If so, use that one.
      const y = internals.deployed.get(xOrigin)
      if (y) {
        const yLocation = Protocol.getLocation(y)
        if (xLocation !== yLocation) inconsistentWorldview()
        return y
      }

      // First time seeing a pickup at this origin. Remember it.
      internals.deployed.set(xOrigin, x)
      return x
    } else {
      // Case 2: Undeployed pickup
      internals.undeployed.add(x)
      return x
    }
  } else if (Protocol.isDeployable(x)) {
    // Case 3: Undeployed code
    internals.undeployed.add(x)
    return x
  } else {
    // Case 4: Everything else
    return x
  }
}

// ------------------------------------------------------------------------------------------------
// Private variables
// ------------------------------------------------------------------------------------------------

/**
 * Gets the hidden variable object for an object using the WeakMap pattern
 *
 * https://chrisrng.svbtle.com/using-weakmap-for-private-properties
 */
function internal (x) {
  if (!internalData.has(x)) internalData.set(x, {})
  return internalData.get(x)
}

const internalData = new WeakMap()

// ------------------------------------------------------------------------------------------------
// Sandbox
// ------------------------------------------------------------------------------------------------

function createSandboxedFriendlyMap (evaluator) {
  return evaluator.evaluate(FriendlyMap.toString(), { internal })[0]
}

function createSandboxedFriendlySet (evaluator) {
  return evaluator.evaluate(FriendlySet.toString(), { internal, FriendlyMap })[0]
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  FriendlyMap,
  FriendlySet,
  createSandboxedFriendlyMap,
  createSandboxedFriendlySet
}
