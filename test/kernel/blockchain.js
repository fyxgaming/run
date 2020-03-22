/**
 * blockchain.js
 *
 * Universal blockchain API test suite
 */

const bsv = require('bsv')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../config')

const run = new Run()
const { purse, blockchain } = run

describe('Blockchain', () => {
  describe('broadcast', () => {
    it('should support sending to self', async () => {
      const tx = await purse.pay(new bsv.Transaction())
      await blockchain.broadcast(tx)
    })

    it('should throw if missing input', async () => {
      const tx = await purse.pay(new bsv.Transaction())
      tx.inputs[0].outputIndex = 999
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith('Missing inputs')
    })

    /*
    it('should throw if already spent in block', async () => {
      const prevTx = await blockchain.fetch(sampleTx.txid)
      const script = prevTx.outputs[sampleTx.outputIndex].script
      const satoshis = prevTx.outputs[sampleTx.outputIndex].satoshis
      const utxo = { txid: sampleTx.txid, vout: sampleTx.outputIndex, script, satoshis }
      const tx = new bsv.Transaction().from(utxo).addSafeData('123').change(address).sign(sampleTx.outputPrivkey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.missingInput)
    })

    /*
    it('should throw if mempool conflict', async () => {
      const utxos = await blockchain.utxos(address)
      const tx1 = new bsv.Transaction().from(utxos).change(address).sign(privateKey)
      await blockchain.broadcast(tx1)
      const tx2 = new bsv.Transaction().from(utxos).change(new bsv.PrivateKey().toAddress()).sign(privateKey)
      await expect(blockchain.broadcast(tx2)).to.be.rejectedWith(errors.mempoolConflict)
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
    */
  })
})
