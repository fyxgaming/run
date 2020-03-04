/**
 * blockchain.js
 *
 * Tests for ../lib/blockchain.js
 */

const bsv = require('bsv')
const { describe, it, beforeEach } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, createRun, unobfuscate } = require('./helpers')
const { BlockchainServer } = Run
const runBlockchainTestSuite = require('./blockchain-suite')
const Blockchain = unobfuscate(Run.Blockchain)

// ------------------------------------------------------------------------------------------------
// Blockchain API tests
// ------------------------------------------------------------------------------------------------

describe('Blockchain', () => {
  it('should throw not implemented', async () => {
    const blockchain = new Blockchain()
    expect(() => blockchain.network).to.throw('Not implemented')
    await expect(blockchain.broadcast()).to.be.rejectedWith('Not implemented')
    await expect(blockchain.fetch()).to.be.rejectedWith('Not implemented')
    await expect(blockchain.utxos()).to.be.rejectedWith('Not implemented')
  })

  describe('isBlockchain', () => {
    it('should return true for valid blockchain', () => {
      const mockchain = new Run.Mockchain()
      expect(Blockchain.isBlockchain(mockchain)).to.equal(true)
      const blockchainServer = new Run.BlockchainServer()
      expect(Blockchain.isBlockchain(blockchainServer)).to.equal(true)
    })

    it('should return false for invalid blockchain', () => {
      expect(Blockchain.isBlockchain()).to.equal(false)
      expect(Blockchain.isBlockchain({})).to.equal(false)
      expect(Blockchain.isBlockchain(false)).to.equal(false)
      expect(Blockchain.isBlockchain(null)).to.equal(false)
      expect(Blockchain.isBlockchain(() => {})).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Blockchain tests
// ------------------------------------------------------------------------------------------------

describe('Blockchain', () => {
  describe('constructor', () => {
    it('should return mainnet blockchain for main network', () => {
      expect(createRun({ network: 'main' }).blockchain).not.to.equal(undefined)
    })

    it('should return testnet blockchain for test network', () => {
      expect(createRun({ network: 'test' }).blockchain).not.to.equal(undefined)
    })

    it('should return scaling blockchain for stn network', () => {
      expect(createRun({ network: 'stn' }).blockchain).not.to.equal(undefined)
    })

    it('should return mock blockchain for mock network', () => {
      expect(createRun({ network: 'mock' }).blockchain).not.to.equal(undefined)
    })

    it('should throw for bad network', () => {
      expect(() => createRun({ network: 'bitcoin' })).to.throw()
    })
  })
})

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
        expect(() => new BlockchainServer({ network: 'bad' })).to.throw('Unknown network: bad')
        expect(() => new BlockchainServer({ network: 0 })).to.throw('Invalid network: 0')
        expect(() => new BlockchainServer({ network: {} })).to.throw('Invalid network: [object Object]')
        expect(() => new BlockchainServer({ network: null })).to.throw('Invalid network: null')
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
        expect(unobfuscate(new BlockchainServer()).api.name).to.equal('run')
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
      const address = bsv.PrivateKey('mainnet').toAddress().toString()
      const txid = '0000000000000000000000000000000000000000000000000000000000000000'
      const api = unobfuscate({ })
      api.utxosUrl = (network, address) => 'https://api.run.network/v1/main/status'
      api.utxosResp = (data, address) => {
        const utxo = { txid, vout: 0, satoshis: 0, script: new bsv.Script() }
        return [utxo, utxo]
      }
      function warn (warning) { this.lastWarning = warning }
      const logger = { warn, info: () => {} }
      const blockchain = new BlockchainServer({ network: 'main', api, logger })
      const utxos = await blockchain.utxos(address)
      expect(utxos.length).to.equal(1)
      expect(logger.lastWarning).to.equal(`Duplicate utxo returned from server: ${txid}_o0`)
    }).timeout(30000)

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
})

// ------------------------------------------------------------------------------------------------
// BlockchainServerCache tests
// ------------------------------------------------------------------------------------------------

describe('BlockchainServerCache', () => {
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
})

// ------------------------------------------------------------------------------------------------
// API tests
// ------------------------------------------------------------------------------------------------

// sample transactions with spent outputs in mined blocks on each network
const sampleTransactions = {
  main: {
    txid: '8b580cd23c2d2cb0236b888a977a19153eaa9f5ff50b40876699738e747e87ef',
    blockhash: '0000000000000000013cd2f234ed8048b58f04e1c3e739be5c1b44518f3f52ce',
    blocktime: 1583296480,
    time: 1583296480000,
    minConfirmations: 3,
    vout: [{
      spentTxId: 'd1506c004f263e351cf0884407bf7665979c45b63266311eb414e6c2682536f5',
      spentIndex: 0,
      spentHeight: 624716
    }],
    outputIndex: 0,
    outputPrivkey: 'L3qpvEdCa4h7qxuJ1xqQwNQV2dfDR8YB57awpcbnBpoyGMAZEGLq'
  },
  test: {
    txid: '883bcccba28ca185b4d20b90f344f32f7fd9e273f962f661a48cea0849609443',
    blockhash: '00000000a95abd6a8d6fed34c0fb07b9ef5c51daa9832a43db98b63d52d8394c',
    blocktime: 1583295191,
    time: 1583295191000,
    minConfirmations: 3,
    vout: [{
      spentTxId: '4350cf2aac66a2b3aef840af70f4fcfddcd85ccc3cb0e3aa62febb2cbfa91e53',
      spentIndex: 0,
      spentHeight: 1351192
    }],
    outputIndex: 0,
    outputPrivkey: 'cT7uSf2Q4nFDWoqQtSBaKHnQsuWVdcvxZMiuCs3nkwYh94xctaFg'
  },
  stn: {
    txid: 'a40ee613c5982d6b39d2425368eb2375f49b38a45b457bd72db4ec666d96d4c6'
  }
}

const errors = {
  noInputs: 'tx has no inputs',
  noOutputs: 'tx has no outputs',
  feeTooLow: 'tx fee too low',
  notFullySigned: 'tx not fully signed',
  duplicateInput: /transaction input [0-9]* duplicate input/,
  missingInput: 'Missing inputs',
  mempoolConflict: 'txn-mempool-conflict'
}

const apis = { Run: 'run', BitIndex: 'bitindex', WhatsOnChain: 'whatsonchain' }
const networks = ['main', 'test']
const supportsSpentTxIdInBlocks = { Run: true, BitIndex: true, WhatsOnChain: false }
const supportsSpentTxIdInMempool = { Run: true, BitIndex: true, WhatsOnChain: false }

// Iterate networks first, then APIs, so that we can reuse the caches when possible
networks.forEach(network => {
  Object.keys(apis).forEach(api => {
    describe(`${api} (${network})`, function () {
      const run = createRun({ network, blockchain: apis[api] })

      beforeEach(() => run.activate())

      this.timeout(30000)

      runBlockchainTestSuite(
        run.blockchain,
        run.purse.bsvPrivateKey,
        sampleTransactions[network],
        supportsSpentTxIdInBlocks[api],
        supportsSpentTxIdInMempool[api],
        1000 /* indexingLatency */,
        errors)
    })
  })
})

// ------------------------------------------------------------------------------------------------

module.exports = runBlockchainTestSuite
