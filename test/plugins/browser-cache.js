/**
 * browser-cache.js
 *
 * Tests for lib/plugins/browser-cache.js
 */
/* global VARIANT */

const { describe, it } = require('mocha')
const { expect } = require('chai')
// const { stub } = require('sinon')
const Run = require('../env/run')
const { BrowserCache } = Run.plugins

// ------------------------------------------------------------------------------------------------
// BrowserCache
// ------------------------------------------------------------------------------------------------

describe('BrowserCache', () => {
  // --------------------------------------------------------------------------
  // non-browser
  // --------------------------------------------------------------------------

  // Tests when running in node where IndexedDbCache is not supported
  if (typeof VARIANT === 'undefined' || VARIANT !== 'browser') {
    describe('non-browser', () => {
      it('throws if not a browser', () => {
        expect(() => new BrowserCache()).to.throw('Your browser doesn\'t support IndexedDB')
      })
    })

    // Don't run any other tests
  }

  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  /*
  describe('constructor', () => {
    it('creates with caches', () => {
      const cache1 = new LocalCache()
      const cache2 = { set: async () => { }, get: async () => { } }
      new MultiLevelCache(cache1, cache2) // eslint-disable-line
    })

    // ------------------------------------------------------------------------

    it('throws if non-cache', () => {
      expect(() => new MultiLevelCache({})).to.throw('Invalid cache')
    })

    // ------------------------------------------------------------------------

    it('throws if no cache', () => {
      expect(() => new MultiLevelCache()).to.throw('No caches')
    })
  })

  // --------------------------------------------------------------------------
  // set
  // --------------------------------------------------------------------------

  describe('set', () => {
    it('sets in all caches', async () => {
      const cache1 = stub({ set: async () => { }, get: async () => { } })
      const cache2 = stub({ set: async () => { }, get: async () => { } })
      const cache = new MultiLevelCache(cache1, cache2)
      await cache.set('abc', 123)
      expect(cache1.set.calledWith('abc', 123)).to.equal(true)
      expect(cache2.set.calledWith('abc', 123)).to.equal(true)
    })
  })

  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  describe('get', () => {
    it('gets from first cache that returns non-undefined', async () => {
      const cache1 = stub({ set: async () => { }, get: async () => { } })
      const cache2 = { set: async () => { }, get: async () => 123 }
      const cache3 = stub({ set: async () => { }, get: async () => { } })
      const cache = new MultiLevelCache(cache1, cache2, cache3)
      expect(await cache.get('abc')).to.equal(123)
      expect(cache1.get.calledWith('abc')).to.equal(true)
      expect(cache3.get.called).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns undefined if no cache has value', async () => {
      const cache1 = stub({ set: async () => { }, get: async () => { } })
      const cache2 = stub({ set: async () => { }, get: async () => { } })
      const cache = new MultiLevelCache(cache1, cache2)
      expect(await cache.get('abc')).to.equal(undefined)
    })
  })
  */
})

// ------------------------------------------------------------------------------------------------
