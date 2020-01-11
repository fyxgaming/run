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
const { Run, createRun, payFor, unobfuscate } = require('./helpers')
const { Blockchain, BlockchainServer } = Run

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
})

// ------------------------------------------------------------------------------------------------
// Universal blockchain API test suite
// ------------------------------------------------------------------------------------------------

function runBlockchainTestSuite (blockchain, privateKey, sampleTx,
  supportsSpentTxIdInBlocks, supportsSpentTxIdInMempool, indexingLatency, errors) {
  const address = privateKey.toAddress().toString()

  describe('broadcast', () => {
    it('should support sending to self', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
    })

    it('should throw if missing input', async () => {
      const utxos = await blockchain.utxos(address)
      const utxo = { ...utxos[0], vout: 999 }
      const tx = new bsv.Transaction().from(utxo).change(address).fee(250).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.missingInput)
    })

    it('should throw if no inputs', async () => {
      const tx = new bsv.Transaction().to(address, 100)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noInputs)
    })

    it('should throw if no outputs', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noOutputs)
    })

    it('should throw if fee too low', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).change(address).fee(0).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.feeTooLow)
    })

    it('should throw if not signed', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).change(address)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.notFullySigned)
    })

    it('should throw if duplicate input', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).from(utxos).change(address).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.duplicateInput)
    })
  })

  describe('fetch', () => {
    it('should get pre-existing transaction', async () => {
      const tx = await blockchain.fetch(sampleTx.txid)
      expect(tx.hash).to.equal(sampleTx.txid)
    })

    it('should set time', async () => {
      const tx = await blockchain.fetch(sampleTx.txid)
      expect(tx.time).not.to.equal(undefined)
      expect(tx.time > new Date('January 3, 2009')).to.equal(true)
      expect(tx.time <= Date.now()).to.equal(true)
    })

    it('should cache repeated calls', async () => {
      const requests = []
      for (let i = 0; i < 100; i++) requests.push(blockchain.fetch(sampleTx.txid))
      await Promise.all(requests)
    })

    it('should throw if nonexistant', async () => {
      const bad = '0000000000000000000000000000000000000000000000000000000000000000'
      const requests = [bad, bad, bad].map(txid => blockchain.fetch(txid))
      await expect(Promise.all(requests)).to.be.rejectedWith()
    })

    it('should set spent information for transaction in mempool and unspent', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
      function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
      const tx2 = await blockchain.fetch(tx.hash)
      // check the cached copy
      expect(tx2.outputs[0].spentTxId).to.equal(null)
      expect(tx2.outputs[0].spentIndex).to.equal(null)
      expect(tx2.outputs[0].spentHeight).to.equal(null)
      // check the uncached copy
      if (blockchain instanceof BlockchainServer) {
        await sleep(indexingLatency)
        blockchain.cache.transactions.clear()
      }
      const tx3 = await blockchain.fetch(tx.hash)
      if (supportsSpentTxIdInMempool) {
        expect(tx3.outputs[0].spentTxId).to.equal(null)
        expect(tx3.outputs[0].spentIndex).to.equal(null)
        expect(tx3.outputs[0].spentHeight).to.equal(null)
      } else {
        expect(tx3.outputs[0].spentTxId).to.equal(undefined)
        expect(tx3.outputs[0].spentIndex).to.equal(undefined)
        expect(tx3.outputs[0].spentHeight).to.equal(undefined)
      }
      expect(tx3.confirmations).to.equal(0)
    })

    it('should set spent information for transaction in mempool and spent', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
      function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
      if (blockchain instanceof BlockchainServer) {
        await sleep(indexingLatency)
        blockchain.cache.transactions.clear()
      }
      const firstInput = tx.inputs[0]
      const prev = await blockchain.fetch(firstInput.prevTxId.toString('hex'))
      if (supportsSpentTxIdInMempool) {
        expect(prev.outputs[firstInput.outputIndex].spentTxId).to.equal(tx.hash)
        expect(prev.outputs[firstInput.outputIndex].spentIndex).to.equal(0)
        expect(prev.outputs[firstInput.outputIndex].spentHeight).to.equal(-1)
      } else {
        expect(prev.outputs[firstInput.outputIndex].spentTxId).to.equal(undefined)
        expect(prev.outputs[firstInput.outputIndex].spentIndex).to.equal(undefined)
        expect(prev.outputs[firstInput.outputIndex].spentHeight).to.equal(undefined)
      }
    })

    it('should set spent information for transaction in block and spent', async () => {
      const tx = await blockchain.fetch(sampleTx.txid)
      for (let i = 0; i < sampleTx.vout.length; i++) {
        if (supportsSpentTxIdInBlocks) {
          expect(tx.outputs[i].spentTxId).to.equal(sampleTx.vout[i].spentTxId)
          expect(tx.outputs[i].spentIndex).to.equal(sampleTx.vout[i].spentIndex)
          expect(tx.outputs[i].spentHeight).to.equal(sampleTx.vout[i].spentHeight)
        } else {
          expect(tx.outputs[0].spentTxId).to.equal(undefined)
          expect(tx.outputs[0].spentIndex).to.equal(undefined)
          expect(tx.outputs[0].spentHeight).to.equal(undefined)
        }
      }
      expect(tx.time).to.equal(sampleTx.time)
      if (sampleTx.blockhash) {
        expect(tx.blockhash).to.equal(sampleTx.blockhash)
        expect(tx.blocktime).to.equal(sampleTx.blocktime)
        expect(tx.confirmations > sampleTx.minConfirmations).to.equal(true)
      }
    })

    it('should keep spent info when force fetch', async () => {
      const privateKey2 = new bsv.PrivateKey(privateKey.network)
      const address2 = privateKey2.toAddress()
      const tx1 = await payFor(new bsv.Transaction().to(address2, 1000).sign(privateKey), privateKey, blockchain)
      await blockchain.broadcast(tx1)
      const utxo = { txid: tx1.hash, vout: 0, script: tx1.outputs[0].script, satoshis: 1000 }
      const tx2 = (await payFor(new bsv.Transaction().from(utxo), privateKey, blockchain)).sign(privateKey2)
      await blockchain.broadcast(tx2)
      const tx1b = await blockchain.fetch(tx1.hash, true)
      expect(tx1b.outputs[0].spentTxId).to.equal(tx1.outputs[0].spentTxId)
      expect(tx1b.outputs[0].spentIndex).to.equal(tx1.outputs[0].spentIndex)
      expect(tx1b.outputs[0].spentHeight).to.equal(tx1.outputs[0].spentHeight)
    })
  })

  describe('utxos', () => {
    it('should return utxos', async () => {
      const utxos = await blockchain.utxos(address)
      expect(utxos.length > 0).to.equal(true)
      expect(utxos[0].txid).not.to.equal(undefined)
      expect(utxos[0].vout).not.to.equal(undefined)
      expect(utxos[0].script).not.to.equal(undefined)
      expect(utxos[0].satoshis).not.to.equal(undefined)
    })

    it('should return empty list if no utxos', async () => {
      const address = new bsv.PrivateKey(privateKey.network).toAddress()
      const utxos = await blockchain.utxos(address)
      expect(utxos.length).to.equal(0)
    })

    it('should not return spent outputs', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
      const utxos = await blockchain.utxos(address)
      expect(utxos.some(utxo => utxo.txid === tx.inputs[0].prevTxId.toString() &&
        utxo.vout === tx.inputs[0].outputIndex)).to.equal(false)
      expect(utxos.some(utxo => utxo.txid === tx.hash && utxo.vout === 0)).to.equal(true)
    })

    it('should cache repeated calls', async () => {
      const requests = []
      for (let i = 0; i < 100; i++) requests.push(blockchain.utxos(address))
      await Promise.all(requests)
    })

    it('should throw for invalid address', async () => {
      const requests = ['123', '123', '123'].map(addr => blockchain.utxos(addr))
      await expect(Promise.all(requests)).to.be.rejectedWith()
    })
  })
}

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
    it('should default network to main', () => {
      expect(new BlockchainServer().network).to.equal('main')
    })

    it('should throw for bad network', () => {
      expect(() => new BlockchainServer({ network: 'bad' })).to.throw('Unknown network: bad')
      expect(() => new BlockchainServer({ network: 0 })).to.throw('Invalid network: 0')
      expect(() => new BlockchainServer({ network: {} })).to.throw('Invalid network: [object Object]')
      expect(() => new BlockchainServer({ network: null })).to.throw('Invalid network: null')
    })

    it('should support null loggers', () => {
      expect(new BlockchainServer({ logger: null }).logger).to.equal(null)
    })

    it('should throw for bad logger', () => {
      expect(() => new BlockchainServer({ logger: 'bad' })).to.throw('Invalid logger: bad')
      expect(() => new BlockchainServer({ logger: false })).to.throw('Invalid logger: false')
    })

    it('should default to star api', () => {
      expect(unobfuscate(new BlockchainServer()).api.name).to.equal('star')
    })

    it('should throw for bad api', () => {
      expect(() => new BlockchainServer({ api: 'bad' })).to.throw('Unknown blockchain API: bad')
      expect(() => new BlockchainServer({ api: null })).to.throw('Invalid blockchain API: null')
      expect(() => new BlockchainServer({ api: 123 })).to.throw('Invalid blockchain API: 123')
    })

    it('should support passing invalid caches', () => {
      const cache = {}
      expect(new BlockchainServer({ cache })).not.to.equal(cache)
    })

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
    txid: 'afc557ef2970af0b5fb8bc1a70a320af425c7a45ca5d40eac78475109563c5f8',
    blockhash: '000000000000000005609907e3092b92882c522fffb0705c73e91ddc3a6941ed',
    blocktime: 1556620117,
    time: 1556620117000,
    minConfirmations: 15000,
    vout: [{
      spentTxId: '26fb663eeb8d3cd407276b045a8d71da9f625ef3dca66f51cb047d97a8cad3a6',
      spentIndex: 0,
      spentHeight: 580333
    }]
  },
  test: {
    txid: 'acf2d978febb09e3a0d5817f180b19df675a0e95f75a2a1efeec739ebff865a7',
    blockhash: '00000000000001ffaf368388b7ac954a562bd76fe39f6e114b171655273a38a7',
    blocktime: 1556695666,
    time: 1556695666000,
    minConfirmations: 18000,
    vout: [{
      spentTxId: '806444d15f416477b00b6bbd937c02ff3c8f8c5e09dae28425c87a8a0ef58af0',
      spentIndex: 0,
      spentHeight: 1298618
    }]
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
  missingInput: 'Missing inputs'
}

const apis = { Star: 'star', BitIndex: 'bitindex', WhatsOnChain: 'whatsonchain' }
const networks = ['main', 'test']
const supportsSpentTxIdInBlocks = { Star: true, BitIndex: true, WhatsOnChain: false }
const supportsSpentTxIdInMempool = { Star: true, BitIndex: true, WhatsOnChain: false }

// Iterate networks first, then APIs, so that we can reuse the caches when possible
networks.forEach(network => {
  Object.keys(apis).forEach(api => {
    describe(`${api} (${network})`, function () {
      const run = createRun({ network, blockchain: apis[api] })
      beforeEach(() => run.activate())
      this.timeout(30000)
      runBlockchainTestSuite(run.blockchain, run.purse.bsvPrivateKey,
        sampleTransactions[network], supportsSpentTxIdInBlocks[api],
        supportsSpentTxIdInMempool[api], 1000 /* indexingLatency */, errors)
    })
  })
})

// ------------------------------------------------------------------------------------------------

module.exports = runBlockchainTestSuite
