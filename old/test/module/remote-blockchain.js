/**
 * blockchain-server.js
 *
 * Tests for lib/module/blockchain-server.js
 */

const { PrivateKey, Script } = require('bsv')
const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const { RemoteBlockchain, BlockchainServer } = Run
const { RequestError } = Run.errors

// ------------------------------------------------------------------------------------------------
// RemoteBlockchain tests
// ------------------------------------------------------------------------------------------------

describe('RemoteBlockchain', () => {
  describe('constructor', () => {
    describe('network', () => {
      it('should default network to main', () => {
        expect(RemoteBlockchain.create().network).to.equal('main')
      })

      it('should throw for bad network', () => {
        expect(() => RemoteBlockchain.create({ network: 'bad' })).to.throw('Unsupported network: bad')
        expect(() => RemoteBlockchain.create({ network: 0 })).to.throw('Unsupported network: 0')
        expect(() => RemoteBlockchain.create({ network: {} })).to.throw('Unsupported network: [object Object]')
        expect(() => RemoteBlockchain.create({ network: null })).to.throw('Unsupported network: null')
      })
    })

    describe('api', () => {
      it('should default to run api', () => {
        expect(RemoteBlockchain.create() instanceof BlockchainServer).to.equal(true)
      })

      it('should throw for bad api', () => {
        expect(() => RemoteBlockchain.create({ api: 'bad' })).to.throw('Invalid blockchain API: bad')
        expect(() => RemoteBlockchain.create({ api: null })).to.throw('Invalid blockchain API: null')
        expect(() => RemoteBlockchain.create({ api: 123 })).to.throw('Invalid blockchain API: 123')
      })
    })

    describe('lastBlockchain', () => {
      it('should support passing different last blockchain', () => {
        const lastBlockchain = { cache: {} }
        expect(RemoteBlockchain.create({ lastBlockchain }).cache).not.to.equal(lastBlockchain.cache)
      })

      it('should only copy cache if same network', async () => {
        const testnet1 = RemoteBlockchain.create({ network: 'test' })
        // Fill the cache with one transaction
        await testnet1.fetch('78db863a75faf35190b3524842abeaa835ed5a5a025df62f275fab63881791bb')
        const testnet2 = RemoteBlockchain.create({ network: 'test', lastBlockchain: testnet1 })
        const mainnet = RemoteBlockchain.create({ network: 'main', lastBlockchain: testnet2 })
        expect(testnet2.cache).to.deep.equal(testnet1.cache)
        expect(mainnet.cache).not.to.equal(testnet2.cache)
      })
    })

    describe('timeout', () => {
      it('should time out', async () => {
        const blockchain = RemoteBlockchain.create({ timeout: 1 })
        expect(blockchain.timeout).to.equal(1)
        await expect(blockchain.fetch('31b982157ccd5d1a64bfd7c1415b5ed44fb38e153bdc6742c2261a147aeeb744')).to.be.rejectedWith('Request timed out')
      })

      it('should default timeout to 10000', () => {
        expect(RemoteBlockchain.create().timeout).to.equal(10000)
      })

      it('should throw for bad timeout', () => {
        expect(() => RemoteBlockchain.create({ timeout: 'bad' })).to.throw('Invalid timeout: bad')
        expect(() => RemoteBlockchain.create({ timeout: null })).to.throw('Invalid timeout: null')
        expect(() => RemoteBlockchain.create({ timeout: -1 })).to.throw('Invalid timeout: -1')
        expect(() => RemoteBlockchain.create({ timeout: NaN })).to.throw('Invalid timeout: NaN')
      })
    })
  })

  describe('fetch', () => {
    it('should throw RequestError', async () => {
      const blockchain = RemoteBlockchain.create({ network: 'main' })
      const txid = '0000000000000000000000000000000000000000000000000000000000000000'
      await expect(blockchain.fetch(txid)).to.be.rejectedWith(RequestError)
    })
  })

  describe('utxos', () => {
    // SAVE AND RESTORE LOGGER
    it.skip('should correct for server returning duplicates', async () => {
      const address = new PrivateKey('mainnet').toAddress().toString()
      const script = Script.fromAddress(address)
      const txid = '0000000000000000000000000000000000000000000000000000000000000000'
      const blockchain = RemoteBlockchain.create()
      unmangle(blockchain)._getUtxos = async () => {
        const utxo = { txid, vout: 0, satoshis: 0, script: '' }
        return [utxo, utxo]
      }
      let lastWarning = null
      const Log = unmangle(unmangle(Run)._Log)
      Log._logger = { warn: (time, tag, ...warning) => { lastWarning = warning.join(' ') } }
      const utxos = await blockchain.utxos(script)
      expect(utxos.length).to.equal(1)
      expect(lastWarning).to.equal(`Duplicate utxo returned from server: ${txid}_o0`)
      Log._logger = Log._defaultLogger
    })
  })
})

// ------------------------------------------------------------------------------------------------
