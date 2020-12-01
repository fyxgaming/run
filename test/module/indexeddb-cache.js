/**
 * indexeddb-cache.js
 *
 * Tests for lib/module/indexeddb-cache.js
 */
/* global VARIANT */

const { describe, it } = require('mocha')
const { expect } = require('chai')
require('chai').use(require('chai-as-promised'))
const unmangle = require('../env/unmangle')
const Run = require('../env/run')
const { IndexedDbCache } = Run.module

// ------------------------------------------------------------------------------------------------
// IndexedDbCache
// ------------------------------------------------------------------------------------------------

describe('IndexedDbCache', () => {
  // --------------------------------------------------------------------------
  // non-browser
  // --------------------------------------------------------------------------

  // Tests when running in node where IndexedDbCache is not supported
  if (typeof VARIANT === 'undefined' || VARIANT !== 'browser') {
    describe('non-browser', () => {
      it('throws if not a browser', () => {
        expect(() => new IndexedDbCache()).to.throw('Your browser doesn\'t support IndexedDB')
      })
    })

    return // Don't run any other tests
  }

  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('opens database', async () => {
      const cache = new IndexedDbCache()
      expect(await cache.get('abc')).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('throws if upgrade required', async () => {
      const name = Math.random().toString()
      const cache1 = new IndexedDbCache({ name, version: 1 })
      const db1 = await (unmangle(cache1)._dbPromise)
      db1.close()
      const cache2 = new IndexedDbCache({ name, version: 2 })
      await expect(cache2.get('abc')).to.be.rejectedWith('Upgrade not supported')
    })

    // ------------------------------------------------------------------------

    it('throws if different versions open', async () => {
      const name = Math.random().toString()
      const cache1 = new IndexedDbCache({ name, version: 1 }) // eslint-disable-line
      const cache2 = new IndexedDbCache({ name, version: 2 })
      await expect(cache2.get('abc')).to.be.rejectedWith('Upgrade not supported')
    })

    // ------------------------------------------------------------------------

    it('opens twice', async () => {
      const cache1 = new IndexedDbCache()
      const cache2 = new IndexedDbCache()
      expect(await cache1.get('abc')).to.equal(undefined)
      expect(await cache2.get('abc')).to.equal(undefined)
    })
  })

  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  describe('get', () => {
    it('returns cached value if it exists', async () => {
      const cache = new IndexedDbCache()
      await cache.set('get1', { def: 1 })
      expect(await cache.get('get1')).to.deep.equal({ def: 1 })
    })

    // ------------------------------------------------------------------------

    it('returns undefined if it does not exist', async () => {
      const cache = new IndexedDbCache()
      expect(await cache.get('get2')).to.equal(undefined)
    })
  })

  // --------------------------------------------------------------------------
  // set
  // --------------------------------------------------------------------------

  describe('set', () => {
    it('sets json', async () => {
      const cache = new IndexedDbCache()
      const json = { s: '', n: 0, b: true, obj: {}, arr: [1, 2, 3] }
      await cache.set('set1', json)
      expect(await cache.get('set1')).to.deep.equal(json)
    })
  })
})

// ------------------------------------------------------------------------------------------------
