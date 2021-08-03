/**
 * run-connect.js
 *
 * Tests for lib/plugins/run-connect.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
require('chai').use(require('chai-as-promised'))
const { stub } = require('sinon')
const Run = require('../env/run')
const { NETWORK } = require('../env/config')
const { RunConnect } = Run.plugins
const { Cache } = Run.api

// ------------------------------------------------------------------------------------------------
// RunConnect
// ------------------------------------------------------------------------------------------------

describe('RunConnect', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

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

    it('throws if unsupported network', () => {
      expect(() => new RunConnect({ network: '' })).to.throw('RunConnect API does not support the "" network')
      expect(() => new RunConnect({ network: 'stn' })).to.throw('RunConnect API does not support the "stn" network')
    })

    // --------------------------------------------------------------------------------------------

    it('throws if invalid network', () => {
      expect(() => new RunConnect({ network: null })).to.throw('Invalid network: null')
      expect(() => new RunConnect({ network: 0 })).to.throw('Invalid network: 0')
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

  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  describe('get', () => {
    if (NETWORK !== 'main') return

    it('gets all states and transactions', async () => {
      const connect = new RunConnect()
      const state = await connect.get('jig://bf5506e4d752cb2a2fa1d4140368e5c226004567fcd8f8cccc25f13de49b3b92_o2')
      expect(typeof state).to.equal('object')
      const expectedKeys = [
        'jig://bf5506e4d752cb2a2fa1d4140368e5c226004567fcd8f8cccc25f13de49b3b92_o2',
        'jig://369c892dcbc19e69f5c73d8055c99b98c1a56da4086c666497c2136b8b5c2253_o1',
        'jig://72a61eb990ffdb6b38e5f955e194fed5ff6b014f75ac6823539ce5613aea0be8_o1',
        'tx://72a61eb990ffdb6b38e5f955e194fed5ff6b014f75ac6823539ce5613aea0be8',
        'jig://d6170025a62248d8df6dc14e3806e68b8df3d804c800c7bfb23b0b4232862505_o1',
        'jig://81bcef29b0e4ed745f3422c0b764a33c76d0368af2d2e7dd139db8e00ee3d8a6_o1',
        'tx://81bcef29b0e4ed745f3422c0b764a33c76d0368af2d2e7dd139db8e00ee3d8a6',
        'jig://727e7b423b7ee40c0b5be87fba7fa5673ea2d20a74259040a7295d9c32a90011_o1',
        'tx://727e7b423b7ee40c0b5be87fba7fa5673ea2d20a74259040a7295d9c32a90011',
        'jig://49145693676af7567ebe20671c5cb01369ac788c20f3b1c804f624a1eda18f3f_o1',
        'tx://49145693676af7567ebe20671c5cb01369ac788c20f3b1c804f624a1eda18f3f',
        'jig://3b7ef411185bbe3d01caeadbe6f115b0103a546c4ef0ac7474aa6fbb71aff208_o1',
        'tx://3b7ef411185bbe3d01caeadbe6f115b0103a546c4ef0ac7474aa6fbb71aff208',
        'tx://d6170025a62248d8df6dc14e3806e68b8df3d804c800c7bfb23b0b4232862505',
        'berry://5332c013476cd2a2c18710a01188695bc27a5ef1748a51d4a5910feb1111dab4_o1?berry=2a5b8bd98125efb65e1b1ff7537fb6aaa3e5af5e2149e18cb4630f8ea7682d90&version=5',
        'jig://5332c013476cd2a2c18710a01188695bc27a5ef1748a51d4a5910feb1111dab4_o1',
        'jig://312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490_o1',
        'jig://312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490_o2',
        'tx://312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490',
        'tx://5332c013476cd2a2c18710a01188695bc27a5ef1748a51d4a5910feb1111dab4',
        'tx://369c892dcbc19e69f5c73d8055c99b98c1a56da4086c666497c2136b8b5c2253',
        'tx://bf5506e4d752cb2a2fa1d4140368e5c226004567fcd8f8cccc25f13de49b3b92'
      ]
      for (const key of expectedKeys) {
        const data = await connect.cache.get(key)
        expect(typeof data).not.to.equal('undefined')
      }
    })

    // ------------------------------------------------------------------------

    it('gets transaction data if state is missing', async () => {
      const berryTxid = '2a5b8bd98125efb65e1b1ff7537fb6aaa3e5af5e2149e18cb4630f8ea7682d90'
      const connect = new RunConnect()
      const state = await connect.get(`jig://${berryTxid}_o1`)
      expect(typeof state).to.equal('undefined')
      const rawtx = await connect.cache.get(`tx://${berryTxid}`)
      expect(typeof rawtx).to.equal('string')
    })

    // ------------------------------------------------------------------------

    it('returns error if connection down', async () => {
      const connect = new RunConnect()
      stub(connect, 'request').throws(new Error('Bad request'))
      const key = 'jig://3b7ef411185bbe3d01caeadbe6f115b0103a546c4ef0ac7474aa6fbb71aff208_o1'
      await expect(connect.get(key)).to.be.rejectedWith('Bad request')
    })
  })

  // --------------------------------------------------------------------------
  // set
  // --------------------------------------------------------------------------

  describe('set', () => {
    it('sets on local cache', async () => {
      const connect = new RunConnect()
      await connect.set('abc', 123)
      expect(await connect.cache.get('abc')).to.equal(123)
    })
  })
})

// ------------------------------------------------------------------------------------------------
