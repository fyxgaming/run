/**
 * syncer.js
 *
 * Tests for lib/kernel/syncer.js
 */

const { spy } = require('sinon')
const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
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

    it('sync with nothing queued returns immediately', async () => {
      const run = new Run()
      await run.sync()
      run.deploy(class A {})
      await run.sync()
      await run.sync()
    })
  })
})

// ------------------------------------------------------------------------------------------------
