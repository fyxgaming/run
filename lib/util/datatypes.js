/**
 * set.js
 *
 * Data structures that are safe for working with tokens.
 */

const Location = require('./location')
const { JigControl } = require('../kernel/jig')
const { _tokenType } = require('./misc')

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

TokenMap.deps = { internal, uniqueKey }

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

TokenSet.deps = { internal, TokenMap }

// ------------------------------------------------------------------------------------------------
// uniqueKey
// ------------------------------------------------------------------------------------------------

const tokenOrigin = x => JigControl._disableSafeguards(() => x.origin || x.location)
const tokenLocation = x => JigControl._disableSafeguards(() => x.location)
const deployed = x => { try { return !!Location.parse(tokenOrigin(x)).txid } catch (e) { return false } }

let allowInconsistentWorldview = false

/**
 * Gets a unique key that respects tokens regardless of if they are copies or undeployed
 */
function uniqueKey (internals, x) {
  // If this object is not a token, then simply return. It becomes a regular key.
  if (!x || !_tokenType(x)) return x

  // An error message we'll use below
  const inconsistentWorldview = () => {
    if (allowInconsistentWorldview) return
    const hint = 'Hint: Try syncing the relevant tokens before use.'
    const reason = 'Found two tokens with the same origin at different locations.'
    const message = 'Inconsistent worldview'
    throw new Error(`${message}\n\n${reason}\n\n${hint}`)
  }

  // Case: Undeployed tokens
  // -----------------------

  // If the token is deploying, itself will be unique. We'll use it as the key.
  if (!deployed(x)) {
    internals.undeployed.add(x)
    return x
  }

  // Case: Deployed tokens
  // ---------------------

  const xOrigin = tokenOrigin(x)
  const xLocation = tokenLocation(x)

  // Was this token in our undeployed set at one point? Move it to our deployed set.
  for (const y of internals.undeployed) {
    if (xOrigin === tokenOrigin(y)) {
      const yLocation = tokenLocation(y)
      if (xLocation !== yLocation) inconsistentWorldview()
      internals.undeployed.delete(y)
      internals.deployed.set(xOrigin, y)
      return y
    }
  }

  // Have we already seen a token at this origin? If so, use that one.
  const y = internals.deployed.get(xOrigin)
  if (y) {
    const yLocation = tokenLocation(y)
    if (xLocation !== yLocation) inconsistentWorldview()
    return y
  }

  // First time seeing a token at this origin. Remember it.
  internals.deployed.set(xOrigin, x)
  return x
}

// ------------------------------------------------------------------------------------------------
// internal
// ------------------------------------------------------------------------------------------------

const internalData = new WeakMap()

/**
 * Gets the hidden variables for an object using the WeakMap pattern
 */
function internal (x) {
  const target = JigControl._enableSpecialProps(() => {
    return x.$target || x
  })

  if (!internalData.has(target)) internalData.set(target, {})

  return internalData.get(target)
}

// ------------------------------------------------------------------------------------------------
// _allowInconsistentWorldview
// ------------------------------------------------------------------------------------------------

/**
 * Internal method to disable the consistency checks that locations always be unique, so that we
 * can use this class within our Inventory
 * @param {function} f Callback to run while consistency checks are disabled
 */
function _allowInconsistentWorldview (f) {
  const oldAllowInconsistentWorldview = allowInconsistentWorldview
  allowInconsistentWorldview = true
  try {
    f()
  } finally {
    allowInconsistentWorldview = oldAllowInconsistentWorldview
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  TokenMap,
  TokenSet,
  _allowInconsistentWorldview
}
