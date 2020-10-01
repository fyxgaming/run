/**
 * upgradable.js
 *
 * Tests for upgradable functionality on code
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { expectTx } = require('../env/misc')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Upgradable
// ------------------------------------------------------------------------------------------------

describe('Upgradable', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // Deploy
  // --------------------------------------------------------------------------

  describe('deploy', () => {
    it('upgradable', async () => {
      const run = new Run()

      class A { }
      A.upgradable = true
      const CA = run.deploy(A)
      await CA.sync()

      class B { }
      CA.upgrade(B)
      await CA.sync()

      await run.load(CA.location)

      run.cache = new LocalCache()
      await run.load(CA.location)
    })

    // ------------------------------------------------------------------------

    it('upgradable by default', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      class B { }
      CA.upgrade(B)
      await CA.sync()

      await run.load(CA.location)

      run.cache = new LocalCache()
      await run.load(CA.location)
    })

    // ------------------------------------------------------------------------

    it('non-upgradable', async () => {
      const run = new Run()
      class A { }
      A.upgradable = false
      const CA = run.deploy(A)
      await CA.sync()
      function test (CA) {
        expect(() => CA.upgrade(class B { })).to.throw('A is non-upgradable')
      }
      test(CA)
      const CA2 = await run.load(CA.location)
      test(CA2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('throws if upgradable is invalid', () => {
      const run = new Run()
      class A { }
      A.upgradable = null
      expect(() => run.deploy(A)).to.throw('Invalid upgradable option')
      A.upgradable = 1
      expect(() => run.deploy(A)).to.throw('Invalid upgradable option')
      A.upgradable = undefined
      expect(() => run.deploy(A)).to.throw('Invalid upgradable option')
      A.upgradable = function upgradable () { }
      expect(() => run.deploy(A)).to.throw('Invalid upgradable option')
    })
  })

  // --------------------------------------------------------------------------
  // Upgrade
  // --------------------------------------------------------------------------

  describe('upgrade', () => {
    it('upgradable', async () => {
      const run = new Run()
      class A { }
      A.upgradable = true
      const CA = run.deploy(A)
      CA.upgrade(class B { })
      CA.upgrade(class C { })
      await CA.sync()
      await run.load(CA.location)
      run.cache = new LocalCache()
      await run.load(CA.location)
    })

    // ------------------------------------------------------------------------

    it.skip('throws if non-upgradable', async () => {
      const run = new Run()

      class O { }
      const CO = run.deploy(O)
      await CO.sync()

      class A { }
      A.sealed = false
      const CA = run.deploy(A)
      await CA.sync()

      expectTx({
        nin: 1,
        nref: 1,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'UPGRADE',
            data: [
              { $jig: 0 },
              'class B extends A { }',
              {
                deps: { A: { $jig: 1 } }
              }
            ]
          }
        ]
      })

      class B extends CA { }
      CO.upgrade(B)
      await CO.sync()

      await run.load(CO.location)

      run.cache = new LocalCache()
      await run.load(CO.location)
    })

    // ------------------------------------------------------------------------

    it.skip('upgrad with non-upgradable parent', async () => {
      const run = new Run()

      class A { }
      class B extends A { }
      const CB = run.deploy(B)
      await CB.sync()

      class O { }
      const CO = run.deploy(O)
      await CO.sync()

      expectTx({
        nin: 3,
        nref: 0,
        nout: 3,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'UPGRADE',
            data: [
              { $jig: 0 },
              'class C extends B { }',
              {
                deps: { B: { $jig: 2 } }
              }
            ]
          }
        ]
      })

      class C extends B { }
      CO.upgrade(C)
      await CO.sync()

      await run.load(CO.location)

      run.cache = new LocalCache()
      await run.load(CO.location)
    })

    // ------------------------------------------------------------------------

    it.skip('throws if upgrade to invalid upgradable value', () => {
      const run = new Run()
      class O { }
      const CO = run.deploy(O)
      class A { }
      A.sealed = null
      expect(() => CO.upgrade(A)).to.throw('Invalid sealed option: null')
      A.sealed = 1
      expect(() => CO.upgrade(A)).to.throw('Invalid sealed option: 1')
    })
  })

  // --------------------------------------------------------------------------
  // Method
  // --------------------------------------------------------------------------

  describe('Method', () => {
    it.skip('set upgradable in method', async () => {
      const run = new Run()
      class A extends Jig { static seal () { this.sealed = true } }
      const CA = run.deploy(A)
      await run.deploy(class B extends A { }).sync()
      CA.seal()
      const error = 'Cannot deploy: A is sealed'
      await run.sync()
      function test (CA) {
        expect(() => run.deploy(class C extends A { }).sync()).to.throw(error)
      }
      test(CA)
      const CA2 = await run.load(CA.location)
      test(CA2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it.skip('make non-ugpradable in method', async () => {
      const run = new Run()
      class A extends Jig { static unseal () { this.sealed = false } }
      A.sealed = true
      const CA = run.deploy(A)
      const error = 'Cannot deploy: A is sealed'
      expect(() => run.deploy(class B extends A { }).sync()).to.throw(error)
      CA.unseal()
      const CC = run.deploy(class C extends A { })
      await run.sync()
      await run.load(CC.location)
      run.cache = new LocalCache()
      await run.load(CC.location)
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set upgradable to invalid value', async () => {
      const run = new Run()

      class A extends Jig {
        static f (x) {
          this.sealed = x
        }

        static g (x) {
          const desc = { configurable: true, enumerable: true, writable: true, value: x }
          Object.defineProperty(this, 'sealed', desc)
        }
      }

      function testInvalid (CA, value) {
        expect(() => CA.f(value)).to.throw('Invalid sealed option')
        expect(() => CA.g(value)).to.throw('Invalid sealed option')
      }

      function test (CA) {
        testInvalid(CA, 123)
      }

      const CA = run.deploy(A)
      test(CA)
      await run.sync()

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })
  })
})

// ------------------------------------------------------------------------------------------------
