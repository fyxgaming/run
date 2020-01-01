const bsv = require('bsv')
const { describe, it, beforeEach } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('./run')
const { Jig } = Run
const { createRun } = require('./helpers')

describe('Purse', () => {
  const run = createRun()
  beforeEach(() => run.activate())

  describe('constructor', () => {
    it('generates random purse', () => {
      expect(run.purse.privkey.toString()).not.to.equal(createRun().purse.privkey.toString())
    })

    it('address expected', () => {
      expect(run.purse.privkey.toAddress().toString()).to.equal(run.purse.address.toString())
    })

    it('supports passing in privkey', () => {
      const privkey = new bsv.PrivateKey()
      const run = createRun({ purse: privkey })
      expect(run.purse.privkey.toString()).to.equal(privkey.toString())
    })

    it('purse privkey on wrong network', () => {
      const purse = new bsv.PrivateKey('mainnet').toString()
      expect(() => createRun({ purse, network: 'test' })).to.throw('Private key network mismatch')
    })
  })

  describe('pay', () => {
    it('adds inputs and outputs', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, 100)
      const tx2 = await run.purse.pay(tx)
      expect(tx2.inputs.length).to.equal(1)
      expect(tx2.outputs.length).to.equal(2)
    })

    it('not enough funds', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, Number.MAX_SAFE_INTEGER)
      await expect(run.purse.pay(tx)).to.be.rejectedWith('not enough funds')
    })

    it('automatically splits utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      await run.purse.pay(new bsv.Transaction().to(address, 100))
      const utxos = await run.blockchain.utxos(run.purse.address)
      expect(utxos.length).to.equal(10)
    })
  })

  describe('balance', () => {
    it('sum of non-jig and non-class utxos', async () => {
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
    it('non-jig and non-class utxos', async () => {
      const run2 = createRun({ owner: run.purse.privkey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 8888 } }
      await new A().sync()
      expect((await run2.purse.utxos()).length).to.equal(10)
    })
  })
})
