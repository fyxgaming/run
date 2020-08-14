/**
 * upgrade.js
 *
 * Tests for upgrading code
 */

const { describe, it, afterEach } = require('mocha')
const { stub } = require('sinon')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { expectTx } = require('../env/misc')
const unmangle = require('../env/unmangle')
const { Code, LocalCache } = unmangle(Run)

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

describe('Upgrade', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // Upgrade
  // --------------------------------------------------------------------------

  describe('upgrade', () => {
    it('upgrades class', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      class B { }

      function test (CA) {
        expect(CA.toString()).to.equal(B.toString())
        expect(CA.name).to.equal('B')
        expect(CA.location).not.to.equal(CA.origin)
      }

      expectTx({
        nin: 1,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'UPGRADE',
            data: [
              { $jig: 0 },
              'class B { }',
              {}
            ]
          }
        ]
      })

      expect(CA.upgrade(B)).to.equal(CA)
      await CA.sync()
      test(CA)

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('changes methods', async () => {
      const run = new Run()

      class A {
        a1 () { }
        static a2 () { }
      }
      const CA = run.deploy(A)
      await CA.sync()

      class B {
        b1 () { }
        static b2 () { }
      }

      function test (CA) {
        expect(typeof CA.prototype.a1).to.equal('undefined')
        expect(typeof CA.prototype.b1).to.equal('function')
        expect(typeof CA.a2).to.equal('undefined')
        expect(typeof CA.b2).to.equal('function')
      }

      expectTx({
        nin: 1,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'UPGRADE',
            data: [
              { $jig: 0 },
              B.toString(),
              {}
            ]
          }
        ]
      })

      expect(CA.upgrade(B)).to.equal(CA)
      await CA.sync()
      test(CA)

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('changes props', async () => {
      const run = new Run()

      class A { }
      A.x = 1
      const CA = run.deploy(A)
      await CA.sync()

      class B { }
      B.y = 2

      function test (CA) {
        expect(typeof CA.x).to.equal('undefined')
        expect(CA.y).to.equal(2)
      }

      expectTx({
        nin: 1,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'UPGRADE',
            data: [
              { $jig: 0 },
              'class B { }',
              { y: 2 }
            ]
          }
        ]
      })

      expect(CA.upgrade(B)).to.equal(CA)
      await CA.sync()
      test(CA)

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('changes deps', async () => {
      const run = new Run()

      function f () { return [typeof a, typeof b] }
      f.deps = { a: 1 }
      const cf = run.deploy(f)
      await cf.sync()

      function g () { return [typeof a, typeof b] }
      g.deps = { b: 2 }

      function test (cf) {
        expect(cf()[0]).to.equal('undefined')
        expect(cf()[1]).to.equal('number')
      }

      expectTx({
        nin: 1,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'UPGRADE',
            data: [
              { $jig: 0 },
              g.toString(),
              { deps: { b: 2 } }
            ]
          }
        ]
      })

      expect(cf.upgrade(g)).to.equal(cf)
      await cf.sync()
      test(cf)

      const cf2 = await run.load(cf.location)
      test(cf2)

      run.cache = new LocalCache()
      const cf3 = await run.load(cf.location)
      test(cf3)
    })

    // ------------------------------------------------------------------------

    it('cannot upgrade non-code', () => {
      const error = 'Upgrade unavailable'
      expect(() => Code.prototype.upgrade.call({}, class A { })).to.throw(error)
      expect(() => Code.prototype.upgrade.call(class A { }, class A { })).to.throw(error)
      expect(() => Code.prototype.upgrade.call(null, class A { })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    // Throws if illegal
    // Upgrade multiple in a batch
    // Cannot upgrade inside a method
  })

  describe.skip('upgrade', () => {
    it('should upgrade functions', () => {
      const run = new Run()
      function f () { return 1 }
      const c = run.deploy(f)
      expect(c()).to.equal(1)
      function g () { return 2 }
      c.upgrade(g)
      expect(c()).to.equal(2)
    })

    it('should upgrade with dependencies', async () => {
      const run = new Run()
      class A { }
      class D { }
      class B extends D { }
      class C { }
      B.C = C
      const CA = run.deploy(A)
      CA.upgrade(B)
      await run.sync()
      await run.load(CA.location)
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(CA.location)
    })

    it('should throw if inconsistent world after upgrade', async () => {
      const run = new Run()
      class A { }
      class B { }
      const CA = run.deploy(A)
      CA.upgrade(B)
      await run.sync()
      const A1 = await run.load(CA.origin)
      class C { }
      C.A1 = A1
      C.A2 = CA
      expect(() => run.deploy(C)).to.throw('Inconsistent worldview')
    })

    it('should rollback upgrade', async () => {
      const run = new Run()
      class A { f () { } static t () { }}
      A.x = 1
      const C = run.deploy(A)
      await C.sync()
      expect(typeof C.t).to.equal('function')
      expect(typeof C.u).to.equal('undefined')

      class B { g () { } static u () { }}
      B.y = 2
      stub(run.purse, 'pay').callsFake(x => x)
      C.upgrade(B)
      expect(typeof C.t).to.equal('undefined')
      expect(typeof C.u).to.equal('function')

      await expect(C.sync()).to.be.rejected

      expect(C.toString()).to.equal(A.toString())
      expect(C.x).to.equal(1)
      expect(C.y).to.equal(undefined)
      expect(typeof C.prototype.f).to.equal('function')
      expect(typeof C.prototype.g).to.equal('undefined')
      expect(typeof C.t).to.equal('function')
      expect(typeof C.u).to.equal('undefined')
    })

    // TODO: Upgrade in same transacation as create (batch)
    // TODO: Upgrade destroyed jig
    // TODO: Upgrade with parent
    // TODO: Upgrade with props (deployed and not)
    // TODO: Upgrade and remove parent
    // TODO: Upgrade with different parent
    // TODO: Same for props
    // TODO: Upgrade and change name
    // TODO: Cannot upgrade undeployed code
    // TODO: Does not deploy if already deployed
    // TODO: Rollback with multiple transactions in a batch
    // TODO: Rollback upgrade itself, not publish error
    // TODO: Upgrade with complex props
    // TODO: Cannot upgrade in another action
  })
})

// ------------------------------------------------------------------------------------------------
