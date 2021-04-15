/**
 * code.js
 *
 * Tests for lib/code.js
 */

const { describe, it, beforeEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { Run, COVER } = require('../../test/env/config')
const { unmangle } = require('../../test/env/unmangle')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Code tests
// ------------------------------------------------------------------------------------------------

describe('Code', () => {
  const run = new Run()
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())

  describe('misc', () => {
    it('should pass instanceof checks', async () => {
      class A { }
      const A2 = await run.load(await run.deploy(A))
      expect(new A()).to.be.instanceOf(A)
      expect(new A()).not.to.be.instanceOf(A2)
      expect(new A2()).not.to.be.instanceOf(A)
      expect(new A2()).to.be.instanceOf(A2)
    })
  })

  describe('activate', () => {
    it.skip('should support activating different network', async () => {
      if (Run.instance) Run.instance.deactivate()
      const run = new Run() // Create a new run to have a new code cache
      class A { }
      await run.deploy(A)
      expect(A.location.length).to.equal(67)
      expect(A.location).to.equal(A.locationMocknet)
      expect(A.owner).to.equal(run.owner.address)
      expect(A.ownerMocknet).to.equal(run.owner.address)
      const run2 = new Run({ network: 'test' })
      expect(A.location).to.equal(undefined)
      expect(A.locationMocknet.length).to.equal(67)
      expect(A.owner).to.equal(undefined)
      expect(A.ownerMocknet).to.equal(run.owner.address)
      await run2.deploy(A)
      expect(A.location.length).to.equal(67)
      expect(A.location).to.equal(A.locationTestnet)
      expect(A.owner).to.equal(A.ownerTestnet)
      run.activate()
      expect(A.location.length).to.equal(67)
      expect(A.location).to.equal(A.locationMocknet)
      expect(A.owner).to.equal(A.ownerMocknet)
      expect(unmangle(run.code)._installs.size).to.equal(COVER ? 7 : 8)
    })

    it.skip('should set correct owner for different networks', async () => {
      class A { }
      class B extends Jig { init () { if (this.owner !== A.owner) throw new Error() } }
      B.deps = { A }
      for (const network of ['test', 'mock']) {
        const run = new Run({ network })
        run.transaction.begin()
        run.deploy(A)
        run.deploy(B)
        run.transaction.end()
        await run.sync()
        const b = new B()
        await b.sync()
        run.deactivate()
        const run2 = new Run({ network, owner: run.owner.privkey })
        await run2.sync()
      }
    })
  })
})

// ------------------------------------------------------------------------------------------------
