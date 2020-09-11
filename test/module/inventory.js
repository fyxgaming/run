/**
 * inventory.js
 *
 * Tests for lib/module/inventory.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { payFor } = require('../env/misc')
const { expect } = require('chai')
const { stub } = require('sinon')
const { PrivateKey, Transaction } = require('bsv')
const Run = require('../env/run')
const { LocalCache } = require('../../lib/run')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Inventory
// ------------------------------------------------------------------------------------------------

describe('Inventory', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // update
  // --------------------------------------------------------------------------

  describe('update', () => {
    it('adds synced jigs', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expect(run.inventory.jigs).to.deep.equal([a])
      expect(run.inventory.code).to.deep.equal([run.install(A)])
    })

    // ------------------------------------------------------------------------

    it('does not add unowned jigs', () => {
      const run = new Run()
      class A extends Jig { init (owner) { this.owner = owner } }
      new A(new PrivateKey().publicKey.toString()) // eslint-disable-line
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run.inventory.code.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('does not add unowned jigs with locks', () => {
      const run = new Run()
      class A extends Jig { init (owner) { this.owner = owner } }
      class CustomLock {
        script () { return new Uint8Array() }
        domain () { return 0 }
      }
      new A(new CustomLock()) // eslint-disable-line
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run.inventory.code.length).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('removes jigs sent away', async () => {
      const run = new Run()
      class A extends Jig { send (to) { this.owner = to } }
      const a = new A()
      await a.sync()
      expect(run.inventory.jigs.length).to.equal(1)
      a.send(new PrivateKey().publicKey.toString())
      await a.sync()
      expect(run.inventory.jigs.length).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('add unsynced jigs', () => {
      const run = new Run()
      class A extends Jig { send (to) { this.owner = to } }
      new A() // eslint-disable-line
      expect(run.inventory.jigs.length).to.equal(1)
      expect(run.inventory.code.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('removes if fail to post', async () => {
      const run = new Run()
      class A extends Jig { send (to) { this.owner = to } }
      const a = new A()
      stub(run.purse, 'pay').throws()
      await expect(a.sync()).to.be.rejected
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run.inventory.code.length).to.equal(0)
    })
  })

  // --------------------------------------------------------------------------
  // sync
  // --------------------------------------------------------------------------

  describe('sync', () => {
    it('adds owned jigs', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const run2 = new Run({ owner: run.owner })
      await run2.inventory.sync()
      expect(run2.inventory.jigs.length).to.equal(1)
      expect(run2.inventory.code.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('removes unowned jigs', async () => {
      const run = new Run()
      class A extends Jig { send (to) { this.owner = to } }
      const a = new A()
      await a.sync()
      const run2 = new Run({ owner: run.owner })
      const a2 = await run2.load(a.location)
      a2.send(new PrivateKey().publicKey.toString())
      await a2.sync()
      expect(run.inventory.jigs.length).to.equal(1)
      await run.inventory.sync()
      expect(run.inventory.jigs.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('replaces with newer jig', async () => {
      const run = new Run()
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      await a.sync()
      const run2 = new Run({ owner: run.owner })
      const a2 = await run2.load(a.location)
      a2.f()
      await a2.sync()
      expect(run.inventory.jigs.length).to.equal(1)
      await run.inventory.sync()
      expect(run.inventory.jigs.length).to.equal(1)
      expect(run.inventory.jigs[0].location).to.equal(a2.location)
    })

    // ------------------------------------------------------------------------

    it('dedups syncs', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const start = new Date()
      await run.inventory.sync()
      const time = new Date() - start
      const promises = []
      const start2 = new Date()
      await run.inventory.sync()
      for (let i = 0; i < 1000; i++) {
        promises.push(run.inventory.sync())
      }
      await Promise.all(promises)
      const time2 = new Date() - start2
      expect(Math.abs(time2 - time) < 50).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('non-jig utxo', async () => {
      const run = new Run()
      const utxos = await run.blockchain.utxos(run.purse.address)
      const tx = await payFor(new Transaction().from(utxos).to(run.owner.address, 1000), run)
      await run.blockchain.broadcast(tx.toString('hex'))
      await run.inventory.sync()
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run.inventory.code.length).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('dedup sync failure', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      stub(run.blockchain, 'utxos').throws()
      const promise1 = run.inventory.sync()
      const promise2 = run.inventory.sync()
      await expect(promise1).to.be.rejected
      await expect(promise2).to.be.rejected
    })
  })

  // --------------------------------------------------------------------------
  // load
  // --------------------------------------------------------------------------

  describe('load', () => {
    it('load cached adds to inventory', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const run2 = new Run({ owner: run.owner })
      await run2.load(a.location)
      expect(run2.inventory.jigs.length).to.equal(1)
      expect(run2.inventory.code.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('load via replay adds to inventory', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const run2 = new Run({ owner: run.owner })
      run2.cache = new LocalCache()
      await run2.load(a.location)
      expect(run2.inventory.jigs.length).to.equal(1)
      expect(run2.inventory.code.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('load old state keeps newer', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      a.auth()
      await a.sync()
      const run2 = new Run({ owner: run.owner })
      await run2.inventory.sync()
      expect(run2.inventory.jigs.length).to.equal(1)
      expect(run2.inventory.code.length).to.equal(1)
      const a2 = await run2.load(a.origin)
      expect(run2.inventory.jigs.length).to.equal(1)
      expect(run2.inventory.code.length).to.equal(1)
      expect(run2.inventory.jigs[0]).not.to.equal(a2)
    })

    // ------------------------------------------------------------------------

    it('sync send removes', async () => {
      const run = new Run()
      class A extends Jig { send (to) { this.owner = to } }
      const a = new A()
      a.send(new PrivateKey().publicKey.toString())
      await a.sync()
      const run2 = new Run({ owner: run.owner })
      const a2 = await run2.load(a.origin)
      expect(run2.inventory.jigs.length).to.equal(1)
      expect(run2.inventory.code.length).to.equal(1)
      await a2.sync()
      expect(run2.inventory.jigs.length).to.equal(0)
      expect(run2.inventory.code.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('sync receive adds', async () => {
      const run = new Run()
      const run2 = new Run()
      run.activate()
      class A extends Jig { send (to) { this.owner = to } }
      const a = new A()
      a.send(run2.owner.address)
      await a.sync()
      run2.activate()
      const a2 = await run2.load(a.origin)
      expect(run2.inventory.jigs.length).to.equal(0)
      expect(run2.inventory.code.length).to.equal(0)
      await a2.sync()
      expect(run2.inventory.jigs.length).to.equal(1)
      expect(run2.inventory.code.length).to.equal(0)
    })
  })

  // --------------------------------------------------------------------------
  // import
  // --------------------------------------------------------------------------

  describe('import', () => {
    it('adds to inventory', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const run2 = new Run({ owner: run.owner })
      const rawtx = await run2.blockchain.fetch(a.location.slice(0, 64))
      await run2.import(rawtx)
      expect(run2.inventory.jigs.length).to.equal(1)
      expect(run2.inventory.code.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('rollback removes from inventory', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const run2 = new Run({ owner: run.owner })
      const rawtx = await run2.blockchain.fetch(a.location.slice(0, 64))
      const transaction = await run2.import(rawtx)
      transaction.rollback()
      expect(run2.inventory.jigs.length).to.equal(0)
      expect(run2.inventory.code.length).to.equal(0)
    })
  })

  // --------------------------------------------------------------------------
  // Misc
  // --------------------------------------------------------------------------

  describe('Misc', () => {
    it('new owner new inventory', () => {
      const run = new Run()
      const inventory = run.inventory
      run.owner = new PrivateKey()
      expect(run.inventory).not.to.equal(inventory)
    })

    // ------------------------------------------------------------------------

    it('rollback in transaction', () => {
      const run = new Run()
      expect(() => run.transaction(() => {
        class A extends Jig { }
        new A() // eslint-disable-line
        expect(run.inventory.jigs.length).to.equal(1)
        expect(run.inventory.code.length).to.equal(1)
        throw new Error()
      })).to.throw()
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run.inventory.code.length).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('send in transaction', async () => {
      const run = new Run()
      class A extends Jig { send (to) { this.owner = to } }
      const a = new A()
      await run.sync()
      await run.inventory.sync()
      run.transaction(() => {
        expect(run.inventory.jigs.length).to.equal(1)
        expect(run.inventory.code.length).to.equal(1)
        a.send(new PrivateKey().publicKey.toString())
        expect(run.inventory.jigs.length).to.equal(0)
        expect(run.inventory.code.length).to.equal(1)
      })
    })

    // ------------------------------------------------------------------------

    it('receive in transaction', async () => {
      const run = new Run()
      class A extends Jig { send (to) { this.owner = to } }
      const a = new A()
      await run.sync()
      const run2 = new Run()
      await run2.inventory.sync()
      run2.transaction(() => {
        expect(run2.inventory.jigs.length).to.equal(0)
        expect(run2.inventory.code.length).to.equal(0)
        a.send(run2.owner.address)
        expect(run2.inventory.jigs.length).to.equal(1)
        expect(run2.inventory.code.length).to.equal(0)
      })
    })

    // ------------------------------------------------------------------------

    it('send after switch run instances', async () => {
      const run = new Run()
      class A extends Jig { send (to) { this.owner = to } }
      const a = new A()
      await run.sync()
      const run2 = new Run()
      expect(run.inventory.jigs.length).to.equal(1)
      expect(run.inventory.code.length).to.equal(1)
      const transaction = new Run.Transaction(() => a.send(run2.owner.pubkey))
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run.inventory.code.length).to.equal(1)
      transaction.rollback()
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run.inventory.code.length).to.equal(1)
      await run.inventory.sync()
      expect(run.inventory.jigs.length).to.equal(1)
      expect(run.inventory.code.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('supports non-async nextOwner', async () => {
      const owner = {
        nextOwner () { return new PrivateKey().toAddress().toString() },
        async sign () { }
      }
      const run = new Run({ owner })
      await run.inventory.sync()
    })

    // ------------------------------------------------------------------------

    it('disabled if nextOwner fails', async () => {
      const run0 = new Run()
      stub(run0.owner, 'nextOwner').throws()
      const run = new Run({ owner: run0.owner })
      await run.inventory.sync()
      run.owner.nextOwner.restore()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run.inventory.code.length).to.equal(0)
    })
  })
})

// ------------------------------------------------------------------------------------------------
