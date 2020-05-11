/**
 * purse.js
 *
 * Purse API tests that should work across all purse implementations.
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { spy } = require('sinon')
const { Transaction } = require('bsv')
const { Run } = require('../env/config')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Purse tests
// ------------------------------------------------------------------------------------------------

describe('Purse', () => {
  describe('pay', () => {
    it('should be passed a partial transaction and spent for create', async () => {
      const run = new Run()
      spy(run.purse)
      class Dragon extends Jig { }
      const dragon = new Dragon()
      await dragon.sync()
      expect(run.purse.pay.calledOnce).to.equal(true)
      expect(run.purse.pay.args[0].length).to.equal(2)
      expect(run.purse.pay.args[0][1]).to.equal(0)
      const tx = new Transaction(run.purse.pay.args[0][0])
      expect(tx.inputs.length).to.equal(0)
      expect(tx.outputs.length).to.equal(3)
    })

    it('should be passed a partial transaction with placeholders and spent for update', async () => {
      const run = new Run()
      class Sword extends Jig { upgrade () { this.upgraded = true } }
      const sword = new Sword()
      await sword.sync()
      spy(run.purse)
      sword.upgrade()
      await sword.sync()
      expect(run.purse.pay.calledOnce).to.equal(true)
      expect(run.purse.pay.args[0].length).to.equal(2)
      expect(run.purse.pay.args[0][1]).to.equal(546)
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
})

// ------------------------------------------------------------------------------------------------
