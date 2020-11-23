/**
 * expect.js
 *
 * Expect API for parameter checking in jigs
 */

const Jig = require('../kernel/jig')
const Editor = require('../kernel/editor')

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
    if (a === b) return true

    if (typeof a !== typeof b) return false

    if (typeof a !== 'object') return false

    if (a === null || b === null) return false

    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false

    if (Object.keys(a).length !== Object.keys(b).length) return false

    if (!Object.keys(a).every(key => deepEqual(a[key], b[key]))) return false

    if (a instanceof Set) {
      if (a.size !== b.size) return false
      if (!deepEqual(Array.from(a.entries()), Array.from(b.entries()))) return false
    }

    if (a instanceof Map) {
      if (a.size !== b.size) return false
      if (!deepEqual(Array.from(a.entries()), Array.from(b.entries()))) return false
    }

    return true
  }

  function extendsFrom (a, b) {
    if (typeof a !== 'function') return false
    if (typeof b !== 'function') return false
    while (a) {
      a = Object.getPrototypeOf(a)
      if (a === b) return true
    }
    return false
  }

  return {
    get not () { negated = !negated; return this },

    toBe: (value, message) => check(subject === value, `${stringify(value)}`, message),
    toEqual: (value, message) => check(deepEqual(subject, value), `equal to ${stringify(value)}`, message),
    toBeInstanceOf: (Class, message) => check(subject && subject instanceof Class, `an instance of ${Class && Class.name}`, message),

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
    toBeSet: message => check(subject instanceof Set, 'a set', message),
    toBeMap: message => check(subject instanceof Map, 'a map', message),
    toBeUint8Array: message => check(subject instanceof Uint8Array, 'a uint8array', message),

    toBeClass: message => check(typeof subject === 'function' && subject.toString().startsWith('class'), 'a class', message),
    toBeFunction: message => check(typeof subject === 'function' && !subject.toString().startsWith('class'), 'a function', message),
    toBeJigClass: message => check(typeof subject === 'function' && subject.toString().startsWith('class') && extendsFrom(subject, Jig), 'a jig class', message),
    toExtendFrom: (Class, message) => check(extendsFrom(subject, Class), `an extension of ${Class && Class.name}`, message)
  }
}

expect.deps = { Jig }

expect.toString() // Preserves the class name during compilation

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

expect.presets = {
  main: {
    location: '71fba386341b932380ec5bfedc3a40bce43d4974decdc94c419a94a8ce5dfc23_o1',
    origin: '71fba386341b932380ec5bfedc3a40bce43d4974decdc94c419a94a8ce5dfc23_o1',
    nonce: 1,
    owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
    satoshis: 0
  },

  test: {
    location: 'f97d4ac2a3d6f5ed09fad4a4f341619dc5a3773d9844ff95c99c5d4f8388de2f_o1',
    origin: 'f97d4ac2a3d6f5ed09fad4a4f341619dc5a3773d9844ff95c99c5d4f8388de2f_o1',
    nonce: 1,
    owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
    satoshis: 0
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Editor._preinstall(expect)
