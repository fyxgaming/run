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

  // --------------------------------------------------------------------------
  // Create
  // --------------------------------------------------------------------------

  describe('Create', () => {
    it('simple lock deployed', async () => {
      const run = new Run()
      const L = await run.deploy(class L {
        script () { return '' }
        domain () { return 0 }
      }).sync()
      run.owner = { sign: x => x, nextOwner: () => new L() }
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

    // ------------------------------------------------------------------------

    it('simple lock deploying', async () => {
      const run = new Run()
      const L = run.deploy(class L {
        script () { return '' }
        domain () { return 0 }
      })
      run.owner = { sign: x => x, nextOwner: () => new L() }
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

    // ------------------------------------------------------------------------

    it('simple lock local', async () => {
      const run = new Run()
      class L {
        script () { return '' }
        domain () { return 0 }
      }
      const CL = await run.deploy(L).sync()
      run.owner = { sign: x => x, nextOwner: () => new L() }
      const A = run.deploy(class A { })
      await run.sync()
      function test (A) {
        expect(A.owner instanceof L).to.equal(true)
        expect(A.owner instanceof CL).to.equal(true)
      }
      test(A)
      const A2 = await run.load(A.location)
      test(A2)
      run.cache = new LocalCache()
      const A3 = await run.load(A.location)
      test(A3)
    })

    // ------------------------------------------------------------------------

    it('simple lock undeployed', async () => {
      const run = new Run()
      class L {
        script () { return '' }
        domain () { return 0 }
      }
      run.owner = { sign: x => x, nextOwner: () => new L() }
      const A = run.deploy(class A { })
      await run.sync()
      const CL = Run.install(L)
      function test (A) {
        expect(A.owner instanceof CL).to.equal(true)
        expect(A.owner.constructor.owner instanceof CL).to.equal(true)
      }
      test(A)
      const A2 = await run.load(A.location)
      test(A2)
      run.cache = new LocalCache()
      const A3 = await run.load(A.location)
      test(A3)
    })

    // ------------------------------------------------------------------------

    it.skip('assign lock deployed in transaction', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('newly deployed lock goes into inventory', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('script() reads a jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('script() reads an deploying jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('script() reads an inner jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('script() reads an deploying inner jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('assigns sandboxed owner', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if nextOwner() returns non-lock', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if script() updates a jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if script() creates a jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if script() deletes a jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if script() auths a jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if nextOwner() for lock is undeployed', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Method
  // --------------------------------------------------------------------------

  describe('Method', () => {
    it.skip('assign owner from inside jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

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

    // ------------------------------------------------------------------------

    it.skip('updates jig with custom key', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('updates downstream jig with custom key', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Upgrade
  // --------------------------------------------------------------------------

  describe('Upgrade', () => {
    it.skip('upgrade and unify lock owner', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('unifies new owners with existing locks', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('unifies inner refs with inputs', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('unifies inner refs with reads', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if create lock with time travel', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Auth
  // --------------------------------------------------------------------------

  describe('Auth', () => {
    it.skip('auth lock assigned as owner', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Destroy
  // --------------------------------------------------------------------------

  describe('Destroy', () => {
    it.skip('assign destroyed lock', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
