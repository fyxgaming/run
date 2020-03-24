/**
 * mockchain.js
 *
 * Tests for lib/module/mockchain.js
 */

const { PrivateKey, Transaction, Script } = require('bsv')
const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, PERF } = require('../config')
const { Mockchain } = Run.module

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const mockchain = new Mockchain()
const privkey = new PrivateKey('testnet')
const address = privkey.toAddress()
const script = Script.fromAddress(address)
mockchain.fund(address, 100000000)

// ------------------------------------------------------------------------------------------------
// Mockchain Functional Tests
// ------------------------------------------------------------------------------------------------

describe('Mockchain', () => {
  describe('block', () => {
    it('should set blockheight on tx', async () => {
      const utxo = (await mockchain.utxos(script))[0]
      const tx = new Transaction().from(utxo).change(address).sign(privkey)
      await mockchain.broadcast(tx)
      expect(tx.blockheight).to.equal(-1)
      mockchain.block()
      expect(tx.blockheight).to.equal(mockchain.height)
    })

    it('should spent spentHeight on outputs', async () => {
      const utxo = (await mockchain.utxos(script))[0]
      const tx = new Transaction().from(utxo).change(address).sign(privkey)
      await mockchain.broadcast(tx)
      const prevtx = await mockchain.fetch(utxo.txid)
      expect(prevtx.outputs[utxo.vout].spentHeight).to.equal(-1)
      mockchain.block()
      expect(prevtx.outputs[utxo.vout].spentHeight).to.equal(mockchain.height)
    })

    it('should respect 25 chain limit', async () => {
      for (let i = 0; i < 25; i++) {
        const utxo = (await mockchain.utxos(script))[0]
        const tx = new Transaction().from(utxo).change(address).sign(privkey)
        await mockchain.broadcast(tx)
      }
      const utxo = (await mockchain.utxos(script))[0]
      const tx = new Transaction().from(utxo).change(address).sign(privkey)
      await expect(mockchain.broadcast(tx)).to.be.rejectedWith('too-long-mempool-chain')
      mockchain.block()
      await mockchain.broadcast(tx)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Mockchain Performance Tests
// ------------------------------------------------------------------------------------------------

if (PERF) {
  describe('Mockchain Performance', () => {
    it('should support fast broadcsts', async () => {
      const utxo = (await mockchain.utxos(script))[0]
      const start = new Date()
      const tx = new Transaction().from(utxo).change(address).sign(privkey)
      await mockchain.broadcast(tx)
      expect(new Date() - start < 30).to.equal(true)
    })

    it('should support fast fetches', async () => {
      let utxo = (await mockchain.utxos(script))[0]
      const earlyTxid = utxo.txid
      const measures = []
      for (let i = 0; i < 1000; i++) {
        const tx = new Transaction().from(utxo).change(address).sign(privkey)
        utxo = { txid: tx.hash, vout: 0, script: tx.outputs[0].script, satoshis: tx.outputs[0].satoshis }
        await mockchain.broadcast(tx)
        const before = new Date()
        await mockchain.fetch(tx.hash)
        await mockchain.fetch(earlyTxid)
        measures.push(new Date() - before)
        mockchain.block()
      }
      const start = measures.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      const end = measures.slice(measures.length - 3).reduce((a, b) => a + b, 0) / 3
      expect(start < 10).to.equal(true)
      expect(end < 10).to.equal(true)
    }).timeout(30000)

    it('should support fast utxo queries', async () => {
      // Generate 10 private keys and fund their addresses
      const privateKeys = []
      for (let i = 0; i < 10; i++) { privateKeys.push(new PrivateKey('testnet')) }
      const addresses = privateKeys.map(privateKey => privateKey.toAddress())
      const scripts = addresses.map(address => Script.fromAddress(address))
      addresses.forEach(address => mockchain.fund(address, 100000))

      // Send from each address to the next, 1000 times
      const measures = []
      for (let i = 0; i < 1000; i++) {
        const before = new Date()
        const utxos = await mockchain.utxos(scripts[i % 10])
        measures.push(new Date() - before)
        const tx = new Transaction().from(utxos).to(addresses[(i + 1) % 10], 1000)
          .change(addresses[i % 10]).sign(privateKeys[i % 10])
        await mockchain.broadcast(tx)
        mockchain.block()
      }

      // Get an average time to query utxos() at the start and end, and check it didn't change much
      const start = measures.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      const end = measures.slice(measures.length - 3).reduce((a, b) => a + b, 0) / 3
      expect(start < 10).to.equal(true)
      expect(end < 10).to.equal(true)
    }).timeout(30000)
  })
}

// ------------------------------------------------------------------------------------------------
