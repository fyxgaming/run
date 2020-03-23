/**
 * blockchain-server.js
 *
 * Tests for lib/module/blockchain-server.js
 */

const { PrivateKey, Script, Transaction } = require('bsv')
const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const { expect } = chai
chai.use(chaiAsPromised)
const { Run } = require('../config')
const { BlockchainApi } = Run.module

// ------------------------------------------------------------------------------------------------
// BlockchainApi tests
// ------------------------------------------------------------------------------------------------

describe('BlockchainApi', () => {
  describe('constructor', () => {
    describe('network', () => {
      it('should default network to main', () => {
        expect(new BlockchainApi().network).to.equal('main')
      })

      it('should throw for bad network', () => {
        expect(() => new BlockchainApi({ network: 'bad' })).to.throw('Unsupported network: bad')
        expect(() => new BlockchainApi({ network: 0 })).to.throw('Unsupported network: 0')
        expect(() => new BlockchainApi({ network: {} })).to.throw('Unsupported network: [object Object]')
        expect(() => new BlockchainApi({ network: null })).to.throw('Unsupported network: null')
      })
    })

    describe('logger', () => {
      it('should support null loggers', () => {
        expect(new BlockchainApi({ logger: null }).logger).to.equal(null)
      })

      it('should throw for bad logger', () => {
        expect(() => new BlockchainApi({ logger: 'bad' })).to.throw('Invalid logger: bad')
        expect(() => new BlockchainApi({ logger: false })).to.throw('Invalid logger: false')
      })
    })

    describe('api', () => {
      it('should default to run api', () => {
        expect(new BlockchainApi().api.constructor.name).to.equal('run')
      })

      it('should throw for bad api', () => {
        expect(() => new BlockchainApi({ api: 'bad' })).to.throw('Unknown blockchain API: bad')
        expect(() => new BlockchainApi({ api: null })).to.throw('Invalid blockchain API: null')
        expect(() => new BlockchainApi({ api: 123 })).to.throw('Invalid blockchain API: 123')
      })
    })

    describe('lastBlockchain', () => {
      it('should support passing different last blockchain', () => {
        const lastBlockchain = { cache: {} }
        expect(new BlockchainApi({ lastBlockchain }).cache).not.to.equal(lastBlockchain.cache)
      })

      it('should only copy cache if same network', async () => {
        const testnet1 = new BlockchainApi({ network: 'test' })
        // Fill the cache with one transaction
        await testnet1.fetch('d89f6bfb9f4373212ed18b9da5f45426d50a4676a4a684c002a4e838618cf3ee')
        const testnet2 = new BlockchainApi({ network: 'test', lastBlockchain: testnet1 })
        const mainnet = new BlockchainApi({ network: 'main', lastBlockchain: testnet2 })
        expect(testnet2.cache).to.deep.equal(testnet1.cache)
        expect(mainnet.cache).not.to.equal(testnet2.cache)
      })
    })

    describe('timeout', () => {
      it('should support custom timeouts', () => {
        expect(new BlockchainApi({ timeout: 3333 }).api.axios.defaults.timeout).to.equal(3333)
      })

      it('should default timeout to 10000', () => {
        expect(new BlockchainApi().api.axios.defaults.timeout).to.equal(10000)
      })

      it('should throw for bad timeout', () => {
        expect(() => new BlockchainApi({ timeout: 'bad' })).to.throw('Invalid timeout: bad')
        expect(() => new BlockchainApi({ timeout: null })).to.throw('Invalid timeout: null')
        expect(() => new BlockchainApi({ timeout: -1 })).to.throw('Invalid timeout: -1')
        expect(() => new BlockchainApi({ timeout: NaN })).to.throw('Invalid timeout: NaN')
      })
    })
  })

  describe('utxos', () => {
    it('should correct for server returning duplicates', async () => {
      const address = new PrivateKey('mainnet').toAddress().toString()
      const txid = '0000000000000000000000000000000000000000000000000000000000000000'
      class MockApi {
        utxos (script) {
          const utxo = { txid, vout: 0, satoshis: 0, script: new Script() }
          return [utxo, utxo]
        }
      }
      const api = new MockApi()
      function warn (warning) { this.lastWarning = warning }
      const logger = { warn, info: () => {} }
      const blockchain = new BlockchainApi({ network: 'main', api, logger })
      const utxos = await blockchain.utxos(address)
      expect(utxos.length).to.equal(1)
      expect(logger.lastWarning).to.equal(`Duplicate utxo returned from server: ${txid}_o0`)
    })

    it('should throw if API is down', async () => {
      const api = {}
      api.utxosUrl = (network, address) => 'bad-url'
      const blockchain = new BlockchainApi({ network: 'main', api })
      const address = new PrivateKey('mainnet').toAddress().toString()
      const requests = [blockchain.utxos(address), blockchain.utxos(address)]
      await expect(Promise.all(requests)).to.be.rejected
    })
  })
})

// ------------------------------------------------------------------------------------------------
// BlockchainApiCache tests
// ------------------------------------------------------------------------------------------------

describe('BlockchainApiCache', () => {
  describe('get', () => {
    it('should not return expired transactions', async () => {
      const cache = new BlockchainApi.Cache()
      cache.expiration = 1
      const tx = new Transaction()
      cache.fetched(tx)
      const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }
      await sleep(10)
      expect(cache.get(tx.hash)).not.to.equal(tx)
    })
  })

  describe('fetched', () => {
    it('should flush oldest transcation when full', () => {
      const cache = new BlockchainApi.Cache({ size: 1 })
      cache.size = 1
      const tx1 = new Transaction().addData('1')
      const tx2 = new Transaction().addData('2')
      cache.fetched(tx1)
      cache.fetched(tx2)
      expect(cache.transactions.size).to.equal(1)
      expect(cache.transactions.get(tx2.hash)).to.equal(tx2)
    })
  })
})

// ------------------------------------------------------------------------------------------------
