/**
 * syncer.js
 *
 * Tests for lib/kernel/syncer.js
 */

const { spy } = require('sinon')
const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { Run } = require('../env/config')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Syncer
// ------------------------------------------------------------------------------------------------

describe('Syncer', () => {
  afterEach(() => Run.instance && Run.instance.deactivate())

  describe('sync', () => {
    it('should broadcast transactions', async () => {
      const run = new Run()
      spy(run.blockchain)
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expect(run.blockchain.broadcast.callCount).to.equal(1)
    })

    it('should not force-fetch transactions just broadcasted', async () => {
      const run = new Run()
      spy(run.blockchain)
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const txid = a.location.slice(0, 64)
      const vout = parseInt(a.location.slice(66))
      expect(run.blockchain.spends.calledWith(txid, vout)).to.equal(true)
    })

    it('should not force-fetch transactions just broadcasted (payment channels)', async () => {
      const run = new Run()
      spy(run.blockchain)
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      await run.sync()

      run.transaction.begin()
      a.set(1)
      await run.transaction.pay()
      await run.transaction.sign()
      const tx = run.transaction.export()
      run.transaction.rollback()

      await run.transaction.import(tx)
      const jig = run.transaction.actions[0].target
      run.transaction.end()
      await jig.sync()

      const txid = jig.location.slice(0, 64)
      const vout = parseInt(jig.location.slice(66))
      expect(run.blockchain.spends.calledWith(txid, vout)).to.equal(true)
    })

    it('should not fetch transactions just broadcasted when forward = false', async () => {
      const run = new Run()
      spy(run.blockchain)
      class A extends Jig { }
      const a = new A()
      await a.sync({ forward: false })
      const txid = a.location.slice(0, 64)
      expect(run.blockchain.fetch.calledWith(txid, false)).to.equal(false)
    })

    it('should return immediately when nothing is queued', async () => {
      const run = new Run()
      await run.sync()
      run.deploy(class A {})
      await run.sync()
      await run.sync()
    })
  })
})

// ------------------------------------------------------------------------------------------------
