/**
 * inventory.js
 *
 * Tests for lib/module/inventory.js
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const { PrivateKey } = require('bsv')
const Run = require('../env/run')
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
      class A extends Jig { send (to) { this.owner = to } }
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
      expect(run.inventory.code.length).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('does not add unsynced jigs', () => {
      const run = new Run()
      class A extends Jig { send (to) { this.owner = to } }
      new A() // eslint-disable-line
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run.inventory.code.length).to.equal(0)
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
  })
})

// ------------------------------------------------------------------------------------------------
