/**
 * safe.js
 *
 * Data structures that are safe for working with resources.
 */

const Location = require('./location')
const { JigControl } = require('./jig')
const { _resourceType } = require('../../lib/kernel/misc')

// ------------------------------------------------------------------------------------------------
// SafeMap
// ------------------------------------------------------------------------------------------------

/**
 * A Map that guarantees resource keys are always unique.
 *
 * When you load the same resource twice, you may have two different Javascript objects referring
 * to the same blockchain location. A resource map ensures that keys are identified by their
 * onchain location and not just their Javascript object.
 *
 * The API is intended to be the same as the built-in Map.
 */
class SafeMap {
  constructor (iterable) {
    const internals = internal(this)
    internals._map = new Map() // Underlying map
    internals._deployed = new Map() // Origin -> Resource
    internals._undeployed = new Set() // Undeployed resources with no origin
    if (iterable) { for (const [x, y] of iterable) this.set(x, y) }
  }

  clear () {
    const internals = internal(this)
    internals._map.clear()
    internals._deployed.clear()
    internals._undeployed.clear()
  }

  delete (x) {
    const internals = internal(this)
    const key = uniqueKey(internals, x)
    internals._undeployed.delete(key)
    internals._deployed.delete(key)
    return internals._map.delete(key)
  }

  get (x) { return internal(this)._map.get(uniqueKey(internal(this), x)) }
  set (x, y) { internal(this)._map.set(uniqueKey(internal(this), x), y); return this }
  has (x) { return internal(this)._map.has(uniqueKey(internal(this), x)) }
  get size () { return internal(this)._map.size }
  get [Symbol.species] () { return SafeMap }
  entries () { return internal(this)._map.entries() }
  keys () { return internal(this)._map.keys() }
  forEach (callback, thisArg) { return internal(this)._map.forEach(callback, thisArg) }
  values () { return internal(this)._map.values() }
  [Symbol.iterator] () { return internal(this)._map[Symbol.iterator]() }
}

SafeMap.deps = { internal, uniqueKey }

// ------------------------------------------------------------------------------------------------
// SafeSet
// ------------------------------------------------------------------------------------------------

/**
 * The Set version of SafeMap
 *
 * This essentially wraps SafeMap and makes values the same as keys.
 */
class SafeSet {
  constructor (iterable) {
    internal(this).map = new SafeMap()
    if (iterable) { for (const x of iterable) this.add(x) }
  }

  get size () { return internal(this).map.size }
  get [Symbol.species] () { return SafeSet }
  add (x) { internal(this).map.set(x, x); return this }
  clear () { internal(this).map.clear() }
  delete (x) { return internal(this).map.delete(x) }
  entries () { return internal(this).map.entries() }
  forEach (callback, thisArg) { return internal(this).map.forEach(x => callback.call(thisArg, x)) }
  has (x) { return internal(this).map.has(x) }
  values () { return internal(this).map.values() }
  [Symbol.iterator] () { return internal(this).map.keys() }
}

SafeSet.deps = { internal, SafeMap }

// ------------------------------------------------------------------------------------------------
// uniqueKey
// ------------------------------------------------------------------------------------------------

const resourceOrigin = x => require('../../lib/kernel/membrane')._sudo(() => JigControl._disableSafeguards(() => x.origin || x.location))
const resourceLocation = x => require('../../lib/kernel/membrane')._sudo(() => JigControl._disableSafeguards(() => x.location))
const deployed = x => { try { return !!Location.parse(resourceOrigin(x)).txid } catch (e) { return false } }

let allowInconsistentWorldview = false

/**
 * Gets a unique key that respects resources regardless of if they are copies or undeployed
 */
function uniqueKey (internals, x) {
  // If this object is not a resource, then simply return. It becomes a regular key.
  if (!x || !_resourceType(x)) return x

  // An error message we'll use below
  const inconsistentWorldview = () => {
    if (allowInconsistentWorldview) return
    const hint = 'Hint: Try syncing the relevant resources before use.'
    const reason = 'Found two resources with the same origin at different locations.'
    const message = 'Inconsistent worldview'
    throw new Error(`${message}\n\n${reason}\n\n${hint}`)
  }

  // Case: Undeployed resources
  // -----------------------

  // If the resource is deploying, itself will be unique. We'll use it as the key.
  if (!deployed(x)) {
    internals._undeployed.add(x)
    return x
  }

  // Case: Deployed resources
  // ---------------------

  const xOrigin = resourceOrigin(x)
  const xLocation = resourceLocation(x)

  // Was this resource in our undeployed set at one point? Move it to our deployed set.
  for (const y of internals._undeployed) {
    if (xOrigin === resourceOrigin(y)) {
      const yLocation = resourceLocation(y)
      if (xLocation !== yLocation) inconsistentWorldview()
      internals._undeployed.delete(y)
      internals._deployed.set(xOrigin, y)
      return y
    }
  }

  // Have we already seen a resource at this origin? If so, use that one.
  const y = internals._deployed.get(xOrigin)
  if (y) {
    const yLocation = resourceLocation(y)
    if (xLocation !== yLocation) inconsistentWorldview()
    return y
  }

  // First time seeing a resource at this origin. Remember it.
  internals._deployed.set(xOrigin, x)
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
  // TODO REMOVE

  /*
  const target = JigControl._enableSpecialProps(() => {
    return x.$target || x
  })

  if (!internalData.has(target)) internalData.set(target, {})

  return internalData.get(target)
  */

  if (!internalData.has(x)) internalData.set(x, {})
  return internalData.get(x)
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
  SafeMap,
  SafeSet,
  _allowInconsistentWorldview
}
