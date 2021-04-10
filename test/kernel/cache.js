/**
 * cache.js
 *
 * Tests for cache functionality
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const LocalCache = require('../../lib/plugins/local-cache')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Cache
// ------------------------------------------------------------------------------------------------

describe('Cache', () => {
  // --------------------------------------------------------------------------
  // jig
  // --------------------------------------------------------------------------

  describe('jig', () => {
    it.skip('caches jigs after replace', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('loads jig from cache', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // berry
  // --------------------------------------------------------------------------

  describe('berry', () => {
    it.skip('cache berry after replay', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('caches berry with circular dependency', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('loads berry from cache', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('does not cache berry if undeployed', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // filter
  // --------------------------------------------------------------------------

  describe('filter', () => {
    it('sets code filter for new code', async () => {
      const run = new Run({ cache: new LocalCache() })
      class A extends Jig { }
      run.deploy(A)
      await run.sync()
      const filter = await run.cache.get('filter://code')
      expect(filter.buckets.some(x => x > 0)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('updates code filter for new code', async () => {
      const run = new Run({ cache: new LocalCache() })
      run.cache = new LocalCache()
      class A extends Jig { }
      run.deploy(A)
      await run.sync()
      const buckets1 = Array.from((await run.cache.get('filter://code')).buckets)
      class B extends Jig { }
      run.deploy(B)
      await run.sync()
      const buckets2 = Array.from((await run.cache.get('filter://code')).buckets)
      expect(buckets1).not.to.deep.equal(buckets2)
    })

    // ------------------------------------------------------------------------

    it('does not update code filter for jigs or berries', async () => {
      const run = new Run({ cache: new LocalCache() })
      class A extends Jig { }
      run.deploy(A)
      await run.sync()
      const buckets1 = Array.from((await run.cache.get('filter://code')).buckets)
      const a = new A()
      await a.sync()
      const buckets2 = Array.from((await run.cache.get('filter://code')).buckets)
      expect(buckets1).to.deep.equal(buckets2)
    })
  })
})

// ------------------------------------------------------------------------------------------------
