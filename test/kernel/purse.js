/**
 * purse.js
 *
 * Test for universal purse functionality in relation to the kernel
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
require('chai').use(require('chai-as-promised'))
const bsv = require('bsv')
const Run = require('../env/run')
const { Jig } = Run
const { spy } = require('sinon')

// ------------------------------------------------------------------------------------------------
// Purse
// ------------------------------------------------------------------------------------------------

describe('Purse', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // pay
  // --------------------------------------------------------------------------

  describe('pay', () => {
    it('called during publish', async () => {
      const run = new Run()
      spy(run.purse)
      run.deploy(class A { })
      await run.sync()
      expect(run.purse.pay.callCount).to.equal(1)
      const rawtx = run.purse.pay.args[0][0]
      const parents = run.purse.pay.args[0][1]
      expect(typeof rawtx).to.equal('string')
      expect(rawtx.length > 0).to.equal(true)
      expect(() => new bsv.Transaction(rawtx)).not.to.throw()
      expect(Array.isArray(parents)).to.equal(true)
      expect(parents.length).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('called with parents', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await run.sync()
      const parentRawtx = await run.blockchain.fetch(a.location.slice(0, 64))
      const parentTx = new bsv.Transaction(parentRawtx)
      spy(run.purse)
      a.auth()
      await run.sync()
      expect(run.purse.pay.callCount).to.equal(1)
      const parents = run.purse.pay.args[0][1]
      expect(Array.isArray(parents)).to.equal(true)
      expect(parents.length).to.equal(1)
      expect(parents[0].script).to.equal(parentTx.outputs[1].script.toHex())
      expect(parents[0].satoshis).to.equal(parentTx.outputs[1].satoshis)
    })

    // ------------------------------------------------------------------------

    it('called during transaction pay', async () => {
      const run = new Run()
      spy(run.purse)
      const tx = new Run.Transaction()
      tx.update(() => run.deploy(class A { }))
      await tx.pay()
      expect(run.purse.pay.callCount).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('called for each transaction pay', async () => {
      const run = new Run()
      spy(run.purse)
      const tx = new Run.Transaction()
      tx.update(() => run.deploy(class A { }))
      await tx.pay()
      await tx.pay()
      await tx.pay()
      expect(run.purse.pay.callCount).to.equal(3)
    })

    // ------------------------------------------------------------------------

    it('called during transaction publish', async () => {
      const run = new Run()
      spy(run.purse)
      const tx = new Run.Transaction()
      tx.update(() => run.deploy(class A { }))
      await tx.publish()
      expect(run.purse.pay.callCount).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('called during transaction export', async () => {
      const run = new Run()
      spy(run.purse)
      const tx = new Run.Transaction()
      tx.update(() => run.deploy(class A { }))
      await tx.export()
      expect(run.purse.pay.callCount).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('long mempool chain', async () => {
      const run = new Run()
      class A extends Jig { }
      for (let i = 0; i < 100; i++) { new A() } // eslint-disable-line
      await run.sync()
    })
  })

  // --------------------------------------------------------------------------
  // broadcast
  // --------------------------------------------------------------------------

  describe('broadcast', () => {
    it('called with final tx', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await run.sync()
      let broadcasted = null
      run.purse.broadcast = async rawtx => { broadcasted = rawtx }
      a.auth()
      await run.sync()
      const tx = new bsv.Transaction(broadcasted)
      expect(tx.hash).to.equal(a.location.slice(0, 64))
      expect(tx.inputs.length >= 2).to.equal(true)
      expect(tx.outputs.length >= 3).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('called before blockchain.broadcast', async () => {
      const run = new Run()
      let beforeBlockchainBroadcast = null
      spy(run.blockchain)
      run.purse.broadcast = async rawtx => { beforeBlockchainBroadcast = !run.blockchain.broadcast.called }
      class A { }
      run.deploy(A)
      await run.sync()
      expect(beforeBlockchainBroadcast).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('called publishing imported transactions', async () => {
      const run = new Run()
      run.purse.broadcast = () => { }
      spy(run.purse)
      class Dragon extends Jig { }
      const tx = new Run.Transaction()
      tx.update(() => new Dragon())
      const rawtx = await tx.export({ pay: false, sign: false })
      tx.rollback()
      expect(run.purse.pay.called).to.equal(false)
      expect(run.purse.broadcast.called).to.equal(false)
      const tx2 = await run.import(rawtx)
      await tx2.pay()
      await tx2.sign()
      await tx2.publish()
      expect(run.purse.pay.called).to.equal(true)
      expect(run.purse.broadcast.called).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('throw will stop publish', async () => {
      const run = new Run()
      run.purse.broadcast = async rawtx => { throw new Error('abc') }
      class A { }
      const C = run.deploy(A)
      await expect(run.sync()).to.be.rejectedWith('abc')
      expect(() => C.nonce).to.throw('Deploy failed')
    })

    // ------------------------------------------------------------------------

    it('supports no broadcast method', async () => {
      const run = new Run()
      run.purse.broadcast = undefined
      run.deploy(class A { })
      await run.sync()
    })
  })

  // --------------------------------------------------------------------------
  // cancel
  // --------------------------------------------------------------------------

  describe('cancel', () => {
    it('called if sign fails', async () => {
      const run = new Run()
      run.purse.cancel = () => { }
      spy(run.purse)
      run.owner.sign = () => { throw new Error('abc') }
      run.deploy(class A { })
      await expect(run.sync()).to.be.rejected
      expect(run.purse.cancel.callCount).to.equal(1)
      const paidtx = await run.purse.pay.returnValues[0]
      expect(run.purse.cancel.args[0][0]).to.equal(paidtx)
    })

    // ------------------------------------------------------------------------

    it('called if sign returns an invalid transaction', async () => {
      const run = new Run()
      run.purse.cancel = () => { }
      spy(run.purse)
      run.owner.sign = () => '123'
      run.deploy(class A { })
      await expect(run.sync()).to.be.rejected
      expect(run.purse.cancel.callCount).to.equal(1)
      const paidtx = await run.purse.pay.returnValues[0]
      expect(run.purse.cancel.args[0][0]).to.equal(paidtx)
    })

    // ------------------------------------------------------------------------

    it('called if sign fails during transaction publish', async () => {
      const run = new Run()
      run.purse.cancel = () => { }
      spy(run.purse)
      run.owner.sign = () => { throw new Error('abc') }
      const tx = new Run.Transaction()
      tx.update(() => run.deploy(class A { }))
      await expect(tx.publish()).to.be.rejected
      expect(run.purse.cancel.callCount).to.equal(1)
      const paidtx = await run.purse.pay.returnValues[0]
      expect(run.purse.cancel.args[0][0]).to.equal(paidtx)
    })

    // ------------------------------------------------------------------------

    it('called if sign returns an invalid transaction during transaction export', async () => {
      const run = new Run()
      run.purse.cancel = () => { }
      spy(run.purse)
      run.owner.sign = () => '123'
      const tx = new Run.Transaction()
      tx.update(() => run.deploy(class A { }))
      await expect(tx.export()).to.be.rejected
      expect(run.purse.cancel.callCount).to.equal(1)
      const paidtx = await run.purse.pay.returnValues[0]
      expect(run.purse.cancel.args[0][0]).to.equal(paidtx)
    })

    // ------------------------------------------------------------------------

    it('supports no cancel method', async () => {
      const run = new Run()
      run.purse.cancel = undefined
      run.owner.sign = () => { throw new Error('abc') }
      run.deploy(class A { })
      await expect(run.sync()).to.be.rejectedWith('abc')
    })
  })
})

// ------------------------------------------------------------------------------------------------

// TODO

/*
    // ------------------------------------------------------------------------

    it('adds to purse when satoshis decreased', async () => {
        const run = createHookedRun()
        class A extends Jig { f (satoshis) { this.satoshis = satoshis; return this }}
        const a = new A()
        expectAction(a, 'init', [], [], [a], [])
        await a.f(5000).sync()
        expectAction(a, 'f', [5000], [a], [a], [])
        const before = await run.purse.balance()
        await a.f(0).sync()
        expectAction(a, 'f', [0], [a], [a], [])
        const after = await run.purse.balance()
        expect(after - before > 3000).to.equal(true)
      })
      */

// TODO
/*
  describe('pay', () => {
    it('should be called correctly for create jig', async () => {
      const run = new Run()
      spy(run.purse)
      class Dragon extends Jig { }
      const dragon = new Dragon()
      await dragon.sync()
      expect(run.purse.pay.calledOnce).to.equal(true)
      expect(run.purse.pay.args[0].length).to.equal(2)
      expect(Array.isArray(run.purse.pay.args[0][1])).to.equal(true)
      const tx = new Transaction(run.purse.pay.args[0][0])
      expect(tx.inputs.length).to.equal(0)
      expect(tx.outputs.length).to.equal(3)
    })

    it('should be called correctly for update jig', async () => {
      const run = new Run()
      class Sword extends Jig { upgrade () { this.upgraded = true } }
      const sword = new Sword()
      await sword.sync()
      spy(run.purse)
      sword.upgrade()
      await sword.sync()
      expect(run.purse.pay.calledOnce).to.equal(true)
      expect(run.purse.pay.args[0].length).to.equal(2)
      expect(Array.isArray(run.purse.pay.args[0][1])).to.equal(true)
      const tx = new Transaction(run.purse.pay.args[0][0])
      expect(tx.inputs.length).to.equal(1)
      expect(tx.outputs.length).to.equal(2)
      expect(tx.inputs[0].script.toBuffer().length > 0).to.equal(true)
    })

    it('should pass paid transaction to sign()', async () => {
      const run = new Run()
      spy(run.purse)
      spy(run.owner)
      class Sword extends Jig { upgrade () { this.upgraded = true } }
      const sword = new Sword()
      await sword.sync()
      const hex = await run.purse.pay.returnValues[0]
      expect(run.owner.sign.calledOnce).to.equal(true)
      expect(run.owner.sign.args[0][0]).to.equal(hex)
    })

    // Errors stop tx broadcast and rollback
    // Backed jigs
    // Change from backed jigs
  })
  */
