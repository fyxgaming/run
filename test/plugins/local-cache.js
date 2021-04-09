/**
 * local-cache.js
 *
 * Tests for lib/plugins/local-cache.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { LocalCache } = Run.plugins
const unmangle = require('../env/unmangle')
const StateFilter = unmangle(Run)._StateFilter

// ------------------------------------------------------------------------------------------------
// LocalCache
// ------------------------------------------------------------------------------------------------

describe('LocalCache', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('valid maxSizeMB', () => {
      new LocalCache({ maxSizeMB: 0 }) // eslint-disable-line
      new LocalCache({ maxSizeMB: 0.5 }) // eslint-disable-line
      new LocalCache({ maxSizeMB: 1 }) // eslint-disable-line
      new LocalCache({ maxSizeMB: 100 }) // eslint-disable-line
      new LocalCache({ maxSizeMB: Infinity }) // eslint-disable-line
    })

    // ------------------------------------------------------------------------

    it('throws if invalid maxSizeMB', () => {
      expect(() => new LocalCache({ maxSizeMB: NaN })).to.throw('Invalid maxSizeMB')
      expect(() => new LocalCache({ maxSizeMB: -Infinity })).to.throw('Invalid maxSizeMB')
      expect(() => new LocalCache({ maxSizeMB: -1 })).to.throw('Invalid maxSizeMB')
      expect(() => new LocalCache({ maxSizeMB: null })).to.throw('Invalid maxSizeMB')
      expect(() => new LocalCache({ maxSizeMB: '1' })).to.throw('Invalid maxSizeMB')
      expect(() => new LocalCache({ maxSizeMB: () => 10 })).to.throw('Invalid maxSizeMB')
    })

    // ------------------------------------------------------------------------

    it('default maxSizeMB to 10', () => {
      expect(new LocalCache().maxSizeMB).to.equal(10)
    })
  })

  // --------------------------------------------------------------------------
  // maxSizeMB
  // --------------------------------------------------------------------------

  describe('maxSizeMB', () => {
    it('set valid maxSizeMB', () => {
      new LocalCache().maxSizeMB = 0
      new LocalCache().maxSizeMB = 0.5
      new LocalCache().maxSizeMB = 1
      new LocalCache().maxSizeMB = 100
      new LocalCache().maxSizeMB = Infinity
    })

    // ------------------------------------------------------------------------

    it('throws if set invalid maxSizeMB', () => {
      expect(() => { new LocalCache().maxSizeMB = NaN }).to.throw('Invalid maxSizeMB')
      expect(() => { new LocalCache().maxSizeMB = -Infinity }).to.throw('Invalid maxSizeMB')
      expect(() => { new LocalCache().maxSizeMB = -1 }).to.throw('Invalid maxSizeMB')
      expect(() => { new LocalCache().maxSizeMB = null }).to.throw('Invalid maxSizeMB')
      expect(() => { new LocalCache().maxSizeMB = '1' }).to.throw('Invalid maxSizeMB')
      expect(() => { new LocalCache().maxSizeMB = () => 10 }).to.throw('Invalid maxSizeMB')
    })

    // ------------------------------------------------------------------------

    it('reduces size if necessary', async () => {
      const cache = new LocalCache()
      await cache.set('0', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      await cache.set('1', '1')
      cache.maxSizeMB = 10 / 1000 / 1000
      expect(await cache.get('0')).to.equal(undefined)
      expect(await cache.get('1')).to.equal('1')
    })
  })

  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  describe('get', () => {
    it('returns value previously set', async () => {
      const cache = new LocalCache()
      await cache.set('a', 1)
      expect(await cache.get('a')).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('returns undefined if missing', async () => {
      const cache = new LocalCache()
      expect(await cache.get('a')).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('bumps value to the front', async () => {
      const cache = new LocalCache()
      await cache.set('a', 'a')
      await cache.set('b', 'b')
      await cache.get('a')
      cache.maxSizeMB = 10 / 1000 / 1000
      expect(await cache.get('a')).to.equal('a')
      expect(await cache.get('b')).to.equal(undefined)
    })
  })

  // --------------------------------------------------------------------------
  // set
  // --------------------------------------------------------------------------

  describe('set', () => {
    it('sets json values', async () => {
      const cache = new LocalCache()
      await cache.set('number', 1)
      await cache.set('boolean', true)
      await cache.set('string', 'abc')
      await cache.set('object', {})
      await cache.set('null', null)
      await cache.set('array', [1])
    })

    // ------------------------------------------------------------------------

    it('throws for non-json values', async () => {
      const cache = new LocalCache()
      await expect(cache.set('function', x => x)).to.be.rejectedWith('Cannot cache function')
      await expect(cache.set('symbol', Symbol.hasInstance)).to.be.rejectedWith('Cannot cache symbol')
      await expect(cache.set('undefined', undefined)).to.be.rejectedWith('Cannot cache undefined')
      await expect(cache.set('NaN', NaN)).to.be.rejectedWith('Cannot cache number')
      await expect(cache.set('Infinity', Infinity)).to.be.rejectedWith('Cannot cache number')
    })

    // ------------------------------------------------------------------------

    it('throws if set different value', async () => {
      const cache = new LocalCache()
      const error = 'Attempt to set different values for the same key'
      const prefixes = ['jig://', 'berry://', 'tx://']
      for (const prefix of prefixes) {
        const key = prefix + Math.random().toString()
        await cache.set(key, { n: 1 })
        await expect(cache.set(key, 0)).to.be.rejectedWith(error)
        await expect(cache.set(key, 'hello')).to.be.rejectedWith(error)
        await expect(cache.set(key, { n: 2 })).to.be.rejectedWith(error)
        await expect(cache.set(key, { n: 1, m: 2 })).to.be.rejectedWith(error)
        await cache.set(key, { n: 1 })
      }
    })

    // ------------------------------------------------------------------------

    it('bumps entry to the front', async () => {
      const cache = new LocalCache()
      await cache.set('a', 'a')
      await cache.set('b', 'b')
      await cache.set('a', 'a')
      cache.maxSizeMB = 10 / 1000 / 1000
      expect(await cache.get('a')).to.equal('a')
      expect(await cache.get('b')).to.equal(undefined)
    })
  })

  // --------------------------------------------------------------------------
  // clear
  // --------------------------------------------------------------------------

  describe('clear', () => {
    it('removes all entries', async () => {
      const cache = new LocalCache()
      await cache.set('a', 1)
      await cache.clear()
      expect(await cache.get('a')).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('resets cache size', async () => {
      const maxSizeMB = 10 / 1000 / 1000
      const cache = new LocalCache({ maxSizeMB })
      await cache.set('a', 'a')
      cache.clear()
      await cache.set('b', 'b')
      expect(await cache.get('b')).to.equal('b')
    })
  })

  // --------------------------------------------------------------------------
  // filter
  // --------------------------------------------------------------------------

  describe('filter', () => {
    it('updates code filter for code', async () => {
      const cache = new LocalCache()
      await cache.set('jig://123', { kind: 'code' })
      const buckets = Array.from((await cache.get('filter://code')).buckets)
      expect(buckets.some(x => x > 0)).to.equal(true)
      await cache.set('jig://456', { kind: 'code' })
      const buckets2 = Array.from((await cache.get('filter://code')).buckets)
      expect(buckets).not.to.deep.equal(buckets2)
    })

    // ------------------------------------------------------------------------

    it('does not update code filter for jigs or berries', async () => {
      const cache = new LocalCache()
      await cache.set('jig://123', { kind: 'jig' })
      await cache.set('berry://456', { kind: 'berry' })
      expect(await cache.get('filter://code')).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('updates code filter when shrunk', async () => {
      const cache = new LocalCache()
      await cache.set('jig://123', { kind: 'code' })
      const singleCodeSize = cache.sizeBytes / 1000 / 1000
      await cache.set('jig://456', { kind: 'jig' })
      await cache.set('jig://789', { kind: 'code' })
      cache.maxSizeMB = singleCodeSize
      expect(await cache.get('jig://123')).to.equal(undefined)
      expect(await cache.get('jig://456')).to.equal(undefined)
      expect(await cache.get('jig://789')).not.to.equal(undefined)
      const filter = StateFilter.create()
      StateFilter.add(filter, 'jig://789')
      expect((await cache.get('filter://code')).buckets).to.deep.equal(filter.buckets)
    })

    // ------------------------------------------------------------------------

    it('clears code filter', async () => {
      const cache = new LocalCache()
      await cache.set('jig://123', { kind: 'code' })
      expect((await cache.get('filter://code')).buckets.some(x => x > 0)).to.equal(true)
      cache.clear()
      expect(await cache.get('filter://code')).to.equal(undefined)
    })
  })
})

// ------------------------------------------------------------------------------------------------
