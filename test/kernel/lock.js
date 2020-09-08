/**
 * lock.js
 *
 * Tests for custom owner locks
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')

// ------------------------------------------------------------------------------------------------
// Lock
// ------------------------------------------------------------------------------------------------

describe('Lock', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // ------------------------------------------------------------------------

  describe('deploy', () => {
    it.skip('deploys with custom lock', async () => {
      // TODO: Use custom owner

      const run = new Run()

      class L {
        script () { return new Uint8Array() }
        domain () { return 0 }
      }
      run.deploy()

      class A {
        static send (to) { this.owner = to }
      }

      A.send = () => { throw new Error('Must call methods on jigs') }
      const CA = run.deploy(A)
      run.deploy(CA)
      await run.sync()
      CA.send(new L())
      await CA.sync()
      expect(A.location.startsWith('commit://'))
    })

    // ------------------------------------------------------------------------

    it.skip('fails to deploy if lock class undeployed', () => {
      // TODO
    })

    /*
    it('should load non-standard owner', async () => {
      class CustomLock {
        script () { return new Uint8Array([1, 2, 3]) }
        domain () { return 1 }
      }
      class CustomOwner {
        owner () { return new CustomLock() }
        async sign (rawtx) { return rawtx }
      }
      const run = new Run({ owner: new CustomOwner() })
      class A extends Jig { }
      const a = new A()
      await a.sync()
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(a.location)
    })

    it('should support copying non-standard owner to another jig', async () => {
      createHookedRun()
      class CustomLock {
        script () { return new Uint8Array([1, 2, 3]) }
        domain () { return 1 }
      }
      class A extends Jig { init () { this.owner = new CustomLock() } }
      A.deps = { CustomLock }
      class B extends Jig { init (a) { this.owner = a.owner } }
      expect(() => new B(new A())).not.to.throw()
    })

    it('should return a copy of owners to outside', async () => {
      createHookedRun()
      class CustomLock {
        constructor (n) { this.n = n }
        script () { return new Uint8Array([this.n]) }
        domain () { return 1 }
      }
      class A extends Jig { init (n) { this.owner = new CustomLock(n) } }
      A.deps = { CustomLock }
      class B extends Jig {
        init (a, n) { this.owner = a.owner; this.owner.n = n }
      }
      const a = new A(1)
      const b = new B(a, 2)
      expect(a.owner.n).to.equal(1)
      expect(b.owner.n).to.equal(2)
    })

    it('should return the original owner inside', async () => {
      createHookedRun()
      class A extends Jig {
        init (owner) { this.owner = owner }
        copyOwner () { this.owner2 = this.owner; this.owner2.n = 2 }
      }
      class CustomLock {
        constructor () { this.n = 1 }
        script () { return new Uint8Array([this.n]) }
        domain () { return 1 }
      }
      const a = new A(new CustomLock())
      a.copyOwner()
      expect(a.owner).to.deep.equal(a.owner2)
      await expect(a.sync()).to.be.rejected
    })
    */
  })
})

// ------------------------------------------------------------------------------------------------
