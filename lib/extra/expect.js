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

expect.originMainnet = 'd8c9fdf04e3448244aa85d542e15346606199f4b062b93aee201345a4a298a1b_o1'
expect.locationMainnet = 'd8c9fdf04e3448244aa85d542e15346606199f4b062b93aee201345a4a298a1b_o1'
expect.ownerMainnet = '1AgZUurMYcQFAkNi1xcGtpmqZGEtRmpy37'

expect.originTestnet = '869967b0ec4749089374d21b9092c75259d7f573fc80a4ae82ce752ed3ded58b_o1'
expect.locationTestnet = '869967b0ec4749089374d21b9092c75259d7f573fc80a4ae82ce752ed3ded58b_o1'
expect.ownerTestnet = 'mwJiFQ2ZTQsD6yqyhRfAhjDxftUhEPMpyD'

module.exports = expect
