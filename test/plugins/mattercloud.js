/**
 * mattercloud.js
 *
 * Tests for lib/plugins/mattercloud.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { MatterCloud, WrappedBlockchain } = Run.plugins
const { NotImplementedError } = Run.errors

// ------------------------------------------------------------------------------------------------
// MatterCloud
// ------------------------------------------------------------------------------------------------

describe('MatterCloud', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('is WrappedBlockchain', () => {
      expect(new MatterCloud() instanceof WrappedBlockchain).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('with defaults', () => {
      const connect = new MatterCloud()
      expect(connect.network).to.equal('main')
      expect(connect.api).to.equal('mattercloud')
    })

    // --------------------------------------------------------------------------------------------

    it('with API key', () => {
      expect(new MatterCloud({ apiKey: 'abc' }).apiKey).to.equal('abc')
      expect(new MatterCloud({ apiKey: '' }).apiKey).to.equal('')
      expect(new MatterCloud({ apiKey: undefined }).apiKey).to.equal(undefined)
    })

    // --------------------------------------------------------------------------------------------

    it('throws if invalid API key', () => {
      expect(() => new MatterCloud({ apiKey: null })).to.throw('Invalid API key: null')
      expect(() => new MatterCloud({ apiKey: 0 })).to.throw('Invalid API key: 0')
      expect(() => new MatterCloud({ apiKey: {} })).to.throw('Invalid API key: [object Object')
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
  })

  // --------------------------------------------------------------------------
  // spends
  // --------------------------------------------------------------------------

  describe('spends', () => {
    it('not supported', async () => {
      const txid = '0000000000000000000000000000000000000000000000000000000000000000'
      const blockchain = new MatterCloud({ network: 'main' })
      await expect(blockchain.spends(txid, 0)).to.be.rejectedWith(NotImplementedError)
    })
  })
})

// ------------------------------------------------------------------------------------------------
