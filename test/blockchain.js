const { PrivateKey, Transaction } = require('bsv')
const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('./run')
const { Api } = Run
const { createRun } = require('./helpers')

describe('Blockchain', () => {
  describe('constructor', () => {
    it('return mainnet blockchain', () => {
      expect(createRun({ network: 'main' }).blockchain).not.to.equal(undefined)
    })

    it('return testnet blockchain', () => {
      expect(createRun({ network: 'test' }).blockchain).not.to.equal(undefined)
    })

    it('return scaling blockchain', () => {
      expect(createRun({ network: 'stn' }).blockchain).not.to.equal(undefined)
    })

    it('return mock blockchain', () => {
      expect(createRun({ network: 'mock' }).blockchain).not.to.equal(undefined)
    })

    it('throw if bad network', () => {
      expect(() => createRun({ network: 'bitcoin' })).to.throw()
    })
  })
})

function runBlockchainTestSuite (blockchain, privateKey, sampleTx,
  supportsSpentTxIdInBlocks, supportsSpentTxIdInMempool, indexingLatency, errors) {
  const address = privateKey.toAddress().toString()

  describe('broadcast', () => {
    it('send to self', async () => {
      const utxos = (await blockchain.utxos(address)).slice(0, 1)
      const tx = new Transaction().from(utxos).change(address).fee(250).sign(privateKey)
      await blockchain.broadcast(tx)
    })

    it('throw if missing input', async () => {
      const utxos = await blockchain.utxos(address)
      const utxo = { ...utxos[0], vout: 999 }
      const tx = new Transaction().from(utxo).change(address).fee(250).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.missingInput)
    })

    it('throw if no inputs', async () => {
      const tx = new Transaction().to(address, 100)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noInputs)
    })

    it('throw if no outputs', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new Transaction().from(utxos).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noOutputs)
    })

    it('throw if fee too low', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new Transaction().from(utxos).change(address).fee(0).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.feeTooLow)
    })

    it('throw if not signed', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new Transaction().from(utxos).change(address).fee(250)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.notFullySigned)
    })

    it('throw if duplicate input', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new Transaction().from(utxos).from(utxos).change(address).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.duplicateInput)
    })
  })

  describe('fetch', () => {
    it('return transaction', async () => {
      const tx = await blockchain.fetch(sampleTx.txid)
      expect(tx.hash).to.equal(sampleTx.txid)
    })

    it('has time', async () => {
      const tx = await blockchain.fetch(sampleTx.txid)
      expect(tx.time).not.to.equal(undefined)
      expect(tx.time > new Date('January 3, 2009')).to.equal(true)
      expect(tx.time <= Date.now()).to.equal(true)
    })

    it('caches repeated calls', async () => {
      const requests = []
      for (let i = 0; i < 100; i++) requests.push(blockchain.fetch(sampleTx.txid))
      await Promise.all(requests)
    })

    it('throw if nonexistant', async () => {
      const bad = '0000000000000000000000000000000000000000000000000000000000000000'
      const requests = [bad, bad, bad].map(txid => blockchain.fetch(txid))
      await expect(Promise.all(requests)).to.be.rejectedWith()
    })

    it('in mempool and unspent', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new Transaction().from(utxos).change(address).sign(privateKey)
      await blockchain.broadcast(tx)
      function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
      const tx2 = await blockchain.fetch(tx.hash)
      // check the cached copy
      expect(tx2.outputs[0].spentTxId).to.equal(null)
      expect(tx2.outputs[0].spentIndex).to.equal(null)
      expect(tx2.outputs[0].spentHeight).to.equal(null)
      // check the uncached copy
      if (blockchain instanceof Api) {
        await sleep(indexingLatency)
        blockchain.txCache.clear()
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

    it('in mempool and spent', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new Transaction().from(utxos).change(address).sign(privateKey)
      await blockchain.broadcast(tx)
      function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
      if (blockchain instanceof Api) {
        await sleep(indexingLatency)
        blockchain.txCache.clear()
      }
      const prev = await blockchain.fetch(utxos[0].txid)
      if (supportsSpentTxIdInMempool) {
        expect(prev.outputs[utxos[0].vout].spentTxId).to.equal(tx.hash)
        expect(prev.outputs[utxos[0].vout].spentIndex).to.equal(0)
        expect(prev.outputs[utxos[0].vout].spentHeight).to.equal(-1)
      } else {
        expect(prev.outputs[utxos[0].vout].spentTxId).to.equal(undefined)
        expect(prev.outputs[utxos[0].vout].spentIndex).to.equal(undefined)
        expect(prev.outputs[utxos[0].vout].spentHeight).to.equal(undefined)
      }
    })

    it('in block and spent', async () => {
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
  })

  describe('utxos', () => {
    it('return utxos if some', async () => {
      const utxos = await blockchain.utxos(address)
      expect(utxos.length > 0).to.equal(true)
      expect(utxos[0].txid).not.to.equal(undefined)
      expect(utxos[0].vout).not.to.equal(undefined)
      expect(utxos[0].script).not.to.equal(undefined)
      expect(utxos[0].satoshis).not.to.equal(undefined)
    })

    it('return empty list if none', async () => {
      const address = new PrivateKey(privateKey.network).toAddress()
      const utxos = await blockchain.utxos(address)
      expect(utxos.length).to.equal(0)
    })

    it('dont return spent outputs', async () => {
      const prevUtxos = await blockchain.utxos(address)
      const tx = new Transaction().from(prevUtxos[0]).change(address).fee(250).sign(privateKey)
      await blockchain.broadcast(tx)
      const utxos = await blockchain.utxos(address)
      expect(utxos.length).to.equal(prevUtxos.length)
      expect(utxos[prevUtxos.length - 1].txid).to.equal(tx.hash)
      expect(utxos[prevUtxos.length - 1].vout).to.equal(0)
    })

    it('caches repeated calls', async () => {
      const requests = []
      for (let i = 0; i < 100; i++) requests.push(blockchain.utxos(address))
      await Promise.all(requests)
    })

    it('throws for invalid address', async () => {
      const requests = ['123', '123', '123'].map(addr => blockchain.utxos(addr))
      await expect(Promise.all(requests)).to.be.rejectedWith()
    })
  })
}

module.exports = runBlockchainTestSuite
