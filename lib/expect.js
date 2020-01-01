/**
 * expect.js
 *
 * Expect API for parameter checking in jigs
 */

function expect (subject) {
  let negated = false

  const stringify = x => typeof x === 'object' ? JSON.stringify(x) : x

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

expect.originTestnet = 'f02739791f7d54bfed43452faef4c994f87d93d33cafa4d246345358d4f96460_o1'
expect.locationTestnet = 'f02739791f7d54bfed43452faef4c994f87d93d33cafa4d246345358d4f96460_o1'
expect.ownerTestnet = '020b48771735aac0b1d5362a5341f7f9ff9df9deac0aec709c9314ba5460254189'
expect.originMainnet = '4fce929af95eaae77fbb75520c5c6cc37a60b8809a8e30794aa54de85151cc5a_o1'
expect.locationMainnet = '4fce929af95eaae77fbb75520c5c6cc37a60b8809a8e30794aa54de85151cc5a_o1'
expect.ownerMainnet = '02ed21e46d53ca50b04dbb44d27db3e773602276178425ab6ed69743f82d7a3468'

module.exports = expect
