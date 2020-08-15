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
// Upgrade
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

      function f () { return [typeof a, typeof b, 'f'] }
      f.deps = { a: 1 }
      const cf = run.deploy(f)
      await cf.sync()

      function g () { return [typeof a, typeof b, 'g'] }
      g.deps = { b: 2 }

      function test (cf) {
        expect(cf()[0]).to.equal('undefined')
        expect(cf()[1]).to.equal('number')
        expect(cf()[2]).to.equal('g')
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

    it.skip('upgrades multiple in a batch', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('upgrades in same transaction as create', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Parents
  // --------------------------------------------------------------------------

  describe('parents', () => {
    it('deploys new parent chain', async () => {
      const run = new Run()

      class O { }
      const CO = run.deploy(O)
      await CO.sync()

      function test (CO) {
        expect(CO.name).to.equal('B')
        expect(Object.getPrototypeOf(CO).name).to.equal('A')
      }

      expectTx({
        nin: 1,
        nref: 0,
        nout: 2,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class A { }',
              {}
            ]
          },
          {
            op: 'UPGRADE',
            data: [
              { $jig: 0 },
              'class B extends A { }',
              { deps: { A: { $jig: 1 } } }
            ]
          }
        ]
      })

      class A { }
      class B extends A { }
      CO.upgrade(B)
      await CO.sync()
      test(CO)

      const CO2 = await run.load(CO.location)
      test(CO2)

      run.cache = new LocalCache()
      const CO3 = await run.load(CO.location)
      test(CO3)
    })

    it.only('remove parent', async () => {
      const run = new Run()

      class A { }
      class B extends A { }
      const CB = run.deploy(B)
      await CB.sync()

      // TODO: Test upgrade to code throw

      /*
      function test (CO) {
        console.log(Object.getPrototypeOf(CO))
      }

      expectTx({
        nin: 1,
        nref: 0,
        nout: 2,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class A { }',
              {}
            ]
          },
          {
            op: 'UPGRADE',
            data: [
              { $jig: 0 },
              'class B extends A { }',
              { deps: { A: { $jig: 1 } } }
            ]
          }
        ]
      })
      */

      CB.upgrade(A)
      await CB.sync()
      // test(CO)

      // const CO2 = await run.load(CO.location)
      // test(CO2)

      // run.cache = new LocalCache()
      // const CO3 = await run.load(CO.location)
      // test(CO3)
    })

    it.skip('throws if invalid parent', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Props
  // --------------------------------------------------------------------------

  describe('props', () => {
    it.skip('complex props', () => {
      // TODO - circular, jig, berries
    })

    it.skip('deploys new code', () => {
      // TODO
    })

    it.skip('code reference', () => {
      // TODO
    })

    it.skip('throws if unsupported', () => {
      // TODO - intrinsics, anonymous
    })

    it.skip('throws if reserved', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Deps
  // --------------------------------------------------------------------------

  describe('deps', () => {
    it.skip('complex deps', () => {
      // TODO - circular, jig, berries
    })

    it.skip('deploys new code', () => {
      // TODO
    })

    it.skip('code reference', () => {
      // TODO
    })

    it.skip('throws if unsupported', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Errors
  // --------------------------------------------------------------------------

  describe('errors', () => {
    it('rolls back', async () => {
      const run = new Run()
      class A { static f () { }}
      A.x = 1
      const CA = run.deploy(A)
      await CA.sync()

      class B { static g () { }}
      B.y = 2
      stub(run.purse, 'pay').callsFake(x => x)
      CA.upgrade(B)

      expect(CA.toString()).to.equal(B.toString())
      expect(typeof CA.x).to.equal('undefined')
      expect(CA.y).to.equal(2)
      expect(typeof CA.f).to.equal('undefined')
      expect(typeof CA.g).to.equal('function')

      await expect(CA.sync()).to.be.rejected

      expect(CA.toString()).to.equal(A.toString())
      expect(CA.x).to.equal(1)
      expect(typeof CA.y).to.equal('undefined')
      expect(typeof CA.f).to.equal('function')
      expect(typeof CA.g).to.equal('undefined')
    })

    // ------------------------------------------------------------------------

    it.skip('rolls back in batch', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('cannot upgrade non-code', () => {
      const error = 'Upgrade unavailable'
      expect(() => Code.prototype.upgrade.call({}, class A { })).to.throw(error)
      expect(() => Code.prototype.upgrade.call(class A { }, class A { })).to.throw(error)
      expect(() => Code.prototype.upgrade.call(null, class A { })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('cannot upgrade class to function', () => {
      const run = new Run()
      class A { }
      function f () { }
      const CA = run.deploy(A)
      expect(() => CA.upgrade(f)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('cannot upgrade function to class', () => {
      const run = new Run()
      function f () { }
      class A { }
      const cf = run.deploy(f)
      expect(() => cf.upgrade(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('cannot upgrade a destroyed jig', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CA.destroy()
      class B { }
      expect(() => CA.upgrade(B)).to.throw('Cannot upgrade destroyed jig')
    })

    // ------------------------------------------------------------------------

    it('cannot upgrade to a code jig', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B { }
      const CB = run.deploy(B)
      const error = 'Cannot upgrade to a code jig'
      expect(() => CB.upgrade(CA)).to.throw(error)
      await CA.sync()
      expect(() => CB.upgrade(CA)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if prototypal inheritance', async () => {
      const run = new Run()
      function O () { }
      const CO = run.deploy(O)
      function A () { }
      function B () { }
      B.prototype = Object.create(A.prototype)
      const error = 'Prototypal inheritance not supported'
      expect(() => CO.upgrade(B)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it.skip('cannot upgrade in a method', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('cannot upgrade undeployed berry class', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
