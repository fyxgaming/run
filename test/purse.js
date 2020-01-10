/**
 * purse.js
 *
 * Tests for ../lib/purse.js
 */

const bsv = require('bsv')
const { describe, it, beforeEach } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, Jig, createRun, payFor } = require('./helpers')
const { Purse } = Run

describe('Purse', () => {
  const run = createRun()
  beforeEach(() => run.activate())

  describe('constructor', () => {
    it('should generate random purse if unspecified', () => {
      expect(run.purse.bsvPrivateKey.toString()).not.to.equal(createRun().purse.bsvPrivateKey.toString())
      expect(run.purse.privkey).not.to.equal(createRun().purse.privkey)
    })

    it('should calculate address correctly from private key', () => {
      expect(run.purse.bsvPrivateKey.toAddress().toString()).to.equal(run.purse.address)
    })

    it('should support passing in private key', () => {
      const privkey = new bsv.PrivateKey()
      const run = createRun({ purse: privkey })
      expect(run.purse.privkey).to.equal(privkey.toString())
      expect(run.purse.bsvPrivateKey).to.deep.equal(privkey)
    })

    it('should throw if private key is on wrong network', () => {
      const purse = new bsv.PrivateKey('mainnet').toString()
      expect(() => createRun({ purse, network: 'test' })).to.throw('Private key network mismatch')
    })
  })

  describe('pay', () => {
    it('should adds inputs and outputs', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, 100)
      const tx2 = await run.purse.pay(tx)
      expect(tx2.inputs.length).to.equal(1)
      expect(tx2.outputs.length).to.equal(11)
    })

    it('should throw if not enough funds', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, Number.MAX_SAFE_INTEGER)
      await expect(run.purse.pay(tx)).to.be.rejectedWith('Not enough funds')
    })

    it('should throw if no utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, 100)
      let didLogWarning = false
      const logger = { warn: () => { didLogWarning = true } }
      const purse = new Purse({ blockchain: run.blockchain, logger })
      await expect(purse.pay(tx)).to.be.rejectedWith('Not enough funds')
      expect(didLogWarning).to.equal(true)
      const purseWithNoLogger = new Purse({ blockchain: run.blockchain, logger: null })
      await expect(purseWithNoLogger.pay(tx)).to.be.rejectedWith('Not enough funds')
    })

    it('should automatically split utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      await run.blockchain.broadcast(tx)
      const utxos = await run.blockchain.utxos(run.purse.address)
      expect(utxos.length).to.equal(10)
    })

    it('should shuffle UTXOs', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      await run.blockchain.broadcast(tx)
      const txBase = await run.purse.pay(new bsv.Transaction().to(address, 100))
      for (let i = 0; i < 100; i++) {
        const tx2 = await run.purse.pay(new bsv.Transaction().to(address, 100))
        const sameTxId = tx2.inputs[0].prevTxId.toString() === txBase.inputs[0].prevTxId.toString()
        const sameIndex = tx2.inputs[0].outputIndex === txBase.inputs[0].outputIndex
        if (!sameTxId || !sameIndex) return
      }
      throw new Error('Did not shuffle UTXOs')
    })
  })

  describe('balance', () => {
    it('should sum non-jig and non-class utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const send = await payFor(new bsv.Transaction().to(address, 9999), run.purse.bsvPrivateKey, run.blockchain)
      await run.blockchain.broadcast(send)
      createRun({ owner: run.purse.bsvPrivateKey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 8888 } }
      await new A().sync()
      const utxos = await run.blockchain.utxos(run.purse.address)
      const nonJigUtxos = utxos.filter(utxo => utxo.satoshis > 100000)
      const balance = nonJigUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)
      expect(await run.purse.balance()).to.equal(balance)
    })
  })

  describe('utxos', () => {
    it('should return non-jig and non-class utxos', async () => {
      const run2 = createRun({ owner: run.purse.bsvPrivateKey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 8888 } }
      await new A().sync()
      expect((await run2.purse.utxos()).length).to.equal(10)
    })
  })
})
