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
const SI = unmangle(Run.sandbox)._intrinsics

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

    // ------------------------------------------------------------------------

    it('remove parent', async () => {
      const run = new Run()

      class A { }
      class B extends A { }
      const CB = run.deploy(B)
      await CB.sync()

      function test (CO) {
        expect(Object.getPrototypeOf(CO)).to.equal(SI.Function.prototype)
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
              'class C { }',
              {}
            ]
          }
        ]
      })

      class C { }
      CB.upgrade(C)
      await CB.sync()
      test(CB)

      const CB2 = await run.load(CB.location)
      test(CB2)

      run.cache = new LocalCache()
      const CB3 = await run.load(CB.location)
      test(CB3)
    })

    // ------------------------------------------------------------------------

    it('throws if invalid parent', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B { }
      B.badProp = new Date()
      class C extends B { }
      expect(() => CA.upgrade(C)).to.throw()
    })
  })

  // --------------------------------------------------------------------------
  // Props
  // --------------------------------------------------------------------------

  describe('props', () => {
    it('complex props', async () => {
      const run = new Run()

      class O { }
      const CO = run.deploy(O)
      await CO.sync()

      function test (CO) {
        expect(typeof CO.o).to.equal('object')
        expect(CO.n).to.equal(1)
        expect(CO.b).to.equal(false)
        expect(CO.s).to.equal('abc')
        expect(CO.o.o).to.equal(CO.o)
        expect(CO.set instanceof SI.Set).to.equal(true)
        expect(CO.set.size).to.equal(1)
        expect(CO.set.values().next().value).to.equal(CO)
        expect(CO.set.A).to.equal(CO)
        expect(CO.arr instanceof SI.Array).to.equal(true)
        expect(CO.arr.length).to.equal(1)
        expect(CO.arr[0]).to.equal(CO.arr)
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
              'class A { }',
              {
                $top: {
                  n: 1,
                  b: false,
                  s: 'abc',
                  o: { $dup: 0 },
                  set: { $set: [{ $dup: 1 }], props: { A: { $dup: 1 } } },
                  arr: { $dup: 2 }
                },
                dups: [
                  { o: { $dup: 0 } },
                  { $jig: 0 },
                  [{ $dup: 2 }]
                ]
              }
            ]
          }
        ]
      })

      class A { }
      A.n = 1
      A.b = false
      A.s = 'abc'
      A.o = {}
      A.o.o = A.o
      A.set = new Set()
      A.set.add(A)
      A.set.A = A
      A.arr = []
      A.arr.push(A.arr)

      CO.upgrade(A)
      await CO.sync()
      test(CO)

      const CO2 = await run.load(CO.location)
      test(CO2)

      run.cache = new LocalCache()
      const CO3 = await run.load(CO.location)
      test(CO3)
    })

    // ------------------------------------------------------------------------

    it('deploys new code', async () => {
      const run = new Run()

      class O { }
      const CO = run.deploy(O)
      await CO.sync()

      function test (CO) {
        expect(CO.B instanceof Code).to.equal(true)
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
              'class B { }',
              {}
            ]
          },
          {
            op: 'UPGRADE',
            data: [
              { $jig: 0 },
              'class A { }',
              {
                B: { $jig: 1 }
              }
            ]
          }
        ]
      })

      class A { }
      class B { }
      A.B = B
      CO.upgrade(A)
      test(CO)
      await CO.sync()

      const CO2 = await run.load(CO.location)
      test(CO2)

      run.cache = new LocalCache()
      const CO3 = await run.load(CO.location)
      test(CO3)
    })

    // ------------------------------------------------------------------------

    it('code reference', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      class O { }
      const CO = run.deploy(O)
      await CO.sync()

      function test (CO) {
        expect(CO.A.origin).to.equal(CA.origin)
      }

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
              'class B { }',
              {
                A: { $jig: 1 }
              }
            ]
          }
        ]
      })

      class B { }
      B.A = A
      CO.upgrade(B)
      test(CO)
      await CO.sync()

      const CO2 = await run.load(CO.location)
      test(CO2)

      run.cache = new LocalCache()
      const CO3 = await run.load(CO.location)
      test(CO3)
    })

    // ------------------------------------------------------------------------

    it.skip('jig', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('berry', () => {

    })

    // ------------------------------------------------------------------------

    it('throws if symbol', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B { }
      B.symbol = Symbol.hasInstance
      expect(() => CA.upgrade(B)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if intrinsic', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B { }
      B.intrinsic = Map
      const error = 'Cannot install intrinsic'
      expect(() => CA.upgrade(B)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if anonymous', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B { }
      B.anon = () => {}
      const error = 'Anonymous types not supported'
      expect(() => CA.upgrade(B)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if reserved', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B { }
      B.toString = 'hello'
      const error = 'Must not have any reserved words'
      expect(() => CA.upgrade(B)).to.throw(error)
    })
  })

  // --------------------------------------------------------------------------
  // Deps
  // --------------------------------------------------------------------------

  describe('deps', () => {
    it.skip('complex deps', () => {
      // TODO - circular
    })

    // ------------------------------------------------------------------------

    it.skip('deploys new code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('code reference', async () => {
      const run = new Run()

      function f () { }
      const cf = run.deploy(f)
      await cf.sync()

      function o () { }
      const co = run.deploy(o)
      await co.sync()

      function test (co) {
        expect(co.deps.f.origin).to.equal(f.origin)
        expect(co()).to.equal(co.deps.f)
      }

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
              'function g () { return f }',
              {
                deps: { f: { $jig: 1 } }
              }
            ]
          }
        ]
      })

      function g () { return f }
      g.deps = { f }
      co.upgrade(g)
      test(co)
      await co.sync()

      const co2 = await run.load(co.location)
      test(co2)

      run.cache = new LocalCache()
      const co3 = await run.load(co.location)
      test(co3)
    })

    // ------------------------------------------------------------------------

    it.skip('jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('berry', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if symbol', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B { }
      B.deps = { symbol: Symbol.iterator }
      expect(() => CA.upgrade(B)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if intrinsic', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B { }
      B.deps = { Math }
      const error = 'Cannot clone intrinsic'
      expect(() => CA.upgrade(B)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if anonymous', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B { }
      B.deps = { f: () => { } }
      const error = 'Anonymous types not supported'
      expect(() => CA.upgrade(B)).to.throw(error)
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
