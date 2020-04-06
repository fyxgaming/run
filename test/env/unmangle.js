/**
 * unmangle.js
 *
 * Wraps an object to remove property name mangling. We use this to test minified builds.
 */

// ------------------------------------------------------------------------------------------------
// unmangle
// ------------------------------------------------------------------------------------------------

// Wraps an object to unmangle its properties for testing in minified builds
function unmangle (obj) {
  const nameCache = require('../../dist/name-cache.json')
  const mangledKey = (prop, target) => {
    if (prop in target || typeof prop !== 'string') return prop
    if (('$' + prop) in nameCache.props.props) return nameCache.props.props['$' + prop]
    return prop
  }

  const handler = {
    get: (target, prop) => {
      // If we're getting a constructor, we can simply reproxy and return it here
      if (prop === 'constructor') return new Proxy(target.constructor, handler)

      // If the name cache has the key, use its transalted version
      const key = mangledKey(prop, target)
      const val = target[key]

      // If val is null, we can return it directly
      if (!val) return val

      // Regular functions get bound to the target not the proxy for better reliability
      if (typeof val === 'function' && !val.prototype) return val.bind(target)

      // Jigs don't need to be proxied and cause problems when they are
      // "val instanceof Jig" causes problems. Checking class names is good enough for tests.
      let type = val.constructor
      while (type) {
        if (type.name === 'Jig') return val
        type = Object.getPrototypeOf(type)
      }

      // Read-only non-confurable properties cannot be proxied
      const descriptor = Object.getOwnPropertyDescriptor(target, key)
      if (descriptor && descriptor.writable === false && descriptor.configurable === false) return val

      // Objects get re-proxied so that their sub-properties are unmangled
      if (typeof val === 'object' && prop !== 'prototype') return new Proxy(val, handler)

      // Regular types also get reproxied
      if (typeof val === 'function') return new Proxy(val, handler)

      // All other objects we return directly
      return val
    },

    set: (target, prop, value) => {
      // Sets are applied to the mangled properties if they exist
      const key = mangledKey(prop, target)
      target[key] = value
      return true
    },

    construct: (T, args) => {
      // If we construct from a type, the new instance gets proxied to be unmangled too
      return new Proxy(new T(...args), handler)
    }
  }

  return new Proxy(obj, handler)
}

// ------------------------------------------------------------------------------------------------

module.exports = unmangle
