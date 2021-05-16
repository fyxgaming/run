/**
 * whatsonchain.js
 *
 * Tests for lib/plugins/whatsonchain.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { WhatsOnChain } = Run.plugins
const { Cache } = Run.api

// ------------------------------------------------------------------------------------------------
// WhatsOnChain
// ------------------------------------------------------------------------------------------------

describe('WhatsOnChain', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('with defaults', () => {
      const connect = new WhatsOnChain()
      expect(connect.network).to.equal('main')
      expect(connect.cache instanceof Cache).to.equal(true)
      expect(connect.api).to.equal('whatsonchain')
    })

    // --------------------------------------------------------------------------------------------

    it('with supported network', () => {
      const mainnet = new WhatsOnChain({ network: 'main' })
      expect(mainnet.network).to.equal('main')
      const testnet = new WhatsOnChain({ network: 'test' })
      expect(testnet.network).to.equal('test')
      const stn = new WhatsOnChain({ network: 'stn' })
      expect(stn.network).to.equal('stn')
    })

    // --------------------------------------------------------------------------------------------

    it('with custom cache', () => {
      class CustomCache {
        async set (key, value) { }
        async get (key) { }
      }
      const cache = new CustomCache()
      const connect = new WhatsOnChain({ cache })
      expect(connect.cache).to.equal(cache)
    })

    // --------------------------------------------------------------------------------------------

    it('with API key', () => {
      expect(new WhatsOnChain({ apiKey: 'abc' }).apiKey).to.equal('abc')
      expect(new WhatsOnChain({ apiKey: '' }).apiKey).to.equal('')
      expect(new WhatsOnChain({ apiKey: undefined }).apiKey).to.equal(undefined)
    })

    // --------------------------------------------------------------------------------------------

    it('throws if invalid API key', () => {
      expect(() => new WhatsOnChain({ apiKey: null })).to.throw('Invalid API key: null')
      expect(() => new WhatsOnChain({ apiKey: 0 })).to.throw('Invalid API key: 0')
      expect(() => new WhatsOnChain({ apiKey: {} })).to.throw('Invalid API key: [object Object')
    })

    // --------------------------------------------------------------------------------------------

    it('throws if unsupported network', () => {
      expect(() => new WhatsOnChain({ network: '' })).to.throw('WhatsOnChain API does not support the "" network')
      expect(() => new WhatsOnChain({ network: 'mock' })).to.throw('WhatsOnChain API does not support the "mock" network')
    })

    // --------------------------------------------------------------------------------------------

    it('throws if invalid network', () => {
      expect(() => new WhatsOnChain({ network: null })).to.throw('Invalid network: null')
      expect(() => new WhatsOnChain({ network: 0 })).to.throw('Invalid network: 0')
    })

    // --------------------------------------------------------------------------------------------

    it('throws if invalid cache', () => {
      expect(() => new WhatsOnChain({ cache: '' })).to.throw('Unsupported cache: ')
      expect(() => new WhatsOnChain({ cache: null })).to.throw('Unsupported cache: null')
      expect(() => new WhatsOnChain({ cache: {} })).to.throw('Unsupported cache: [object Object]')
      expect(() => new WhatsOnChain({ cache: { set: () => { } } })).to.throw('Unsupported cache: [object Object]')
    })
  })
})

// ------------------------------------------------------------------------------------------------
