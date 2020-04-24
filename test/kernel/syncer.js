/**
 * syncer.js
 */

const { spy } = require('sinon')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Syncer
// ------------------------------------------------------------------------------------------------

describe('Syncer', () => {
  describe('sync', () => {
    it.only('should broadcast transactions', async () => {
      const run = new Run()
      spy(run.blockchain)
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expect(run.blockchain.broadcast.callCount).to.equal(1)
      run.deactivate()
    })

    it.only('should not fetch transactions just broadcasted', async () => {
      const run = new Run()
      spy(run.blockchain)
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const txid = a.location.slice(0, 64)
      expect(run.blockchain.fetch.calledWith(txid)).to.equal(false)
      run.deactivate()
    })
  })
})

// ------------------------------------------------------------------------------------------------
