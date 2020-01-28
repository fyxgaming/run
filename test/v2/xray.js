const { describe, it } = require('mocha')
const { expect } = require('chai')
const Xray = require('../../lib/v2/xray')

// ------------------------------------------------------------------------------------------------
// Test vectors
// ------------------------------------------------------------------------------------------------

const cloneables = [
  true,
  false,
  0,
  -1,
  Number.MAX_SAFE_INTEGER,
  Number.MIN_SAFE_INTEGER,
  Number.MAX_VALUE,
  Number.MIN_VALUE,
  0.5,
  -1.5,
  NaN,
  Infinity,
  -Infinity,
  '',
  'abc',
  '🐉',
  undefined,
  null
]

const nonCloneables = [
  new Date(),
  new WeakSet(),
  new WeakMap(),
  class {},
  function f() {},
  Math,
  Buffer,
  Symbol.iterator,
  Symbol.species
]

const deployables = [
  class { },
  class A { },
  class { method () { return null }},
  class A { constructor () { } },
  function f () {},
  function add (a, b) { return a + b },
  function () { return '123' },
  () => {},
  x => x
]

const nonDeployables = [
  Math.random,
  Array.prototype.indexOf,
  WeakSet.prototype.has,
  isNaN,
  eval
]

// ------------------------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------------------------

describe('Xray', () => {
  describe('cloneable', () => {
    it('should return true for cloneables', () => {
      const xray = new Xray()
      cloneables.forEach(x => expect(xray.cloneable(x)).to.equal(true))
    })

    it('should return false for non-cloneables', () => {
      const xray = new Xray()
      nonCloneables.forEach(x => expect(xray.cloneable(x)).to.equal(false))
    })

    it('should return true for deployables when deployables are allowed', () => {
      const xray = new Xray().allowDeployables()
      deployables.forEach(x => expect(xray.cloneable(x)).to.equal(true))
    })

    it('should return false for deployables when deployables are disallowed', () => {
      const xray = new Xray()
      deployables.forEach(x => expect(xray.cloneable(x)).to.equal(false))
    })

    it('should return false for nondeployables when deployables are allowed', () => {
      const xray = new Xray().allowDeployables()
      nonDeployables.forEach(x => expect(xray.cloneable(x)).to.equal(false))
    })

    it('should return false for nondeployables when deployables are disallowed', () => {
      const xray = new Xray()
      nonDeployables.forEach(x => expect(xray.cloneable(x)).to.equal(false))
    })

    it('should cache repeated calls', () => {

    })
  })
})

// Serializable, and more
// Each scanner
// Tests: Circular
// Duplicates
// Caches
// TODO: if (key.startsWith('$')) throw new Error('$ properties must not be defined')
// Port existing classes over

// ------------------------------------------------------------------------------------------------
