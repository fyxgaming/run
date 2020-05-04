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
    it('test', () => {
      // TODO
    })
  })

  describe('broadcast', () => {
    it('should be called with finalized transaction', async () => {
      const run = new Run()
      // Hook purse.broadcast to check that the transaction we received looks correct
      run.purse.broadcast = hex => {
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
    })
  })
})

// ------------------------------------------------------------------------------------------------
