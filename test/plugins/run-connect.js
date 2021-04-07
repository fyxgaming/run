/**
 * run-connect.js
 *
 * Tests for lib/plugins/run-connect.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { RunConnect2: RunConnect } = Run.plugins
const { Cache } = Run.api

// ------------------------------------------------------------------------------------------------
// RunConnect
// ------------------------------------------------------------------------------------------------

describe('RunConnect', () => {
  describe('constructor', () => {
    it('creates with defaults', () => {
      const connect = new RunConnect()
      expect(connect.network).to.equal('main')
      expect(connect.cache instanceof Cache).to.equal(true)
      expect(connect.api).to.equal('run')
    })

    // --------------------------------------------------------------------------------------------

    it('create on supported network', () => {
      const mainnetConnect = new RunConnect({ network: 'main' })
      expect(mainnetConnect.network).to.equal('main')
      const testnetConnect = new RunConnect({ network: 'test' })
      expect(testnetConnect.network).to.equal('test')
    })

    // --------------------------------------------------------------------------------------------

    it('throws if create with invalid network', () => {
      expect(() => new RunConnect({ network: '' })).to.throw('Unsupported network: ')
      expect(() => new RunConnect({ network: 'stn' })).to.throw('Unsupported network: stn')
      expect(() => new RunConnect({ network: null })).to.throw('Unsupported network: null')
      expect(() => new RunConnect({ network: 0 })).to.throw('Unsupported network: 0')
    })

    // --------------------------------------------------------------------------------------------

    it('creates with custom cache', () => {
      class CustomCache {
        async set (key, value) { }
        async get (key) { }
      }
      const cache = new CustomCache()
      const connect = new RunConnect({ cache })
      expect(connect.cache).to.equal(cache)
    })

    // --------------------------------------------------------------------------------------------

    it('throws if create with invalid cache', () => {
      expect(() => new RunConnect({ cache: '' })).to.throw('Unsupported cache: ')
      expect(() => new RunConnect({ cache: null })).to.throw('Unsupported cache: null')
      expect(() => new RunConnect({ cache: {} })).to.throw('Unsupported cache: [object Object]')
      expect(() => new RunConnect({ cache: { set: () => { } } })).to.throw('Unsupported cache: [object Object]')
    })
  })
})

// ------------------------------------------------------------------------------------------------
