/**
 * lock.js
 *
 * Tests for custom owner locks
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig } = Run
const { LocalCache } = Run.module

// ------------------------------------------------------------------------------------------------
// Lock
// ------------------------------------------------------------------------------------------------

describe('Lock', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // ------------------------------------------------------------------------

  describe('create', () => {
    it.only('simple lock', async () => {
      const run = new Run()
      const L = await run.deploy(class L {
        script () { return '' }
        domain () { return 0 }
      }).sync()
      run.owner = { sign: () => { }, nextOwner: () => new L() }
      const A = run.deploy(class A { })
      await run.sync()
      function test (A) { expect(A.owner instanceof L).to.equal(true) }
      test(A)
      const A2 = await run.load(A.location)
      test(A2)
      run.cache = new LocalCache()
      const A3 = await run.load(A.location)
      test(A3)
    })

    it.only('simple lock local', async () => {
      const run = new Run()
      class L {
        script () { return '' }
        domain () { return 0 }
      }
      const CL = await run.deploy(L).sync()
      run.owner = { sign: () => { }, nextOwner: () => new L() }
      const A = run.deploy(class A { })
      await run.sync()
      function test (A) {
        expect(A.owner instanceof L).to.equal(false)
        expect(A.owner instanceof CL).to.equal(true)
      }
      test(A)
      const A2 = await run.load(A.location)
      test(A2)
      run.cache = new LocalCache()
      const A3 = await run.load(A.location)
      test(A3)
    })

    // Assign owner from inside jig

    // ------------------------------------------------------------------------

    it.skip('fails to deploy if lock class undeployed', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('updates jig with custom key', () => {

    })

    /*
    it('load non-standard owner', async () => {
      class CustomLock {
        script () { return new Uint8Array([1, 2, 3]) }
        domain () { return 1 }
      }
      class CustomOwner {
        nextOwner () { return new CustomLock() }
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

    it('copy non-standard owner to another jig', async () => {
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

    it('return a copy of owners to outside', async () => {
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

    it('return the original owner inside', async () => {
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

  // ------------------------------------------------------------------------
  // Method
  // ------------------------------------------------------------------------

  describe('Method', () => {
    it('cloned when assigned from another jig', async () => {
      const run = new Run()

      const CustomLock = await run.deploy(
        class CustomLock {
          script () { return '' }
          domain () { return 0 }
        }
      ).sync()

      class A extends Jig { init () { this.owner = new CustomLock() }}
      A.deps = { CustomLock }

      const a = new A()
      await a.sync()

      class B extends Jig {
        static f (a) { this.owner = a.owner; this.owner.n = 1 }
      }
      const CB = run.deploy(B)
      CB.f(a)
      await CB.sync()

      function test (a, B) {
        expect(typeof a.n).to.equal('undefined')
        expect(B.owner.n).to.equal(1)
      }

      test(a, CB)

      const a2 = await run.load(a.location)
      const CB2 = await run.load(CB.location)
      test(a2, CB2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      const CB3 = await run.load(CB.location)
      test(a3, CB3)
    })
  })
})

// ------------------------------------------------------------------------------------------------
