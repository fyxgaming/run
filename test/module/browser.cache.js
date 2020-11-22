/**
 * browser-cache.js
 *
 * Tests for lib/module/browser-cache.js
 */
/* global VARIANT */

const { describe, it } = require('mocha')
const { expect } = require('chai')
require('chai').use(require('chai-as-promised'))
const unmangle = require('../env/unmangle')
const Run = require('../env/run')
const { BrowserCache } = Run.module

// ------------------------------------------------------------------------------------------------
// BrowserCache
// ------------------------------------------------------------------------------------------------

describe('BrowserCache', () => {
  // --------------------------------------------------------------------------
  // non-browser
  // --------------------------------------------------------------------------

  // Tests when running in node where BrowserCache is not supported
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
    it('opens database', async () => {
      const cache = new BrowserCache()
      expect(await cache.get('abc')).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('throws if upgrade required', async () => {
      const cache1 = new BrowserCache({ name: 'upgrade1', version: 1 })
      const db1 = await (unmangle(cache1)._dbPromise)
      db1.close()
      const cache2 = new BrowserCache({ name: 'upgrade1', version: 2 })
      await expect(cache2.get('abc')).to.be.rejectedWith('Upgrade not supported')
    })

    // ------------------------------------------------------------------------

    it('throws if different versions open', async () => {
      const cache1 = new BrowserCache({ name: 'upgrade2', version: 1 }) // eslint-disable-line
      const cache2 = new BrowserCache({ name: 'upgrade2', version: 2 })
      await expect(cache2.get('abc')).to.be.rejectedWith('Upgrade not supported')
    })

    // ------------------------------------------------------------------------

    it('opens twice', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
