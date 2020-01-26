const { describe, it } = require('mocha')
const { expect } = require('chai')
const Xray = require('../../lib/v2/xray')

describe('Xray', () => {
  describe('cloneable', () => {
    it('should return true for cloneables', () => {
      const xray = new Xray.Builder().build()
      expect(xray.cloneable(true)).to.equal(true)
      expect(xray.cloneable(false)).to.equal(true)
      expect(xray.cloneable(0)).to.equal(true)
      expect(xray.cloneable(-1)).to.equal(true)
      expect(xray.cloneable(Number.MAX_SAFE_INTEGER)).to.equal(true)
      expect(xray.cloneable(Number.MIN_SAFE_INTEGER)).to.equal(true)
      expect(xray.cloneable(Number.MAX_VALUE)).to.equal(true)
      expect(xray.cloneable(Number.MIN_VALUE)).to.equal(true)
      expect(xray.cloneable(0.5)).to.equal(true)
      expect(xray.cloneable(NaN)).to.equal(true)
      expect(xray.cloneable(Infinity)).to.equal(true)
      expect(xray.cloneable('')).to.equal(true)
      expect(xray.cloneable('abc')).to.equal(true)
      expect(xray.cloneable('🐉')).to.equal(true)
      expect(xray.cloneable(undefined)).to.equal(true)
      expect(xray.cloneable(null)).to.equal(true)
    })

    it.only('test', () => {
      const xray = new Xray.Builder().build()
      expect(xray.cloneable(Math)).to.equal(false)
    })

    it('should return false for non-cloneables', () => {
      const xray = new Xray.Builder().build()
      expect(xray.cloneable(new Date())).to.equal(false)
      expect(xray.cloneable(new WeakSet())).to.equal(false)
      expect(xray.cloneable(new WeakMap())).to.equal(false)
      expect(xray.cloneable(class {})).to.equal(false)
      expect(xray.cloneable(function f () {})).to.equal(false)
      expect(xray.cloneable(Math)).to.equal(false)
      expect(xray.cloneable(Buffer)).to.equal(false)
      expect(xray.cloneable(Symbol.iterator)).to.equal(false)
      expect(xray.cloneable(Symbol.species)).to.equal(false)
    })

    it('should return true for deployables when allowed', () => {
      const xray = new Xray.Builder().allowDeployables().build()
      expect(xray.cloneable(class {})).to.equal(true)
      expect(xray.cloneable(function f () { })).to.equal(true)
    })

    it('should return false for deployables when allowed', () => {
      const xray = new Xray.Builder().build()
      expect(xray.cloneable(class {})).to.equal(false)
      expect(xray.cloneable(function f () { })).to.equal(false)
    })

    it('should return false for undeployables', () => {

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
