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
const { Jig, createRun } = require('./helpers')

describe('Purse', () => {
  const run = createRun()
  beforeEach(() => run.activate())

  describe('constructor', () => {
    it('should generate random purse if unspecified', () => {
      expect(run.purse.privkey.toString()).not.to.equal(createRun().purse.privkey.toString())
    })

    it('should calculate address correctly from private key', () => {
      expect(run.purse.privkey.toAddress().toString()).to.equal(run.purse.address.toString())
    })

    it('should support passing in private key', () => {
      const privkey = new bsv.PrivateKey()
      const run = createRun({ purse: privkey })
      expect(run.purse.privkey.toString()).to.equal(privkey.toString())
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
      expect(tx2.outputs.length).to.equal(2)
    })

    it('should throw if not enough funds', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, Number.MAX_SAFE_INTEGER)
      await expect(run.purse.pay(tx)).to.be.rejectedWith('not enough funds')
    })

    it('should automatically split utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      await run.purse.pay(new bsv.Transaction().to(address, 100))
      const utxos = await run.blockchain.utxos(run.purse.address)
      expect(utxos.length).to.equal(10)
    })
  })

  describe('balance', () => {
    it('should sum non-jig and non-class utxos', async () => {
      const utxos = await run.blockchain.utxos(run.purse.address)
      const address = new bsv.PrivateKey().toAddress()
      const send = new bsv.Transaction().from(utxos).to(address, 9999)
        .change(run.purse.address).sign(run.purse.privkey)
      await run.blockchain.broadcast(send)
      createRun({ owner: run.purse.privkey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 8888 } }
      await new A().sync()
      const utxos2 = await run.blockchain.utxos(run.purse.address)
      const nonJigUtxos = utxos2.filter(utxo => utxo.satoshis > 100000)
      const balance = nonJigUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)
      expect(await run.purse.balance()).to.equal(balance)
    })
  })

  describe('utxos', () => {
    it('should return non-jig and non-class utxos', async () => {
      const run2 = createRun({ owner: run.purse.privkey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 8888 } }
      await new A().sync()
      expect((await run2.purse.utxos()).length).to.equal(10)
    })
  })
})
