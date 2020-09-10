/**
 * inventory.js
 *
 * Tests for lib/kernel/inventory.js
 */

const { PrivateKey } = require('bsv')
const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { stub } = require('sinon')
const { Run } = require('../env/config')
const { Jig, Token, Viewer } = Run

// ------------------------------------------------------------------------------------------------
// Inventory
// ------------------------------------------------------------------------------------------------

/*
it('should support searching owner for an uninstalled class', async () => {
  const run = createHookedRun()
  class A extends Jig { }
  class B extends Jig { }
  const a = new A() // eslint-disable-line
  await a.sync()
  run.inventory.jigs.find(jig => jig instanceof B)
})
*/

describe('Inventory', () => {
  describe('load', () => {
    it('should add our loaded unspent resources', async () => {
      const run = new Run()
      class A extends Jig {}
      const a = new A()
      await a.sync()
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain, owner: run.owner })
      const a2 = await run2.load(a.location)
      expect(run2.inventory.jigs).to.deep.equal([a2])
    })

    it('should not add other peoples loaded unspent resources', async () => {
      const run = new Run()
      class A extends Jig {}
      const a = new A()
      await a.sync()
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(a.location)
      expect(run2.inventory.jigs.length).to.equal(0)
    })

    // If spend is missing
    // If state cache, don't expect

    it('should not add resources without sync', async () => {
      // Create a jig and code
      const run = new Run()
      class A extends Jig {}
      const a = new A()
      await a.sync()

      // Create a new run, and check that standard loads do not have these jigs
      const run2 = new Run({ owner: run.owner })
      expect(run2.inventory.jigs.length).to.equal(0)
      expect(run2.inventory.code.length).to.equal(0)
      await run2.load(a.location)
      expect(run2.inventory.jigs.length).to.equal(0)
      expect(run2.inventory.code.length).to.equal(0)

      // Then sync, and see that we have them, because we know they're up-to-date
      await run2.sync()
      expect(run2.inventory.jigs.length).to.equal(1)
      expect(run2.inventory.code.length).to.equal(1)
    })

    it.skip('should load synced resources to inventory', () => {
      // TODO: Check both jigs and code get synced once we know
      // We might be able to add to this if we know a jig is latest during loading
    })
  })

  // What happens when fail to spend, due to spent somewhere else? Remove jig
  // Resources test

  describe('sync', () => {
    it('should update with code deployed', async () => {
      const run = new Run()
      class A extends Jig { set (x) { this.x = x }}
      run.deploy(A)
      expect(run.inventory.code.length).to.equal(1)
      expect(run.inventory.code[0].name).to.equal('A')
      expect(run.inventory.code[0].origin).to.equal(A.origin)
      expect(run.inventory.code[0].location).to.equal(A.location)
      await run.sync()
      expect(run.inventory.code.length).to.equal(1)
      expect(run.inventory.code[0].name).to.equal('A')
      expect(run.inventory.code[0].origin).to.equal(A.origin)
      expect(run.inventory.code[0].location).to.equal(A.location)
      const a = new A()
      a.set(function add (a, b) { return a + b })
      expect(run.inventory.code.length).to.equal(2)
      await run.sync()
      expect(run.inventory.code.length).to.equal(2)
    })

    it('should remove if code fails to post', async () => {
      const run = new Run()
      stub(run.purse, 'pay').returns()
      class A {}
      run.deploy(A).catch(() => {})
      expect(run.inventory.code.length).to.equal(1)
      expect(run.inventory.code[0].name).to.equal('A')
      expect(run.inventory.code[0].origin).to.equal(A.origin)
      expect(run.inventory.code[0].location).to.equal(A.location)
      await expect(run.sync()).to.be.rejected
      expect(run.inventory.code.length).to.equal(0)
    })

    it('should update with jigs created', async () => {
      const run = new Run()
      class A extends Jig { createB () { return new B() }}
      class B extends Jig { send (to) { this.owner = to } }
      A.deps = { B }
      const a = new A()
      expect(run.inventory.jigs).to.deep.equal([a])
      const b = a.createB()
      expect(run.inventory.jigs).to.deep.equal([a, b])
      await run.sync()
      expect(run.inventory.jigs).to.deep.equal([a, b])
      b.send(new PrivateKey().publicKey.toString())
      expect(run.inventory.jigs).to.deep.equal([a])
      await run.sync()
      expect(run.inventory.jigs).to.deep.equal([a])
    })

    it('should update jigs on sync', async () => {
      const run = new Run()
      class A extends Jig { createB () { return new B() }}
      class B extends Jig { }
      A.deps = { B }
      const a = new A()
      const b = a.createB()
      expect(run.inventory.jigs).to.deep.equal([a, b])
      await run.sync()
      const run2 = new Run({ owner: run.owner.privkey })
      const c = new A()
      await run2.sync()
      expect(run2.inventory.jigs).to.deep.equal([c, a, b])
    })

    //  Not a sync test...
    it('should contain resources created before sync', async () => {
      const run = new Run()
      class A extends Jig {}
      const a = new A()
      expect(run.inventory.jigs).to.deep.equal([a])
      expect(run.inventory.code).to.deep.equal([a.constructor])
    })

    it('should add received resources before sync', async () => {
      const run = new Run()
      class A extends Token { }
      const a = new A(100)
      await a.sync()
      const run2 = new Run()
      a.send(run2.owner.address)
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run2.inventory.jigs).to.deep.equal([a])
      await expect(a.sync()).to.be.rejected
    })

    it('should remove resources that fail to post', async () => {
      const run = new Run()
      stub(run.purse, 'pay').returns()
      class A extends Jig {}
      const a = new A()
      await expect(a.sync()).to.be.rejected
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run.inventory.code.length).to.equal(0)
    })

    it('should remove deployed resources that are no longer ours', async () => {
      // Create two runs, each with the same owner
      const run = new Run()
      const run2 = new Run({ owner: run.owner })

      // Create a jig on run1
      run.activate()
      class A extends Jig { send (to) { this.owner = to } }
      const a = new A()
      await a.sync()

      // Transfer it away on run2
      run2.activate()
      const a2 = await run2.load(a.location)
      a2.send(new PrivateKey().publicKey.toString())
      await a2.sync()

      // Reactive run1, check we have the jig, sync, then check that we don't
      run.activate()
      expect(run.inventory.jigs).to.deep.equal([a])
      await run.sync()
      expect(run.inventory.jigs.length).to.equal(0)
    })

    it('should replace deployed resources that have updates', async () => {
      const run = new Run()
      class A extends Jig { set (n) { this.n = 1 } }
      const a = new A()
      await a.sync()

      const run2 = new Run({ owner: run.owner })
      const a2 = await run2.load(a.location)
      a2.set(1)
      await a2.sync()

      run.activate()
      expect(run.inventory.jigs[0].n).to.equal(undefined)
      await run.sync()
      expect(run.inventory.jigs[0].n).to.equal(1)
    })
  })

  describe('flows', () => {
    it('should sync jigs without private key', async () => {
      const run = new Run()
      class A extends Jig {}
      const a = new A()
      await a.sync()
      const run2 = new Run({ blockchain: run.blockchain, owner: run.owner.address })
      await run2.sync()
      expect(run2.owner instanceof Viewer).to.equal(true)
      expect(run2.owner.privkey).to.equal(undefined)
      expect(run2.inventory.jigs).to.deep.equal([a])
      expect(run2.inventory.code).to.deep.equal([a.constructor])
    })

    it('should support filtering jigs by class', async () => {
      const run = new Run()
      class A extends Jig {}
      class B extends Jig {}
      const a = new A()
      new B() // eslint-disable-line
      expect(run.inventory.jigs.length).to.equal(2)
      expect(run.inventory.jigs.find(x => x instanceof A)).to.deep.equal(a)
    })
  })
})

// ------------------------------------------------------------------------------------------------
