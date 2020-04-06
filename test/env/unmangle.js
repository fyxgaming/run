/**
 * unmangle.js
 *
 * Wraps an object to remove property name mangling. We use this to test minified builds.
 */

let mangledProps = {}
try { mangledProps = require('../../dist/name-cache.json').props.props } catch (e) { }

// ------------------------------------------------------------------------------------------------
// unmangle
// ------------------------------------------------------------------------------------------------

/**
 * Wraps an object so that its immediate properties are able to be accessed unmangled
 */
function unmangle (x) {
  return new Proxy(x, {
    get: (target, prop) => {
      if (typeof prop !== 'string') return target[prop]
      if (prop in target) return target[prop]
      if (('$' + prop) in mangledProps) return target[mangledProps['$' + prop]]
    },

    set: (target, prop, value) => {
      if (typeof prop !== 'string') target[prop] = value
      if (prop in target) target[prop] = value
      if (('$' + prop) in mangledProps) target[mangledProps['$' + prop]] = value
      return true
    }
  })
}

// ------------------------------------------------------------------------------------------------
// unmangle
// ------------------------------------------------------------------------------------------------

/**
 * Transforms an object so that every key is mangled to be used within Run
 */
function mangle (x) {
  Object.keys(x).forEach(key => {
    const mangledKey = '$' + key
    if (mangledKey in mangledProps) {
      x[mangledProps[mangledKey]] = x[key]
      delete x[key]
    }
  })
  return x
}

// ------------------------------------------------------------------------------------------------

module.exports = { unmangle, mangle }
