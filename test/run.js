/**
 * process.js
 *
 * Provides the Run build for tests
 *
 * The same tests run in different environments (node, browser) and with different Run builds
 * (lib, dist). This module outputs the appropriate instance for the test environment.
 */

const process = require('process')

// The test mode determines the Run build. It is either an environment variable or a webpack define.
// We override global.TEST_MODE so that we can just use TEST_MODE.
global.TEST_MODE = process.env.TEST_MODE

let Run = null

if (TEST_MODE === 'lib') Run = require('../lib')
if (TEST_MODE === 'cover') Run = require('../lib')
if (TEST_MODE === 'dist') Run = require('../dist/run.node.min')
if (TEST_MODE === 'webpack') Run = require('run')

// We check if _util is defined on Run to see if Run was obfuscated. If it was, we return a proxy
// that allows tests to access the original properties as if they were unobfuscated.
const needsUnobfuscation = typeof Run._util === 'undefined'

// Wraps an object to unobfuscate its properties for testing in obfuscated builds
function unobfuscate (obj) {
  if (!needsUnobfuscation) return obj

  const obfuscationMap = require('../dist/obfuscation-map.json')

  const handler = {
    get: (target, prop) => {
      // If we're getting a constructor, we can simply reproxy and return it here
      if (prop === 'constructor') return new Proxy(target.constructor, handler)

      // If the obfuscation map has the key, use its transalted version
      const key = typeof obfuscationMap[prop] === 'string' ? obfuscationMap[prop] : prop
      const val = target[key]

      // If val is null, we can return it directly
      if (!val) return val

      // Regular functions get bound to the target not the proxy for better reliability
      if (typeof val === 'function' && !val.prototype) return val.bind(target)

      // Jigs don't need to be proxied and cause problems when they are
      if (val.constructor && val.constructor.name === 'Jig') return val

      // Read-only non-confurable properties cannot be proxied
      const descriptor = Object.getOwnPropertyDescriptor(target, key)
      if (descriptor && descriptor.writable === false && descriptor.configurable === false) return val

      // Objects get re-proxied so that their sub-properties are unobfuscated
      if (typeof val === 'object' && prop !== 'prototype') return new Proxy(val, handler)

      // All other objects we return directly
      return val
    },

    set: (target, prop, value) => {
      // Sets are applied to the obfuscated properties if they exist
      const key = prop in obfuscationMap ? obfuscationMap[prop] : prop
      target[key] = value
      return true
    },

    construct: (T, args) => {
      // If we construct from a type, the new instance gets proxied to be unobfuscated too
      return new Proxy(new T(...args), handler)
    }
  }

  return new Proxy(obj, handler)
}

Run = unobfuscate(Run)

module.exports = { Run, unobfuscate }
