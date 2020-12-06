/**
 * browser-cache.js
 *
 * Tests for lib/plugins/browser-cache.js
 */
/* global VARIANT */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { spy } = require('sinon')
const unmangle = require('../env/unmangle')
const Run = require('../env/run')
const { BrowserCache, LocalCache, IndexedDbCache } = Run.plugins

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

    return // Don't run any other tests
  }

  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('creates internal caches', () => {
      const cache = new BrowserCache()
      expect(unmangle(cache)._localCache instanceof LocalCache).to.equal(true)
      expect(unmangle(cache)._indexedDbCache instanceof IndexedDbCache).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('supports maxMemorySizeMB option', () => {
      const browserCache = new BrowserCache({ maxMemorySizeMB: 123 })
      const localCache = unmangle(browserCache)._localCache
      expect(localCache.maxSizeMB).to.equal(123)
      browserCache.maxMemorySizeMB = 456
      expect(browserCache.maxMemorySizeMB).to.equal(456)
      expect(localCache.maxSizeMB).to.equal(456)
    })

    // ------------------------------------------------------------------------

    it('supports indexeddb cache options', () => {
      const cache = new BrowserCache({ dbName: 'abc', dbVersion: 456, dbStore: 'def' })
      expect(unmangle(unmangle(cache)._indexedDbCache)._name).to.equal('abc')
      expect(unmangle(unmangle(cache)._indexedDbCache)._version).to.equal(456)
      expect(unmangle(unmangle(cache)._indexedDbCache)._store).to.equal('def')
    })
  })

  // --------------------------------------------------------------------------
  // set
  // --------------------------------------------------------------------------

  describe('set', () => {
    it('sets in both caches', async () => {
      const cache = new BrowserCache()
      spy(unmangle(cache)._localCache)
      spy(unmangle(cache)._indexedDbCache)
      await cache.set('abc', 123)
      expect(unmangle(cache)._localCache.set.calledWith('abc', 123)).to.equal(true)
      expect(unmangle(cache)._indexedDbCache.set.calledWith('abc', 123)).to.equal(true)
    })
  })

  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  describe('get', () => {
    it('gets from local cache if exists', async () => {
      const cache = new BrowserCache()
      spy(unmangle(cache)._localCache)
      spy(unmangle(cache)._indexedDbCache)
      await cache.set('abc', 123)
      expect(await cache.get('abc')).to.equal(123)
      expect(unmangle(cache)._localCache.get.calledWith('abc')).to.equal(true)
      expect(unmangle(cache)._indexedDbCache.get.called).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('gets from indexed cache if not in memory', async () => {
      const cache = new BrowserCache()
      spy(unmangle(cache)._localCache)
      spy(unmangle(cache)._indexedDbCache)
      await unmangle(cache)._indexedDbCache.set('def', 123)
      expect(await cache.get('def')).to.equal(123)
      expect(unmangle(cache)._localCache.get.called).to.equal(true)
      expect(unmangle(cache)._indexedDbCache.get.called).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns undefined if no cache has value', async () => {
      const cache = new BrowserCache()
      spy(unmangle(cache)._localCache)
      spy(unmangle(cache)._indexedDbCache)
      expect(await cache.get('ghi')).to.equal(undefined)
      expect(unmangle(cache)._localCache.get.called).to.equal(true)
      expect(unmangle(cache)._indexedDbCache.get.called).to.equal(true)
    })
  })
})

// ------------------------------------------------------------------------------------------------
