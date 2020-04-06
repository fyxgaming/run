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
const { unmangle } = require('../env/unmangle')
const { Run } = require('../config')
const { BlockchainApi } = Run

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

    describe('api', () => {
      it('should default to run api', () => {
        expect(new BlockchainApi().remoteBlockchain.constructor).to.equal(BlockchainApi.RunConnect)
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
        const tx = new Transaction().addData('123').lock()
        class MockApi { async fetch (txid) { return tx } }
        const api = new MockApi()
        const testnet1 = new BlockchainApi({ api, network: 'test' })
        // Fill the cache with one transaction
        await testnet1.fetch(tx.hash)
        const testnet2 = new BlockchainApi({ network: 'test', api, lastBlockchain: testnet1 })
        const mainnet = new BlockchainApi({ network: 'main', api, lastBlockchain: testnet2 })
        expect(testnet2.cache).to.deep.equal(testnet1.cache)
        expect(mainnet.cache).not.to.equal(testnet2.cache)
      })
    })

    describe('timeout', () => {
      it('should time out', async () => {
        const timeout = 1
        const { RunConnect } = Run.BlockchainApi
        const api = new RunConnect({ timeout })
        const blockchain = new BlockchainApi({ api })
        expect(blockchain.remoteBlockchain.timeout).to.equal(timeout)
        const oldFetchWithTimeout = RunConnect.prototype.fetchWithTimeout
        RunConnect.prototype.fetchWithTimeout = function (url, options) {
          url = 'http://www.google.com:81'
          return oldFetchWithTimeout.call(this, url, options)
        }
        try {
          await expect(blockchain.fetch('')).to.be.rejectedWith('Request timed out')
        } finally {
          RunConnect.prototype.fetchWithTimeout = oldFetchWithTimeout
        }
      })

      it('should default timeout to 10000', () => {
        expect(new BlockchainApi().remoteBlockchain.timeout).to.equal(10000)
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
      const script = Script.fromAddress(address)
      const txid = '0000000000000000000000000000000000000000000000000000000000000000'
      class MockApi {
        utxos (script) {
          const utxo = { txid, vout: 0, satoshis: 0, script: new Script() }
          return [utxo, utxo]
        }
      }
      const api = new MockApi()
      let lastWarning = null
      const Log = unmangle(unmangle(Run)._util.Log)
      Log._logger = { warn: (time, tag, ...warning) => { lastWarning = warning.join(' ') } }
      const blockchain = new BlockchainApi({ network: 'main', api })
      const utxos = await blockchain.utxos(script)
      expect(utxos.length).to.equal(1)
      expect(lastWarning).to.equal(`Duplicate utxo returned from server: ${txid}_o0`)
      Log._logger = Log._defaultLogger
    })

    it('should throw if API is down', async () => {
      const api = {}
      api.utxosUrl = (network, script) => 'bad-url'
      const blockchain = new BlockchainApi({ network: 'main', api })
      const address = new PrivateKey('mainnet').toAddress().toString()
      const script = Script.fromAddress(address)
      const requests = [blockchain.utxos(script), blockchain.utxos(script)]
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
      const cache = unmangle(new BlockchainApi.Cache())
      cache._expiration = 1
      const tx = new Transaction()
      cache._fetched(tx)
      const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }
      await sleep(10)
      expect(cache._get(tx.hash)).not.to.equal(tx)
    })
  })

  describe('fetched', () => {
    it('should flush oldest transcation when full', () => {
      const cache = unmangle(new BlockchainApi.Cache({ size: 1 }))
      cache._size = 1
      const tx1 = new Transaction().addData('1')
      const tx2 = new Transaction().addData('2')
      cache._fetched(tx1)
      cache._fetched(tx2)
      expect(cache._transactions.size).to.equal(1)
      expect(cache._transactions.get(tx2.hash)).to.equal(tx2)
    })
  })
})

// ------------------------------------------------------------------------------------------------
