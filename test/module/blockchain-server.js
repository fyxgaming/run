/**
 * blockchain-server.js
 *
 * Tests for lib/module/blockchain-server.js
 */

const { PrivateKey, Script } = require('bsv')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../config')
const { BlockchainServer } = Run.module

// ------------------------------------------------------------------------------------------------
// BlockchainServer tests
// ------------------------------------------------------------------------------------------------

describe('BlockchainServer', () => {
  describe('constructor', () => {
    describe('network', () => {
      it('should default network to main', () => {
        expect(new BlockchainServer().network).to.equal('main')
      })

      it('should throw for bad network', () => {
        expect(() => new BlockchainServer({ network: 'bad' })).to.throw('Unsupported network: bad')
        expect(() => new BlockchainServer({ network: 0 })).to.throw('Unsupported network: 0')
        expect(() => new BlockchainServer({ network: {} })).to.throw('Unsupported network: [object Object]')
        expect(() => new BlockchainServer({ network: null })).to.throw('Unsupported network: null')
      })
    })

    describe('logger', () => {
      it('should support null loggers', () => {
        expect(new BlockchainServer({ logger: null }).logger).to.equal(null)
      })

      it('should throw for bad logger', () => {
        expect(() => new BlockchainServer({ logger: 'bad' })).to.throw('Invalid logger: bad')
        expect(() => new BlockchainServer({ logger: false })).to.throw('Invalid logger: false')
      })
    })

    describe('api', () => {
      it('should default to run api', () => {
        expect(new BlockchainServer().api.name).to.equal('run')
      })

      it('should throw for bad api', () => {
        expect(() => new BlockchainServer({ api: 'bad' })).to.throw('Unknown blockchain API: bad')
        expect(() => new BlockchainServer({ api: null })).to.throw('Invalid blockchain API: null')
        expect(() => new BlockchainServer({ api: 123 })).to.throw('Invalid blockchain API: 123')
      })
    })

    describe('lastBlockchain', () => {
      it('should support passing different last blockchain', () => {
        const lastBlockchain = { cache: {} }
        expect(new BlockchainServer({ lastBlockchain }).cache).not.to.equal(lastBlockchain.cache)
      })

      it('should only copy cache if same network', async () => {
        const testnet1 = new BlockchainServer({ network: 'test' })
        // Fill the cache with one transaction
        await testnet1.fetch('d89f6bfb9f4373212ed18b9da5f45426d50a4676a4a684c002a4e838618cf3ee')
        const testnet2 = new BlockchainServer({ network: 'test', lastBlockchain: testnet1 })
        const mainnet = new BlockchainServer({ network: 'main', lastBlockchain: testnet2 })
        expect(testnet2.cache).to.deep.equal(testnet1.cache)
        expect(mainnet.cache).not.to.equal(testnet2.cache)
      })
    })

    describe('timeout', () => {
      it('should support custom timeouts', () => {
        expect(new BlockchainServer({ timeout: 3333 }).axios.defaults.timeout).to.equal(3333)
      })

      it('should default timeout to 10000', () => {
        expect(new BlockchainServer().axios.defaults.timeout).to.equal(10000)
      })

      it('should throw for bad timeout', () => {
        expect(() => new BlockchainServer({ timeout: 'bad' })).to.throw('Invalid timeout: bad')
        expect(() => new BlockchainServer({ timeout: null })).to.throw('Invalid timeout: null')
        expect(() => new BlockchainServer({ timeout: -1 })).to.throw('Invalid timeout: -1')
        expect(() => new BlockchainServer({ timeout: NaN })).to.throw('Invalid timeout: NaN')
      })
    })
  })

  describe('utxos', () => {
    it('should correct for server returning duplicates', async () => {
      const address = PrivateKey('mainnet').toAddress().toString()
      const txid = '0000000000000000000000000000000000000000000000000000000000000000'
      const api = {}
      api.utxosUrl = (network, address) => 'https://api.run.network/v1/main/status'
      api.utxosResp = (data, address) => {
        const utxo = { txid, vout: 0, satoshis: 0, script: new Script() }
        return [utxo, utxo]
      }
      function warn (warning) { this.lastWarning = warning }
      const logger = { warn, info: () => {} }
      const blockchain = new BlockchainServer({ network: 'main', api, logger })
      const utxos = await blockchain.utxos(address)
      expect(utxos.length).to.equal(1)
      expect(logger.lastWarning).to.equal(`Duplicate utxo returned from server: ${txid}_o0`)
    }).timeout(30000)

    /*
    it('should throw if API is down', async () => {
      const api = unobfuscate({ })
      api.utxosUrl = (network, address) => 'bad-url'
      const blockchain = new BlockchainServer({ network: 'main', api })
      const address = bsv.PrivateKey('mainnet').toAddress().toString()
      const requests = [blockchain.utxos(address), blockchain.utxos(address)]
      await expect(Promise.all(requests)).to.be.rejected
    })

    it('should return large number of UTXOS', async () => {
      const run = createRun({ network: 'main' })
      const utxos = await run.blockchain.utxos('14kPnFashu7rYZKTXvJU8gXpJMf9e3f8k1')
      expect(utxos.length > 1220).to.equal(true)
    })
  })
  */
  })
})

// ------------------------------------------------------------------------------------------------
// BlockchainServerCache tests
// ------------------------------------------------------------------------------------------------

describe('BlockchainServerCache', () => {
  /*
  describe('get', () => {
    it('should not return expired transactions', async () => {
      const cache = unobfuscate(new BlockchainServer.Cache())
      cache.expiration = 1
      const tx = new bsv.Transaction()
      cache.fetched(tx)
      const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }
      await sleep(10)
      expect(cache.get(tx.hash)).not.to.equal(tx)
    })
  })

  describe('fetched', () => {
    it('should flush oldest transcation when full', () => {
      const cache = unobfuscate(new BlockchainServer.Cache({ size: 1 }))
      cache.size = 1
      const tx1 = new bsv.Transaction().addData('1')
      const tx2 = new bsv.Transaction().addData('2')
      cache.fetched(tx1)
      cache.fetched(tx2)
      expect(cache.transactions.size).to.equal(1)
      expect(cache.transactions.get(tx2.hash)).to.equal(tx2)
    })
  })
  */
})

// ------------------------------------------------------------------------------------------------
