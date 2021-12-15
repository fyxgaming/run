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
  })

  // --------------------------------------------------------------------------
  // broadcast
  // --------------------------------------------------------------------------

  describe('broadcast', () => {
    it('called with tx', async () => {
      const run = new Run()
      let broadcasted = null
      run.purse.broadcast = async rawtx => { broadcasted = rawtx }
      class A { }
      run.deploy(A)
      await run.sync()
      expect(new bsv.Transaction(broadcasted).hash).to.equal(A.location.slice(0, 64))
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
    it.skip('called if sign fails', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('called if sign returns an invalid transaction', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('called if transaction is rolled back', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('supports no cancel method', () => {
      // TODO
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

/*
    it('long mempool chain for purse', async () => {
      const run = createHookedRun()
      class A extends Jig { }
      for (let i = 0; i < 100; i++) { new A() } // eslint-disable-line
      await run.sync()
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

    // Run.transaction.pay() calls pay
    // Calls pay more than once?
    // Errors stop tx broadcast and rollback
    // Backed jigs
    // Change from backed jigs
  })

  describe('broadcast', () => {
    it('should be called with finalized transaction', async () => {
      const run = new Run()
      // Hook purse.broadcast to check that the transaction we received looks correct
      run.purse.broadcast = hex => {
        expect(typeof hex).to.equal('string')
        const tx = new Transaction(hex)
        expect(tx.inputs.length >= 1).to.equal(true)
        expect(tx.outputs.length >= 4).to.equal(true)
      }
      spy(run.purse)
      class Dragon extends Jig { }
      const dragon = new Dragon()
      await dragon.sync()
    })

    it('should be called before actual broadcast', async () => {
      const run = new Run()
      // Hook purse.broadcast to check that we are called after sign() and before broadcast()
      run.purse.broadcast = tx => {
        return new Promise((resolve, reject) => {
          expect(run.owner.sign.called).to.equal(true)
          expect(run.blockchain.broadcast.called).to.equal(false)
          resolve()
        })
      }
      // Listen for calls to our modules
      spy(run.purse)
      spy(run.blockchain)
      spy(run.owner)
      // Create and sync a jig
      class Dragon extends Jig { }
      const dragon = new Dragon()
      await dragon.sync()
      // Check that our broadcast was called
      expect(run.purse.broadcast.called).to.equal(true)
      expect(run.blockchain.broadcast.called).to.equal(true)
      run.deactivate()
    })

    it('should log but still broadcast tx if errors are thrown', async () => {
      const logger = spy({ error: () => {} })
      const run = new Run({ logger })
      run.purse.broadcast = async tx => { throw new Error('uh oh') }
      class Dragon extends Jig { }
      const dragon = new Dragon()
      expect(logger.error.called).to.equal(false)
      await dragon.sync()
      expect(logger.error.called).to.equal(true)
      run.deactivate()
    })

    it('should be called for imported transactions', async () => {
      const run = new Run()
      run.purse.broadcast = () => { }
      spy(run.purse)
      class Dragon extends Jig { }
      run.transaction.begin()
      new Dragon() // eslint-disable-line
      const tx = run.transaction.export()
      run.transaction.rollback()
      expect(run.purse.broadcast.called).to.equal(false)
      await run.transaction.import(new Transaction(tx.toString('hex')))
      await run.transaction.pay()
      await run.transaction.sign()
      run.transaction.end()
      await run.sync()
      expect(run.purse.broadcast.called).to.equal(true)
      run.deactivate()
    })
  })
  */
