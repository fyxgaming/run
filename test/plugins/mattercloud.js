/**
 * mattercloud.js
 *
 * Tests for lib/plugins/mattercloud.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { MatterCloud } = Run.plugins
const { Cache } = Run.api

// ------------------------------------------------------------------------------------------------
// MatterCloud
// ------------------------------------------------------------------------------------------------

describe('MatterCloud', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('creates with defaults', () => {
      const connect = new MatterCloud()
      expect(connect.network).to.equal('main')
      expect(connect.cache instanceof Cache).to.equal(true)
      expect(connect.api).to.equal('mattercloud')
    })

    // --------------------------------------------------------------------------------------------

    it('throws if unsupported network', () => {
      expect(() => new MatterCloud({ network: '' })).to.throw('MatterCloud API does not support the "" network')
      expect(() => new MatterCloud({ network: 'test' })).to.throw('MatterCloud API does not support the "test" network')
      expect(() => new MatterCloud({ network: 'stn' })).to.throw('MatterCloud API does not support the "stn" network')
    })

    // --------------------------------------------------------------------------------------------

    it('throws if invalid network', () => {
      expect(() => new MatterCloud({ network: null })).to.throw('Invalid network: null')
      expect(() => new MatterCloud({ network: 0 })).to.throw('Invalid network: 0')
    })

    // --------------------------------------------------------------------------------------------

    it('creates with custom cache', () => {
      class CustomCache {
        async set (key, value) { }
        async get (key) { }
      }
      const cache = new CustomCache()
      const connect = new MatterCloud({ cache })
      expect(connect.cache).to.equal(cache)
    })

    // --------------------------------------------------------------------------------------------

    it('throws if create with invalid cache', () => {
      expect(() => new MatterCloud({ cache: '' })).to.throw('Unsupported cache: ')
      expect(() => new MatterCloud({ cache: null })).to.throw('Unsupported cache: null')
      expect(() => new MatterCloud({ cache: {} })).to.throw('Unsupported cache: [object Object]')
      expect(() => new MatterCloud({ cache: { set: () => { } } })).to.throw('Unsupported cache: [object Object]')
    })
  })
})

// ------------------------------------------------------------------------------------------------
