/**
 * expect.js
 *
 * Expect API for parameter checking in jigs
 */

// ------------------------------------------------------------------------------------------------
// expect
// ------------------------------------------------------------------------------------------------

function expect (subject) {
  let negated = false

  const stringify = x => {
    if (typeof x !== 'object' || !x) return x
    try { return JSON.stringify(x) } catch (e) { return x.toString() }
  }

  function check (condition, conditionString, message) {
    if (negated ? condition : !condition) {
      throw new Error(message || `expected value${negated ? ' not' : ''} to be ${conditionString} but was ${stringify(subject)}`)
    }
  }

  function deepEqual (a, b) {
    if (typeof a !== typeof b) return false
    if (typeof a === 'object' && typeof b === 'object') {
      if (a === null && b === null) return true
      if (a === null || b === null) return false
      if (Object.keys(a).length !== Object.keys(b).length) return false
      return Object.keys(a).every(key => deepEqual(a[key], b[key]))
    }
    return a === b
  }

  return {
    get not () { negated = !negated; return this },

    toBe: (value, message) => check(subject === value, `${stringify(value)}`, message),
    toEqual: (value, message) => check(deepEqual(subject, value), `equal to ${stringify(value)}`, message),
    toBeInstanceOf: (Class, message) => check(subject && subject instanceof Class, `an instance of ${Class.name}`, message),

    toBeDefined: message => check(typeof subject !== 'undefined', 'defined', message),
    toBeNull: message => check(subject === null, 'null', message),

    toBeNumber: message => check(typeof subject === 'number', 'a number', message),
    toBeInteger: message => check(Number.isInteger(subject), 'an integer', message),
    toBeLessThan: (value, message) => check(subject < value && typeof subject === 'number' && typeof value === 'number', `less than ${value}`, message),
    toBeLessThanOrEqualTo: (value, message) => check(subject <= value && typeof subject === 'number' && typeof value === 'number', `less than or equal to ${value}`, message),
    toBeGreaterThan: (value, message) => check(subject > value && typeof subject === 'number' && typeof value === 'number', `greater than ${value}`, message),
    toBeGreaterThanOrEqualTo: (value, message) => check(subject >= value && typeof subject === 'number' && typeof value === 'number', `greater than or equal to ${value}`, message),

    toBeBoolean: message => check(typeof subject === 'boolean', 'a boolean', message),
    toBeString: message => check(typeof subject === 'string', 'a string', message),
    toBeObject: message => check(subject && typeof subject === 'object', 'an object', message),
    toBeArray: message => check(Array.isArray(subject), 'an array', message),

    toBeClass: message => check(typeof subject === 'function' && subject.toString().startsWith('class'), 'a class', message),
    toBeFunction: message => check(typeof subject === 'function' && !subject.toString().startsWith('class'), 'a function', message)
  }
}

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

expect.originMainnet = '0f99a89c41a857402973fe2d767de69488fbdaf54067a2b1eb500c9d0eb3d21a_o3'
expect.locationMainnet = '0f99a89c41a857402973fe2d767de69488fbdaf54067a2b1eb500c9d0eb3d21a_o3'
expect.ownerMainnet = '1CscRyquNBh5UAVYhfxvy1HfnQrSLe85MG'

expect.originTestnet = 'ddcee5e04c67c2077026d813b2315c69a871ad38b47209d83f9e213a15663c57_o3'
expect.locationTestnet = 'ddcee5e04c67c2077026d813b2315c69a871ad38b47209d83f9e213a15663c57_o3'
expect.ownerTestnet = 'mqvDyKXEfdbUYTepHbi3vvtCxRrGVDgGcb'

// ------------------------------------------------------------------------------------------------

module.exports = expect
