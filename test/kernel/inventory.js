/**
 * inventory.js
 *
 * Tests for lib/kernel/inventory.js
 */

const bsv = require('bsv')
const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('../env/config')
const { Jig } = Run
const { hookPay } = require('../env/helpers')

// ------------------------------------------------------------------------------------------------
// Inventory
// ------------------------------------------------------------------------------------------------

describe('Inventory', () => {
  // Todo: Tokens
  // Todo: sync

  describe('code', () => {
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
      hookPay(run, false)
      class A {}
      run.deploy(A).catch(() => {})
      expect(run.inventory.code.length).to.equal(1)
      expect(run.inventory.code[0].name).to.equal('A')
      expect(run.inventory.code[0].origin).to.equal(A.origin)
      expect(run.inventory.code[0].location).to.equal(A.location)
      await expect(run.sync()).to.be.rejected
      expect(run.inventory.code.length).to.equal(0)
    })
  })

  describe('jigs', () => {
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
      b.send(new bsv.PrivateKey().publicKey.toString())
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
      const run2 = new Run({ owner: run.owner.privkey, blockchain: run.blockchain })
      const c = new A()
      await run2.sync()
      expect(run2.inventory.jigs).to.deep.equal([c, a, b])
    })

    it('should remove jigs when fail to post', async () => {
      const run = new Run()
      hookPay(run, false)
      class A extends Jig {}
      const a = new A()
      expect(run.inventory.jigs).to.deep.equal([a])
      expect(run.inventory.code.length).to.equal(1)
      await expect(run.sync()).to.be.rejectedWith('tx has no inputs')
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run.inventory.code.length).to.equal(0)
    })

    it('should support filtering jigs by class', async () => {
      const run = new Run()
      class A extends Jig {}
      class B extends Jig {}
      const a = new A()
      new B() // eslint-disable-line
      expect(run.inventory.jigs.find(x => x instanceof A)).to.deep.equal(a)
    })

    it('should support getting jigs without private key', async () => {
      const run = new Run()
      class A extends Jig {}
      const a = await new A().sync()
      const run2 = new Run({ blockchain: run.blockchain, owner: run.owner.next() })
      await run2.sync()
      expect(run2.owner.privkey).to.equal(undefined)
      expect(run2.inventory.jigs).to.deep.equal([a])
    })
  })
})

// ------------------------------------------------------------------------------------------------
