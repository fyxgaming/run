/**
 * token-set.js
 *
 * Data structures that are safe for working with tokens.
 */

const Protocol = require('../kernel/protocol')
const Location = require('../kernel/location')

// ------------------------------------------------------------------------------------------------
// TokenMap
// ------------------------------------------------------------------------------------------------

/**
 * A Map that guarantees token keys are always unique.
 *
 * When you load the same token twice, you may have two different Javascript objects referring
 * to the same blockchain location. A token map ensures that keys are identified by their
 * onchain location and not just their Javascript object.
 *
 * The API is intended to be the same as the built-in Map.
 */
class TokenMap {
  constructor (iterable) {
    const internals = internal(this)
    internals.map = new Map() // Underlying map
    internals.deployed = new Map() // Origin -> Token
    internals.undeployed = new Set() // Undeployed tokens with no origin
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
    const key = uniqueKey(internals, x)
    internals.undeployed.delete(key)
    internals.deployed.delete(key)
    return internals.map.delete(key)
  }

  get (x) { return internal(this).map.get(uniqueKey(internal(this), x)) }
  set (x, y) { internal(this).map.set(uniqueKey(internal(this), x), y); return this }
  has (x) { return internal(this).map.has(uniqueKey(internal(this), x)) }
  get size () { return internal(this).map.size }
  get [Symbol.species] () { return TokenMap }
  entries () { return internal(this).map.entries() }
  keys () { return internal(this).map.keys() }
  forEach (callback, thisArg) { return internal(this).map.forEach(callback, thisArg) }
  values () { return internal(this).map.values() }
  [Symbol.iterator] () { return internal(this).map[Symbol.iterator]() }
}

// ------------------------------------------------------------------------------------------------
// TokenSet
// ------------------------------------------------------------------------------------------------

/**
 * The Set version of TokenMap
 *
 * This essentially wraps TokenMap and makes values the same as keys.
 */
class TokenSet {
  constructor (iterable) {
    internal(this).map = new TokenMap()
    if (iterable) { for (const x of iterable) this.add(x) }
  }

  get size () { return internal(this).map.size }
  get [Symbol.species] () { return TokenSet }
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
// Gets a unique key that respects tokens
// ------------------------------------------------------------------------------------------------

function uniqueKey (internals, x) {
  const inconsistentWorldview = () => {
    const hint = 'Hint: Try syncing the relevant tokens before use.'
    const reason = 'Found two tokens with the same origin at different locations.'
    const message = 'Inconsistent worldview'
    throw new Error(`${message}\n\n${reason}\n\n${hint}`)
  }

  if (Protocol.isPickup(x)) {
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

      // Have we already seen a token at this origin? If so, use that one.
      const y = internals.deployed.get(xOrigin)
      if (y) {
        const yLocation = Protocol.getLocation(y)
        if (xLocation !== yLocation) inconsistentWorldview()
        return y
      }

      // First time seeing a token at this origin. Remember it.
      internals.deployed.set(xOrigin, x)
      return x
    } else {
      // Case 2: Undeployed token
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

const internalData = new WeakMap()

/**
 * Gets the hidden variables for an object using the WeakMap pattern
 */
function internal (x) {
  if (!internalData.has(x)) internalData.set(x, {})

  return internalData.get(x)
}

// ------------------------------------------------------------------------------------------------
// Sandbox
// ------------------------------------------------------------------------------------------------

function createSandboxedTokenMap (evaluator) {
  return evaluator.evaluate(TokenMap.toString(), { internal, uniqueKey }).result
}

function createSandboxedTokenSet (evaluator) {
  return evaluator.evaluate(TokenSet.toString(), { internal, TokenMap, uniqueKey }).result
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  TokenMap,
  TokenSet,
  createSandboxedTokenMap,
  createSandboxedTokenSet
}
