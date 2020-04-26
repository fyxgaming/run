/**
 * syncer.js
 *
 * Tests for lib/kernel/syncer.js
 */

const { stub, spy } = require('sinon')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Syncer
// ------------------------------------------------------------------------------------------------

describe('Syncer', () => {
  describe('sync', () => {
    it('should broadcast transactions', async () => {
      const run = new Run()
      spy(run.blockchain)
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expect(run.blockchain.broadcast.callCount).to.equal(1)
      run.deactivate()
    })

    it('should not force-fetch transactions just broadcasted', async () => {
      const run = new Run()
      spy(run.blockchain)
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const txid = a.location.slice(0, 64)
      expect(run.blockchain.fetch.calledWith(txid, false)).to.equal(true)
      run.deactivate()
    })

    it.only('should roll back code and jigs', async () => {
      const run = new Run()
      stub(run.purse, 'pay').callThrough().onThirdCall().returns()
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      await run.sync()
      a.set(1)
      await run.sync()
      // a.set(2)
      // await run.sync()
      // hookPay(run, false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
