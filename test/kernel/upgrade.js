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
const { Jig } = Run
const { expectTx } = require('../env/misc')
const unmangle = require('../env/unmangle')
const { Code, LocalCache } = unmangle(Run)
const SI = unmangle(unmangle(Run)._Sandbox)._intrinsics

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
              { deps: { } }
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
              { deps: { } }
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
              { deps: { }, y: 2 }
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
              { deps: { } }
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
              { deps: { } }
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
                arr: [{ $dup: ['2', 'arr'] }],
                b: false,
                deps: { },
                n: 1,
                o: { o: { $dup: ['2', 'o'] } },
                s: 'abc',
                set: { $set: [{ $dup: ['0'] }], props: { A: { $dup: ['0'] } } }
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
              { deps: { } }
            ]
          },
          {
            op: 'UPGRADE',
            data: [
              { $jig: 0 },
              'class A { }',
              {
                B: { $jig: 1 },
                deps: { }
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

    it('upgrade to self-reference', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B { }
      B.A = CA
      CA.upgrade(B)
      expect(CA.A).to.equal(CA)
      await CA.sync()
      await run.load(CA.location)
      run.cache = new LocalCache()
      await run.load(CA.location)
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

      class B { }

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
              B.toString(),
              {
                A: { $jig: 1 },
                deps: { }
              }
            ]
          }
        ]
      })

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

    it('jig reference', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      class O { }
      const CO = run.deploy(O)
      await CO.sync()

      class C extends Jig { }
      const c = new C()
      await c.sync()

      class B { }

      function test (CO) {
        expect(CO.c instanceof Jig).to.equal(true)
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
              B.toString(),
              {
                c: { $jig: 1 },
                deps: { }
              }
            ]
          }
        ]
      })

      B.c = c
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
    it('complex deps', async () => {
      const run = new Run()

      class O { }
      const CO = run.deploy(O)
      await CO.sync()

      function test (CO) {
        expect(typeof CO.deps.o).to.equal('object')
        expect(CO.deps.n).to.equal(1)
        expect(CO.deps.b).to.equal(false)
        expect(CO.deps.s).to.equal('abc')
        expect(CO.deps.o.o).to.equal(CO.deps.o)
        expect(CO.deps.set instanceof SI.Set).to.equal(true)
        expect(CO.deps.set.size).to.equal(1)
        expect(CO.deps.set.values().next().value).to.equal(CO)
        expect(CO.deps.set.A).to.equal(CO)
        expect(CO.deps.arr instanceof SI.Array).to.equal(true)
        expect(CO.deps.arr.length).to.equal(1)
        expect(CO.deps.arr[0]).to.equal(CO.deps.arr)
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
                deps: {
                  n: 1,
                  b: false,
                  s: 'abc',
                  o: { o: { $dup: ['2', 'deps', 'o'] } },
                  set: { $set: [{ $dup: ['0'] }], props: { A: { $dup: ['0'] } } },
                  arr: [{ $dup: ['2', 'deps', 'arr'] }]
                }
              }
            ]
          }
        ]
      })

      class A { }
      A.deps = {}
      A.deps.n = 1
      A.deps.b = false
      A.deps.s = 'abc'
      A.deps.o = {}
      A.deps.o.o = A.deps.o
      A.deps.set = new Set()
      A.deps.set.add(A)
      A.deps.set.A = A
      A.deps.arr = []
      A.deps.arr.push(A.deps.arr)

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
        expect(CO.deps.B instanceof Code).to.equal(true)
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
              { deps: { } }
            ]
          },
          {
            op: 'UPGRADE',
            data: [
              { $jig: 0 },
              'class A { }',
              {
                deps: { B: { $jig: 1 } }
              }
            ]
          }
        ]
      })

      class A { }
      class B { }
      A.deps = { B }
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
              g.toString(),
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

    it('jig reference', async () => {
      const run = new Run()

      function f () { }
      const cf = run.deploy(f)
      await cf.sync()

      class A extends Jig { }
      const a = new A()
      await a.sync()

      function o () { }
      const co = run.deploy(o)
      await co.sync()

      function test (co) {
        expect(co.deps.a.origin).to.equal(a.origin)
        expect(co.deps.a.location).to.equal(a.location)
        expect(co().location).to.equal(a.location)
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
              g.toString(),
              {
                deps: { a: { $jig: 1 } }
              }
            ]
          }
        ]
      })

      function g () { return a }
      g.deps = { a }

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

    // ------------------------------------------------------------------------

    it('throws if dep is function name', () => {
      const run = new Run()
      function f () { }
      const cf = run.deploy(f)
      function g () { }
      g.deps = { g }
      expect(() => cf.upgrade(g)).to.throw('Illegal dependency')
    })
  })

  // --------------------------------------------------------------------------
  // Errors
  // --------------------------------------------------------------------------

  describe('errors', () => {
    it('rolls back', async () => {
      const run = new Run()
      class A { static f () { } }
      A.x = 1
      const CA = run.deploy(A)
      await CA.sync()

      class B { static g () { } }
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
      const error = 'upgrade unavailable'
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

    it('throws if upgrade normal jig class to static code', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      const error = 'Cannot change staticness of code in upgrade'
      expect(() => CA.upgrade(class B { })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if upgrade static code to normal jig class', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      const error = 'Cannot change staticness of code in upgrade'
      expect(() => CA.upgrade(class B extends Jig { })).to.throw(error)
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

    it('throws if symbol methods', () => {
      const run = new Run()
      function O () { }
      const CO = run.deploy(O)
      class A { static [Symbol.iterator] () { } }
      class B { [Symbol.iterator] () { } }
      const error = 'Symbol methods not supported'
      expect(() => CO.upgrade(A)).to.throw(error)
      expect(() => CO.upgrade(B)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if accessors', () => {
      const run = new Run()
      function O () { }
      const CO = run.deploy(O)
      class A { static get x () { } }
      class B { static set x (value) { } }
      class C { get x () { } }
      class D { set x (value) { } }
      const error = 'Getters and setters not supported'
      expect(() => CO.upgrade(A)).to.throw(error)
      expect(() => CO.upgrade(B)).to.throw(error)
      expect(() => CO.upgrade(C)).to.throw(error)
      expect(() => CO.upgrade(D)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if override jig methods', () => {
      const run = new Run()
      function O () { }
      const CO = run.deploy(O)
      const error = 'Cannot override Jig methods or properties'
      expect(() => CO.upgrade(class A extends Jig { static [Symbol.hasInstance] () { } })).to.throw(error)
      expect(() => CO.upgrade(class A extends Jig { sync () { } })).to.throw(error)
      expect(() => CO.upgrade(class A extends Jig { origin () { } })).to.throw(error)
      expect(() => CO.upgrade(class A extends Jig { location () { } })).to.throw(error)
      expect(() => CO.upgrade(class A extends Jig { nonce () { } })).to.throw(error)
      expect(() => CO.upgrade(class A extends Jig { owner () { } })).to.throw(error)
      expect(() => CO.upgrade(class A extends Jig { satoshis () { } })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('cannot upgrade in a method', () => {
      const run = new Run()
      class A extends Jig { static f () { this.upgrade(class B { }) } }
      const CA = run.deploy(A)
      expect(() => CA.f()).to.throw('upgrade unavailable')
    })

    // ------------------------------------------------------------------------

    it.skip('cannot upgrade undeployed berry class', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Jig
  // --------------------------------------------------------------------------

  describe('Jig', () => {
    it('upgrades instances on sync', async () => {
      const run = new Run()
      class A extends Jig { f () { return 1 } }
      class B extends Jig { f () { return 2 } }
      const CA = run.deploy(A)
      await CA.sync()
      const a = new CA()
      expect(a.f()).to.equal(1)
      CA.upgrade(B)
      expect(a.f()).to.equal(2)
      await a.sync()
      const a2 = await run.load(a.origin)
      expect(a2.f()).to.equal(1)
      await a2.sync()
      expect(a2.f()).to.equal(2)
      run.cache = new LocalCache()
      const a3 = await run.load(a.origin)
      expect(a3.f()).to.equal(1)
      await a3.sync()
      expect(a3.f()).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('can create old instances', async () => {
      const run = new Run()
      class A extends Jig { f () { return 1 } }
      class B extends Jig { f () { return 2 } }
      const C = run.deploy(A)
      C.upgrade(B)
      await C.sync()
      const CO = await run.load(C.origin)
      const a = new CO()
      const b = new C()
      expect(a.constructor.location).not.to.equal(b.constructor.location)
      await a.sync()
      expect(a.constructor.location).to.equal(b.constructor.location)
    })

    // ------------------------------------------------------------------------

    it('can delay upgrade instances', async () => {
      const run = new Run()
      class A extends Jig { f (n) { this.n = n } }
      class B extends Jig { f () { this.n = 'error' } }
      const C = run.deploy(A)
      C.upgrade(B)
      await C.sync()
      const CO = await run.load(C.origin)
      const a = new CO()
      a.f(1)
      expect(a.n).to.equal(1)
      a.f(2)
      expect(a.n).to.equal(2)
      await a.sync()
      a.f(3)
      expect(a.n).to.equal('error')
    })

    // ------------------------------------------------------------------------

    it('throws if inconsistent worldview from upgrade', async () => {
      const run = new Run()
      class A extends Jig {
        init (n) { this.n = 1 }
        f () { return this.n }
      }
      const CA = run.deploy(A)
      CA.auth()
      await CA.sync()
      const CO = await run.load(CA.origin)
      expect(CA.location).not.to.equal(CO.location)
      const a = new CA()
      const b = new CO()
      class C extends Jig { init (a, b) { this.n = a.f() + b.f() } }
      const C2 = run.deploy(C)
      run.autounify = false
      expect(() => new C2(a, b)).to.throw('Inconsistent worldview')
    })
  })
})

// ------------------------------------------------------------------------------------------------
