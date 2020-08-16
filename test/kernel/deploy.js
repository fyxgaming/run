/**
 * deploy.js
 *
 * Tests for deploying code
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { stub } = require('sinon')
const { expect } = require('chai')
const { PrivateKey } = require('bsv')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { expectTx } = require('../env/misc')
const { Code, Jig, Berry, LocalCache, sandbox } = Run
const SI = unmangle(sandbox)._intrinsics
const _sudo = unmangle(Run)._sudo

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const randomLocation = () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + '_o0'
const randomOwner = () => new PrivateKey().toAddress().toString()

// Methods available on all code instances
const CODE_METHODS = ['upgrade', 'sync', 'destroy', 'auth']

// Reserved words not allowed on code
const FUTURE_PROPS = ['encryption', 'blockhash', 'blockheight', 'blocktime']
const RESERVED_WORDS = [...CODE_METHODS, 'toString', ...FUTURE_PROPS]

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

describe('Deploy', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // Deploy
  // --------------------------------------------------------------------------

  describe('deploy', () => {
    it('basic class', async () => {
      const run = new Run()

      class A { }

      const test = CA => {
        expect(typeof CA).to.equal('function')
        expect(CA.toString()).to.equal(A.toString())
        expect(CA).not.to.equal(A)
      }

      expectTx({
        nin: 0,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class A { }',
              {}
            ]
          }
        ]
      })

      const CA = run.deploy(A)
      test(CA)

      await CA.sync()
      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('basic function', async () => {
      const run = new Run()

      function f () { }

      const test = cf => {
        expect(typeof cf).to.equal('function')
        expect(cf.toString()).to.equal(f.toString())
        expect(cf).not.to.equal(f)
      }

      expectTx({
        nin: 0,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'function f () { }',
              {}
            ]
          }
        ]
      })

      const cf = run.deploy(f)
      test(cf)

      await cf.sync()
      const cf2 = await run.load(cf.location)
      test(cf2)

      run.cache = new LocalCache()
      const cf3 = await run.load(cf.location)
      test(cf3)
    })

    // ------------------------------------------------------------------------

    it('creates code for class only once', async () => {
      const run = new Run()
      class A { }
      const CA1 = run.deploy(A)
      const CA2 = run.deploy(A)
      expect(CA1 === CA2).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('creates code for function only once', () => {
      const run = new Run()
      function f () { }
      const cf1 = run.deploy(f)
      const cf2 = run.deploy(f)
      expect(cf1 === cf2).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns code for code', () => {
      const run = new Run()
      class A { }
      const CA1 = run.deploy(A)
      const CA2 = run.deploy(CA1)
      expect(CA1).to.equal(CA2)
    })
  })

  // --------------------------------------------------------------------------
  // Bindings
  // --------------------------------------------------------------------------

  describe('bindings', () => {
    it('sets initial bindings before sync', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      _sudo(() => {
        expect(CA.location.startsWith('commit://')).to.equal(true)
        expect(CA.origin.startsWith('commit://')).to.equal(true)
        expect(CA.nonce).to.equal(1)
        expect(unmangle(CA.owner)._value).to.equal(undefined)
        expect(unmangle(CA.satoshis)._value).to.equal(undefined)
      })
    })

    // ------------------------------------------------------------------------

    it('assigns bindings after sync', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      await run.sync()
      expect(CA.location.endsWith('_o1')).to.equal(true)
      expect(CA.origin.endsWith('_o1')).to.equal(true)
      expect(CA.nonce).to.equal(1)
      const owner = await run.owner.owner()
      expect(CA.owner).to.equal(owner)
      expect(CA.satoshis).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('assigns bindings to both local and jig', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      await run.sync()
      expect(CA.location).to.equal(A.location)
      expect(CA.origin).to.equal(A.origin)
      expect(CA.nonce).to.equal(A.nonce)
      expect(CA.owner).to.equal(A.owner)
      expect(CA.satoshis).to.equal(A.satoshis)
    })
  })

  // --------------------------------------------------------------------------
  // Parents
  // --------------------------------------------------------------------------

  describe('parents', () => {
    it('deploys parent', async () => {
      const run = new Run()

      class A { }
      class B extends A { }

      const test = (CA, CB) => {
        expect(CA.location.endsWith('_o1')).to.equal(true)
        expect(CB.location.endsWith('_o2')).to.equal(true)
      }

      expectTx({
        nin: 0,
        nref: 0,
        nout: 2,
        ndel: 0,
        ncre: 2,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class A { }',
              {},
              'class B extends A { }',
              {
                deps: {
                  A: { $jig: 0 }
                }
              }
            ]
          }
        ]
      })

      const CB = run.deploy(B)
      const CA = run.deploy(A)
      expect(Object.getPrototypeOf(CB)).to.equal(CA)

      await run.sync()
      test(CA, CB)

      const CA2 = await run.load(CA.location)
      const CB2 = await run.load(CB.location)
      test(CA2, CB2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      const CB3 = await run.load(CB.location)
      test(CA3, CB3)
    })

    // ------------------------------------------------------------------------

    it('parent chain', async () => {
      const run = new Run()

      class A { }
      class B extends A { }
      class C extends B { }

      function test (CC, CB, CA) {
        expect(Object.getPrototypeOf(CC).origin).to.equal(CB.origin)
        expect(Object.getPrototypeOf(CB).origin).to.equal(CA.origin)
      }

      expectTx({
        nin: 0,
        nref: 0,
        nout: 3,
        ndel: 0,
        ncre: 3,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class A { }',
              {},
              'class B extends A { }',
              {
                deps: {
                  A: { $jig: 0 }
                }
              },
              'class C extends B { }',
              {
                deps: {
                  B: { $jig: 1 }
                }
              }
            ]
          }
        ]
      })

      const CC = run.deploy(C)
      const CB = run.deploy(B)
      const CA = run.deploy(A)
      expect(Object.getPrototypeOf(CC)).to.equal(CB)
      expect(Object.getPrototypeOf(CB)).to.equal(CA)

      await run.sync()
      test(CC, CB, CA)

      const CC2 = await run.load(CC.location)
      const CB2 = await run.load(CB.location)
      const CA2 = await run.load(CA.location)
      test(CC2, CB2, CA2)

      run.cache = new LocalCache()
      const CC3 = await run.load(CC.location)
      const CB3 = await run.load(CB.location)
      const CA3 = await run.load(CA.location)
      test(CC3, CB3, CA3)
    })

    // ------------------------------------------------------------------------

    it('reuses installed code for parent', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B extends A { }
      const CB = run.deploy(B)
      expect(Object.getPrototypeOf(CB)).to.equal(CA)
    })

    // ------------------------------------------------------------------------

    it('reueses parent that is code', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B extends CA { }
      const CB = run.deploy(B)
      expect(Object.getPrototypeOf(CB)).to.equal(CA)
    })

    // ------------------------------------------------------------------------

    it('circular parent-child code', async () => {
      const run = new Run()

      class B { }
      class A extends B { }
      B.A = A

      function test (CA) {
        expect(Object.getPrototypeOf(CA).A).to.equal(CA)
      }

      expectTx({
        nin: 0,
        nref: 0,
        nout: 2,
        ndel: 0,
        ncre: 2,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class B { }',
              {
                A: { $jig: 1 }
              },
              'class A extends B { }',
              {
                deps: {
                  B: { $jig: 0 }
                }
              }
            ]
          }
        ]
      })

      const CA = run.deploy(A)
      const CB = run.deploy(B)
      expect(Object.getPrototypeOf(CA)).to.equal(CB)
      expect(CB.A).to.equal(CA)
      test(CA)

      await run.sync()

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })
  })

  // --------------------------------------------------------------------------
  // Props
  // --------------------------------------------------------------------------

  describe('props', () => {
    async function runPropTest (props, encodedProps, testProps) {
      const run = new Run()

      class A { }
      Object.assign(A, props)

      expectTx({
        nin: 0,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class A { }',
              encodedProps
            ]
          }
        ]
      })

      function test (T) {
        const Tprops = Object.assign({}, T)
        const bindings = ['location', 'origin', 'nonce', 'owner', 'satoshis']
        bindings.forEach(x => { delete Tprops[x] })

        expect(Tprops).to.deep.equal(props)

        if (testProps) testProps(T)
      }

      const CA = run.deploy(A)
      await CA.sync()
      test(CA)

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    }

    // ------------------------------------------------------------------------

    it('booleans', async () => {
      const props = {
        falseValue: false,
        trueValue: true,
        container: { value: false },
        array: [true, false]
      }

      const encodedProps = {
        falseValue: false,
        trueValue: true,
        container: { value: false },
        array: [true, false]
      }

      await runPropTest(props, encodedProps)
    })

    // ------------------------------------------------------------------------

    it('undefined', async () => {
      const props = {
        undefinedValue: undefined,
        array: [undefined]
      }

      const encodedProps = {
        undefinedValue: { $und: 1 },
        array: [{ $und: 1 }]
      }

      await runPropTest(props, encodedProps)
    })

    // ------------------------------------------------------------------------

    it('numbers', async () => {
      const props = {
        zero: 0,
        pos: 1,
        neg: -1,
        float: 1.5,
        minInt: Number.MIN_SAFE_INTEGER,
        maxInt: Number.MAX_SAFE_INTEGER,
        minVal: Number.MIN_VALUE,
        maxVal: Number.MAX_VALUE,
        posInf: Number.POSITIVE_INFINITY,
        negInf: Number.NEGATIVE_INFINITY,
        nan: NaN,
        array: [1, -1, NaN, Infinity]
      }

      const encodedProps = {
        zero: 0,
        pos: 1,
        neg: -1,
        float: 1.5,
        minInt: Number.MIN_SAFE_INTEGER,
        maxInt: Number.MAX_SAFE_INTEGER,
        minVal: Number.MIN_VALUE,
        maxVal: Number.MAX_VALUE,
        posInf: { $inf: 1 },
        negInf: { $ninf: 1 },
        nan: { $nan: 1 },
        array: [1, -1, { $nan: 1 }, { $inf: 1 }]
      }

      await runPropTest(props, encodedProps)
    })

    // ------------------------------------------------------------------------

    it('strings', async () => {
      const props = {
        empty: '',
        short: 'abc',
        long: 'x'.repeat(10000),
        multiline: '0\n1\n2\n',
        emoji: '😄',
        obj: { arr: ['a'] }
      }

      const encodedProps = {
        empty: '',
        short: 'abc',
        long: 'x'.repeat(10000),
        multiline: '0\n1\n2\n',
        emoji: '😄',
        obj: { arr: ['a'] }
      }

      await runPropTest(props, encodedProps)
    })

    // ------------------------------------------------------------------------

    it('arrays', async () => {
      const sparse = []
      sparse[0] = 0
      sparse[99] = 99

      const complex = [1]
      complex.a = 'b'

      const props = {
        empty: [],
        basic: [1, 2, 3],
        nested: [[[]]],
        sparse,
        complex
      }

      const encodedProps = {
        empty: [],
        basic: [1, 2, 3],
        nested: [[[]]],
        sparse: { $arr: { 0: 0, 99: 99 } },
        complex: { $arr: { 0: 1, a: 'b' } }
      }

      function testProps (C) {
        expect(C.empty instanceof Array).to.equal(false)
        expect(C.empty instanceof SI.Array).to.equal(true)
      }

      await runPropTest(props, encodedProps, testProps)
    })

    // ------------------------------------------------------------------------

    it('objects', async () => {
      const props = {
        empty: {},
        basic: { a: 1, b: 2 },
        nested: { o: { } },
        array: [{}],
        nullValue: null,
        dollar: { $und: 1 }
      }

      const encodedProps = {
        empty: {},
        basic: { a: 1, b: 2 },
        nested: { o: { } },
        array: [{}],
        nullValue: null,
        dollar: { $obj: { $und: 1 } }
      }

      function testProps (C) {
        expect(C.empty instanceof Object).to.equal(false)
        expect(C.empty instanceof SI.Object).to.equal(true)
      }

      await runPropTest(props, encodedProps, testProps)
    })

    // ------------------------------------------------------------------------

    it('sets', async () => {
      const setWithProps = new Set()
      setWithProps.a = []
      setWithProps.s = new Set()

      const props = {
        empty: new Set(),
        basic: new Set([1, 2, 3]),
        nested: new Set([new Set()]),
        setWithProps
      }

      const encodedProps = {
        empty: { $set: [] },
        basic: { $set: [1, 2, 3] },
        nested: { $set: [{ $set: [] }] },
        setWithProps: { $set: [], props: { a: [], s: { $set: [] } } }
      }

      function testProps (C) {
        expect(C.empty instanceof Set).to.equal(false)
        expect(C.empty instanceof SI.Set).to.equal(true)
      }

      await runPropTest(props, encodedProps, testProps)
    })

    // ------------------------------------------------------------------------

    it('maps', async () => {
      const mapWithProps = new Map()
      mapWithProps.a = []
      mapWithProps.m = new Map()

      const props = {
        empty: new Map(),
        basic: new Map([[1, 2], [3, 4]]),
        complex: new Map([[new Set(), null], [[], {}]]),
        mapWithProps
      }

      const encodedProps = {
        empty: { $map: [] },
        basic: { $map: [[1, 2], [3, 4]] },
        complex: { $map: [[{ $set: [] }, null], [[], {}]] },
        mapWithProps: { $map: [], props: { a: [], m: { $map: [] } } }
      }

      function testProps (C) {
        expect(C.empty instanceof Map).to.equal(false)
        expect(C.empty instanceof SI.Map).to.equal(true)
      }

      await runPropTest(props, encodedProps, testProps)
    })

    // ------------------------------------------------------------------------

    it('uint8array', async () => {
      const props = {
        empty: new Uint8Array(),
        basic: new Uint8Array([0, 1, 255])
      }

      const encodedProps = {
        empty: { $ui8a: '' },
        basic: { $ui8a: 'AAH/' }
      }

      function testProps (C) {
        expect(C.empty instanceof Uint8Array).to.equal(false)
        expect(C.empty instanceof SI.Uint8Array).to.equal(true)
      }

      await runPropTest(props, encodedProps, testProps)
    })

    // ------------------------------------------------------------------------

    it('circular', async () => {
      const obj = {}
      obj.obj = obj

      const arr = []
      arr.push(arr)

      const props = { obj, arr }

      const encodedProps = {
        $top: {
          obj: { $dup: 0 },
          arr: { $dup: 1 }
        },
        dups: [{ obj: { $dup: 0 } }, [{ $dup: 1 }]]
      }

      await runPropTest(props, encodedProps)
    })

    // ------------------------------------------------------------------------

    it('self-reference', async () => {
      const run = new Run()

      class A { }
      A.A = A

      const test = CA => {
        expect(CA.A).to.equal(CA)
      }

      expectTx({
        nin: 0,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class A { }',
              {
                A: { $jig: 0 }
              }
            ]
          }
        ]
      })

      const CA = run.deploy(A)
      test(CA)

      await CA.sync()
      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('installs code props intact', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B { }
      B.CA = CA
      const CB = run.deploy(B)
      expect(CB.CA).to.equal(CA)
    })

    // ------------------------------------------------------------------------

    it('creates and deploys code props', async () => {
      const run = new Run()

      class A { }
      function f () { }
      class B { }
      A.f = f
      A.B = B

      expectTx({
        nin: 0,
        nref: 0,
        nout: 3,
        ndel: 0,
        ncre: 3,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class A { }',
              {
                f: { $jig: 1 },
                B: { $jig: 2 }
              },
              'function f () { }',
              { },
              'class B { }',
              { }
            ]
          }
        ]
      })

      const CA = run.deploy(A)

      await CA.sync()

      expect(CA.f).not.to.equal(f)
      expect(CA.f).to.equal(run.deploy(f))

      expect(CA.B).not.to.equal(B)
      expect(CA.B).to.equal(run.deploy(B))
    })

    // ------------------------------------------------------------------------

    it('code reference', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      function test (CB) {
        expect(CB.A.origin).to.equal(A.origin)
      }

      expectTx({
        nin: 0,
        nref: 1,
        nout: 1,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class B { }',
              { A: { $jig: 0 } }
            ]
          }
        ]
      })

      class B { }
      B.A = CA
      const CB = run.deploy(B)
      await CB.sync()
      test(CB)

      const CB2 = await run.load(CB.location)
      test(CB2)

      run.cache = new LocalCache()
      const CB3 = await run.load(CB.location)
      test(CB3)
    })

    // ------------------------------------------------------------------------

    it.skip('creates and deploys arbitrary objects', async () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('circular code props', async () => {
      const run = new Run()

      class A { }
      class B { }
      A.B = B
      B.A = A

      function test (CA) {
        expect(CA.B.A).to.equal(CA)
      }

      expectTx({
        nin: 0,
        nref: 0,
        nout: 2,
        ndel: 0,
        ncre: 2,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class A { }',
              {
                B: { $jig: 1 }
              },
              'class B { }',
              {
                A: { $jig: 0 }
              }
            ]
          }
        ]
      })

      const CA = run.deploy(A)
      const CB = run.deploy(B)
      expect(CA.B).to.equal(CB)
      expect(CB.A).to.equal(CA)
      test(CA)

      await run.sync()
      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it.skip('jigs', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('berries', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('native', async () => {
      const run = new Run()

      class A { }
      A.Jig = Jig
      A.Berry = Berry

      function test (CA) {
        expect(CA.Jig).to.equal(Jig)
        expect(CA.Berry).to.equal(Berry)
      }

      expectTx({
        nin: 0,
        nref: 2,
        nout: 1,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class A { }',
              {
                Jig: { $jig: 0 },
                Berry: { $jig: 1 }
              }
            ]
          }
        ]
      })

      const CA = run.deploy(A)
      await CA.sync()
      test(CA)

      await run.sync()
      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    function expectPropFail (x) {
      const run = new Run()
      class A { }
      A.x = x
      expect(() => run.deploy(A)).to.throw()
    }

    // ------------------------------------------------------------------------

    it('throws for symbols', () => {
      expectPropFail(Symbol.hasInstance)
      expectPropFail(Symbol.iterator)
    })

    // ------------------------------------------------------------------------

    it('throws for intrinsic props', () => {
      expectPropFail(Math)
      expectPropFail(Date)
      expectPropFail(isNaN)
      expectPropFail(Error)
    })

    // ------------------------------------------------------------------------

    it('throws for unsupported objects', () => {
      expectPropFail(new Date())
      expectPropFail(new Uint16Array())
      expectPropFail(Promise.resolve())
      expectPropFail(new WeakSet())
      expectPropFail(new WeakMap())
      expectPropFail(new RegExp())
      expectPropFail(/abc/)
      expectPropFail(new Error())
    })

    // ------------------------------------------------------------------------

    it('throws if extend intrinsics', () => {
      expectPropFail(new (class MyArray extends Array {})())
      expectPropFail(new (class MySet extends Set {})())
      expectPropFail(new (class MyMap extends Map {})())
      expectPropFail(new (class MyUint8Array extends Uint8Array {})())
    })

    // ------------------------------------------------------------------------

    it('throws for anonymous functions', () => {
      expectPropFail(function () { })
      expectPropFail(() => { })
      expectPropFail(class { })
    })

    // ------------------------------------------------------------------------

    it('should throw if inconsistent worldview from upgrade', async () => {
      const run = new Run()
      class A { }
      class B { }
      const CA = run.deploy(A)
      CA.upgrade(B)
      await run.sync()
      const CA2 = await run.load(CA.origin)
      class C { }
      C.CA1 = CA
      C.CA2 = CA2
      expect(() => run.deploy(C)).to.throw('Inconsistent worldview')
    })
  })

  // --------------------------------------------------------------------------
  // Deps
  // --------------------------------------------------------------------------

  describe('deps', () => {
    it('basic dep', async () => {
      const run = new Run()

      class A { }
      function f () { return A }
      f.deps = { A }

      function test (cf) {
        expect(cf() instanceof Code).to.equal(true)
        expect(cf.deps.A instanceof Code).to.equal(true)
      }

      expectTx({
        nin: 0,
        nref: 0,
        nout: 2,
        ndel: 0,
        ncre: 2,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'function f () { return A }',
              {
                deps: { A: { $jig: 1 } }
              },
              'class A { }',
              {}
            ]
          }
        ]
      })

      const cf = run.deploy(f)
      await cf.sync()
      test(cf)

      const cf2 = await run.load(cf.location)
      test(cf2)

      run.cache = new LocalCache()
      const cf3 = await run.load(cf.location)
      test(cf3)
    })

    // ------------------------------------------------------------------------

    it('non-jig deps', async () => {
      const run = new Run()

      class A {
        static n () { return n } // eslint-disable-line
        static o () { return o } // eslint-disable-line
      }
      A.deps = { n: 1, o: { a: [] } }

      function test (CA) {
        expect(CA.n()).to.equal(1)
        expect(CA.o()).not.to.equal(A.deps.o)
        expect(CA.o()).to.deep.equal(A.deps.o)
        expect(CA.o() instanceof SI.Object).to.equal(true)
        expect(CA.o().a instanceof SI.Array).to.equal(true)
      }

      expectTx({
        nin: 0,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              A.toString(),
              {
                deps: { n: 1, o: { a: [] } }
              }
            ]
          }
        ]
      })

      const CA = run.deploy(A)
      await CA.sync()
      test(CA)

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('automatically adds parent', async () => {
      const run = new Run()

      class A { }
      class B extends A { }

      function test (CB) {
        expect(CB.deps.A instanceof Code).to.equal(true)
      }

      expectTx({
        nin: 0,
        nref: 0,
        nout: 2,
        ndel: 0,
        ncre: 2,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class A { }',
              {},
              'class B extends A { }',
              {
                deps: { A: { $jig: 0 } }
              }
            ]
          }
        ]
      })

      const CB = run.deploy(B)
      test(CB)
      await CB.sync()

      const CB2 = await run.load(CB.location)
      test(CB2)

      run.cache = new LocalCache()
      const CB3 = await run.load(CB.location)
      test(CB3)
    })

    // ------------------------------------------------------------------------

    it('parent deps is not available on child', async () => {
      const run = new Run()

      class B { static f () { return n } } // eslint-disable-line
      class A extends B { static g () { return n } } // eslint-disable-line
      B.deps = { n: 1 }

      function test (CA) {
        expect(Object.getPrototypeOf(CA).f()).to.equal(1)
        expect(() => CA.g()).to.throw()
      }

      const CA = run.deploy(A)
      test(CA)
      await CA.sync()

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it.skip('berry deps', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('jig deps', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('native deps', async () => {
      const run = new Run()

      function f () { return [Jig, Berry] }
      f.deps = { Jig, Berry }

      function test (cf) {
        expect(cf()).to.deep.equal([Jig, Berry])
      }

      expectTx({
        nin: 0,
        nref: 2,
        nout: 1,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'function f () { return [Jig, Berry] }',
              {
                deps: {
                  Jig: { $jig: 0 },
                  Berry: { $jig: 1 }
                }
              }
            ]
          }
        ]
      })

      const cf = run.deploy(f)
      test(cf)
      await cf.sync()

      const cf2 = await run.load(cf.location)
      test(cf2)

      run.cache = new LocalCache()
      const cf3 = await run.load(cf.location)
      test(cf3)
    })

    // ------------------------------------------------------------------------

    it('code reference', async () => {
      const run = new Run()

      function f () { }
      const cf = run.deploy(f)
      await cf.sync()

      function test (cg) {
        expect(cg().origin).to.equal(cf.origin)
      }

      expectTx({
        nin: 0,
        nref: 1,
        nout: 1,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'function g () { return f }',
              {
                deps: {
                  f: { $jig: 0 }
                }
              }
            ]
          }
        ]
      })

      function g () { return f }
      g.deps = { f }
      const cg = await run.deploy(g)
      await cg.sync()
      test(cg)

      const cg2 = await run.load(cg.location)
      test(cg2)

      run.cache = new LocalCache()
      const cg3 = await run.load(cg.location)
      test(cg3)
    })

    // ------------------------------------------------------------------------

    it('renamed deps', async () => {
      const run = new Run()

      const h = 'dummy'
      function f () { return 1 }
      function g () { return h() }
      g.deps = { h: f }

      function test (cg) {
        expect(cg()).to.equal(1)
      }

      expectTx({
        nin: 0,
        nref: 0,
        nout: 2,
        ndel: 0,
        ncre: 2,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'function g () { return h() }',
              {
                deps: { h: { $jig: 1 } }
              },
              'function f () { return 1 }',
              {}
            ]
          }
        ]
      })

      const cg = run.deploy(g)
      test(cg)
      await cg.sync()

      const cg2 = await run.load(cg.location)
      test(cg2)

      run.cache = new LocalCache()
      const cg3 = await run.load(cg.location)
      test(cg3)
    })

    // ------------------------------------------------------------------------

    it('throws if dep is unsupported', () => {
      const run = new Run()
      class A { }
      A.deps = { Date }
      expect(() => run.deploy(A)).to.throw()
      A.deps = { A: () => { } }
      expect(() => run.deploy(A)).to.throw()
      A.deps = { r: new RegExp() }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if deps invalid', () => {
      const run = new Run()
      class A { }
      A.deps = null
      expect(() => run.deploy(A)).to.throw()
      A.deps = '123'
      expect(() => run.deploy(A)).to.throw()
      A.deps = []
      expect(() => run.deploy(A)).to.throw()
      A.deps = new class Deps {}()
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if parent dependency mismatch', () => {
      const run = new Run()
      class A { }
      class C { }
      class B extends A { }
      B.deps = { A: C }
      expect(() => run.deploy(B)).to.throw('Parent dependency mismatch')
    })
  })

  // --------------------------------------------------------------------------
  // Presets
  // --------------------------------------------------------------------------

  describe('presets', () => {
    it('uses blockchain presets', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = {
        [network]: {
          location: randomLocation(),
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      const CA = run.deploy(A)
      expect(CA.location).to.equal(A.presets[network].location)
      expect(CA.origin).to.equal(A.presets[network].origin)
      expect(CA.nonce).to.equal(A.presets[network].nonce)
      expect(CA.owner).to.equal(A.presets[network].owner)
      expect(CA.satoshis).to.equal(A.presets[network].satoshis)
      expect(typeof CA.presets).to.equal('undefined')
    })

    // ------------------------------------------------------------------------

    it('clones javascript objects for sandbox', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { a: [], s: new Set() } }
      const CA = run.deploy(A)
      expect(CA.a).not.to.equal(A.presets[network].a)
      expect(CA.s).not.to.equal(A.presets[network].s)
      expect(CA.a instanceof SI.Array).to.equal(true)
      expect(CA.s instanceof SI.Set).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('deploys code presets', async () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      function f () { }
      A.presets = { [network]: { f } }
      const CA = run.deploy(A)
      await CA.sync()
      expect(CA.f instanceof Code).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it.skip('copies jig and berry presets', async () => {
      const run = new Run()
      const network = run.blockchain.network
      class J extends Jig { }
      const j = new J()
      class B extends Berry { static pluck () { return new B() } }
      const b = await run.load('', B)
      class C {}
      class A { }
      A.presets = { [network]: { b, j, C } }
      const CA = run.deploy(A)
      expect(CA.b).to.equal(b)
      expect(CA.j).to.equal(j)
      expect(CA.C).not.to.equal(C)
      expect(CA.C.toString()).to.equal(C.toString())
      expect(CA.C).to.equal(run.deploy(C))
    })

    // ------------------------------------------------------------------------

    it('does not add presets object to code jig', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = {
        [network]: {
          location: randomLocation(),
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      const CA = run.deploy(A)
      expect(CA.presets).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('returns different code for a copy with same presets', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = {
        [network]: {
          location: randomLocation(),
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      class B { }
      Object.assign(B, A)
      const CA = run.deploy(A)
      const CB = run.deploy(B)
      expect(CA).not.to.equal(CB)
    })

    // ------------------------------------------------------------------------

    it('installs separate presets for parent and child', () => {
      const run = new Run()
      const network = run.blockchain.network
      class B { }
      B.presets = { [network]: { n: 1, m: 0 } }
      class A extends B { }
      A.presets = { [network]: { n: 2 } }
      const CB = run.deploy(B)
      const CA = run.deploy(A)
      expect(CB.n).to.equal(1)
      expect(CB.m).to.equal(0)
      expect(CA.n).to.equal(2)
      expect(CA.m).to.equal(0)
      expect(Object.getOwnPropertyNames(CA).includes('n')).to.equal(true)
      expect(Object.getOwnPropertyNames(CA).includes('m')).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('presets supported for deleted jigs', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = {
        [network]: {
          location: randomLocation().slice(0, -3) + '_d0',
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      const CA = run.deploy(A)
      expect(CA.location).to.equal(A.presets[network].location)
    })

    // ------------------------------------------------------------------------

    it('throws if binding presets are invalid', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = null
      expect(() => run.deploy(A)).to.throw()
      A.presets = { [network]: null }
      expect(() => run.deploy(A)).to.throw()
      A.presets = {
        [network]: {
          location: '_o1',
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      expect(() => run.deploy(A)).to.throw()
      A.presets = {
        [network]: {
          location: '_o1',
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      expect(() => run.deploy(A)).to.throw()
      A.presets = {
        [network]: {
          location: randomLocation(),
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        },
        test: null
      }
      expect(() => run.deploy(A)).to.throw()
      delete A.presets.test
      A.presets[network].nonce = 0
      expect(() => run.deploy(A)).to.throw()
      A.presets[network].nonce = null
      expect(() => run.deploy(A)).to.throw()
      A.presets = []
      expect(() => run.deploy(A)).to.throw()
      A.presets = { [network]: new class Presets {}() }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if binding presets are incomplete', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      const npresets = {
        location: '_o1',
        origin: randomLocation(),
        owner: randomOwner(),
        satoshis: 0
      }
      for (const key of Object.keys(npresets)) {
        A.presets = { [network]: Object.assign({}, npresets) }
        delete A.presets[network][key]
        expect(() => run.deploy(A)).to.throw()
      }
    })

    // ------------------------------------------------------------------------

    it('throws if presets contains reserved properties', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { deps: {} } }
      expect(() => run.deploy(A)).to.throw()
      A.presets = { [network]: { presets: {} } }
      expect(() => run.deploy(A)).to.throw()
      A.presets = { [network]: { upgrade: () => {} } }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if presets contain unsupported values', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { a: new Date() } }
      expect(() => run.deploy(A)).to.throw()
      A.presets = { [network]: { b: Error } }
      expect(() => run.deploy(A)).to.throw()
      A.presets = { [network]: { c: new (class MySet extends Set { })() } }
      expect(() => run.deploy(A)).to.throw()
      A.presets = { anotherNetwork: { d: Math.random } }
      expect(() => run.deploy(A)).to.throw()
    })
  })

  // --------------------------------------------------------------------------
  // Errors
  // --------------------------------------------------------------------------

  describe('errors', () => {
    it('rolls back if fail to publish', async () => {
      const run = new Run()
      class A { }
      stub(run.purse, 'pay').callsFake(x => x)
      const CA = run.deploy(A)
      await expect(CA.sync()).to.be.rejected
      const error = prop => `Cannot read ${prop}`
      expect(() => CA.location).to.throw(error('location'))
      expect(() => CA.origin).to.throw(error('origin'))
      expect(() => CA.nonce).to.throw(error('nonce'))
      expect(() => CA.owner).to.throw(error('owner'))
      expect(() => CA.satoshis).to.throw(error('satoshis'))
    })

    it('throws if non-function', () => {
      const run = new Run()
      const error = 'Only functions and classes are supported'
      expect(() => run.deploy()).to.throw(error)
      expect(() => run.deploy(1)).to.throw(error)
      expect(() => run.deploy(true)).to.throw(error)
      expect(() => run.deploy(null)).to.throw(error)
      expect(() => run.deploy('function')).to.throw(error)
      expect(() => run.deploy('class A {}')).to.throw(error)
      expect(() => run.deploy({})).to.throw(error)
      expect(() => run.deploy([])).to.throw(error)
      expect(() => run.deploy(Symbol.hasInstance)).to.throw(error)
      expect(() => run.deploy((class A { }).prototype)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if built-in', () => {
      const run = new Run()
      const error = 'Cannot install intrinsic'
      expect(() => run.deploy(Object)).to.throw(error)
      expect(() => run.deploy(Date)).to.throw(error)
      expect(() => run.deploy(Uint8Array)).to.throw(error)
      expect(() => run.deploy(Math.sin)).to.throw(error)
      expect(() => run.deploy(parseInt)).to.throw(error)
      expect(() => run.deploy(SI.Object)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if anonymous', () => {
      const run = new Run()
      const error = 'Anonymous types not supported'
      expect(() => run.deploy(() => {})).to.throw(error)
      expect(() => run.deploy(class {})).to.throw(error)
      const g = function () { }
      expect(() => run.deploy(g)).to.throw(error)
      const A = class { }
      expect(() => run.deploy(A)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if prototypal inheritance', () => {
      const run = new Run()
      function A () { }
      function B () { }
      B.prototype = Object.create(A.prototype)
      const error = 'Prototypal inheritance not supported'
      expect(() => run.deploy(B)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if contains reserved words', () => {
      const run = new Run()
      const error = 'Must not have any reserved words'

      RESERVED_WORDS.forEach(word => {
        class A { }
        A[word] = 1
        expect(() => run.deploy(A)).to.throw(error)

        class B { }
        B[word] = class Z { }
        expect(() => run.deploy(B)).to.throw(error)
      })

      class C { static sync () { }}
      expect(() => run.deploy(C)).to.throw(error)

      class D { static get destroy () { } }
      expect(() => run.deploy(D)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if contains bindings', () => {
      const run = new Run()
      class A { }
      A.location = randomLocation()
      A.origin = randomLocation()
      A.owner = randomOwner()
      A.satoshis = 0
      A.nonce = 1
      const error = 'Must not have any bindings'
      expect(() => run.deploy(A)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if depend on Code', () => {
      const run = new Run()
      class A extends Code { }
      const error = 'The Code class cannot be used in jigs'
      expect(() => run.deploy(A)).to.throw(error)
      class B {}
      B.Code = Code
      expect(() => run.deploy(B)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if error creating parent dependency', () => {
      const run = new Run()
      class A { }
      class B extends A { }
      B.Date = Date
      expect(() => run.deploy(B)).to.throw('Cannot install intrinsic')
    })
  })
})

// ------------------------------------------------------------------------------------------------
