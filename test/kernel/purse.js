/**
 * purse.js
 *
 * Purse API tests that should work across all purse implementations.
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { spy } = require('sinon')
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
      // TODO
    })

    it('should be called after before actual broadcast', async () => {
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
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
