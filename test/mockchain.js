const { PrivateKey, Transaction } = require('bsv')
const { describe, it, before, beforeEach } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { unobfuscate } = require('./run')
const { createRun } = require('./helpers')
const runBlockchainTestSuite = require('./blockchain')

describe('Mockchain', () => {
  const run = createRun({ network: 'mock' })
  const tx = run.blockchain.transactions.values().next().value
  beforeEach(() => run.blockchain.block())

  const errors = {
    noInputs: 'tx has no inputs',
    noOutputs: 'tx has no outputs',
    feeTooLow: 'tx fee too low',
    notFullySigned: 'tx not fully signed',
    duplicateInput: 'transaction input 1 duplicate input',
    missingInput: 'tx input 0 missing or spent'
  }

  const sampleTx = {
    txid: tx.hash,
    time: tx.time
  }

  // generate a spending transaction so that we have spentTxId
  before(async () => {
    const utxos = await run.blockchain.utxos(run.purse.address)
    const spentTx = new Transaction().from(utxos).change(run.purse.address).sign(run.purse.privkey)
    await run.blockchain.broadcast(spentTx)
    sampleTx.vout = [
      {
        spentTxId: undefined,
        spentIndex: undefined,
        spentHeight: undefined
      },
      {
        spentTxId: spentTx.hash,
        spentIndex: 0,
        spentHeight: 0
      }
    ]
  })

  runBlockchainTestSuite(run.blockchain, run.purse.privkey, sampleTx,
    true /* supportsSpentTxIdInBlocks */, true /* supportsSpentTxIdInMempool */,
    0 /* indexingLatency */, errors)

  describe('block', () => {
    it('updates block heights', async () => {
      const txns = []
      for (let i = 0; i < 25; i++) {
        const utxo = (await run.blockchain.utxos(run.purse.address))[0]
        const tx = new Transaction().from(utxo).change(run.purse.address).sign(run.purse.privkey)
        await run.blockchain.broadcast(tx)
        txns.push(unobfuscate(tx))
      }
      for (let i = 0; i < txns.length; i++) {
        expect(txns[i].blockHeight).to.equal(-1)
        expect(txns[i].outputs[0].spentHeight).to.equal(i < txns.length - 1 ? -1 : null)
      }
      run.blockchain.block()
      for (let i = 0; i < txns.length; i++) {
        expect(txns[i].blockHeight).to.equal(run.blockchain.blockHeight)
        expect(txns[i].outputs[0].spentHeight).to.equal(i < txns.length - 1
          ? run.blockchain.blockHeight : null)
      }
    })

    it('25 chain limit', async () => {
      for (let i = 0; i < 25; i++) {
        const utxo = (await run.blockchain.utxos(run.purse.address))[0]
        const tx = new Transaction().from(utxo).change(run.purse.address).sign(run.purse.privkey)
        await run.blockchain.broadcast(tx)
      }
      const utxo = (await run.blockchain.utxos(run.purse.address))[0]
      const tx = new Transaction().from(utxo).change(run.purse.address).sign(run.purse.privkey)
      await expect(run.blockchain.broadcast(tx)).to.be.rejectedWith('too-long-mempool-chain')
      run.blockchain.block()
      await run.blockchain.broadcast(tx)
    })
  })

  describe('performance', () => {
    it('broadcast', async () => {
      const utxo = (await run.blockchain.utxos(run.purse.address))[0]
      const start = new Date()
      const tx = new Transaction().from(utxo).change(run.purse.address).sign(run.purse.privkey)
      await run.blockchain.broadcast(tx)
      expect(new Date() - start < 200).to.equal(true)
    })

    it('fetch', async () => {
      let utxo = (await run.blockchain.utxos(run.purse.address))[0]
      const earlyTxid = utxo.txid
      const measures = []
      for (let i = 0; i < 1000; i++) {
        const tx = new Transaction().from(utxo).change(run.purse.address).sign(run.purse.privkey)
        utxo = { txid: tx.hash, vout: 0, script: tx.outputs[0].script, satoshis: tx.outputs[0].satoshis }
        await run.blockchain.broadcast(tx)
        const before = new Date()
        await run.blockchain.fetch(tx.hash)
        await run.blockchain.fetch(earlyTxid)
        measures.push(new Date() - before)
        run.blockchain.block()
      }
      const start = measures.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      const end = measures.slice(measures.length - 3).reduce((a, b) => a + b, 0) / 3
      expect(start < 10).to.equal(true)
      expect(end < 10).to.equal(true)
    }).timeout(10000)

    it('utxos', async () => {
      const privateKeys = []; const addresses = []
      for (let i = 0; i < 10; i++) { privateKeys.push(new PrivateKey()) }
      privateKeys.forEach(privateKey => addresses.push(privateKey.toAddress()))
      addresses.forEach(address => run.blockchain.fund(address, 100000))
      const measures = []
      for (let i = 0; i < 1000; i++) {
        const before = new Date()
        const utxos = await run.blockchain.utxos(addresses[i % 10])
        measures.push(new Date() - before)
        const tx = new Transaction().from(utxos).to(addresses[(i + 1) % 10], 1000)
          .change(addresses[i % 10]).sign(privateKeys[i % 10])
        await run.blockchain.broadcast(tx)
        run.blockchain.block()
      }
      const start = measures.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      const end = measures.slice(measures.length - 3).reduce((a, b) => a + b, 0) / 3
      expect(start < 10).to.equal(true)
      expect(end < 10).to.equal(true)
    }).timeout(10000)
  })
})
