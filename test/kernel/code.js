/**
 * code.js
 *
 * Tests for lib/kernel/code.js
 */

const { describe, it, afterEach } = require('mocha')
const { stub } = require('sinon')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { Transaction, PrivateKey } = require('bsv')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { Code, Jig, Berry, LocalCache, sandbox, _payload } = unmangle(Run)
const SI = unmangle(sandbox)._intrinsics
const Membrane = unmangle(unmangle(Run)._Membrane)
const { payFor } = require('../env/misc')

// Written Tests:
//
// Jig
//  - Code methods not present
//  - Can assign properties to code methods (only upgrade)
//  - Getter that sets
//  - Ownership: Create object, pass into another method, set on other jig, then set on current jig => fail
//
// Code
//  - defineProperty disabled
//  - getters and setters either allowed, or not allowed
//  - Code methods cannot be deleted, or redefined, either from inside or outside
//  - All prop tests also test with load
//  - Bad parent
//  - Prop tests should be in a set, in an array, on base
//  - Test sandbox

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
// expectTx
// ------------------------------------------------------------------------------------------------

/**
 * Checks the payload data in next Run transaction broadcast
 *
 * @param {object} opts
 * @param {?number} nin Number of inputs
 * @param {?number} nref Number of references
 * @param {?Array} out Output hashes
 * @param {?Array} del Deleted hashes
 * @param {?Array} ncre Number of creates
 * @param {?Array} exec Program instructions
 */
function expectTx (opts) {
  const run = Run.instance

  function verify (rawtx) {
    const tx = new Transaction(rawtx)
    const payload = _payload(tx)
    if ('nin' in opts) expect(payload.in).to.equal(opts.nin)
    if ('nref' in opts) expect(payload.ref.length).to.equal(opts.nref)
    if ('nout' in opts) expect(payload.out.length).to.equal(opts.nout)
    if ('ndel' in opts) expect(payload.del.length).to.equal(opts.ndel)
    if ('ncre' in opts) expect(payload.cre.length).to.equal(opts.ncre)
    if ('exec' in opts) expect(payload.exec).to.deep.equal(opts.exec)
  }

  // Hook run.blockchain to verify the next transaction then disable the hook
  const oldBroadcast = run.blockchain.broadcast
  run.blockchain.broadcast = rawtx => {
    run.blockchain.broadcast = oldBroadcast
    verify(rawtx)
    return oldBroadcast.call(run.blockchain, rawtx)
  }
}

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

describe('Code', () => {
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
  })

  describe.skip('deploy old', () => {
    it.skip('creates code for arbitrary objects', () => {
      // TODO
    })

    it.skip('copies jig props', () => {
      // TODO
    })

    it.skip('copies berry props', () => {
      // TODO
    })

    it.skip('copies native props', () => {
      // TODO
    })

    // Helper to test unsupported props
    function expectPropFail (x, error) {
      const run = new Run()
      class A { }
      A.x = x
      // TODO: Remove
      console.log(x.toString())
      expect(() => run.deploy(A)).to.throw(error)
    }

    it.skip('throws for intrinsic props', () => {
      const error = 'Cannot install intrinsic'
      expectPropFail(Math, error)
      expectPropFail(Date, error)
      expectPropFail(isNaN, error)
      expectPropFail(Error, error)
    })

    it.skip('throws for unsupported objects', () => {
      expectPropFail(new Date())
      expectPropFail(new Uint16Array())
      expectPropFail(Promise.resolve())
      expectPropFail(new WeakSet())
      expectPropFail(new WeakMap())
      expectPropFail(new RegExp())
      expectPropFail(/abc/)
      expectPropFail(new Error())
    })

    it.skip('throws if extend intrinsics', () => {
      expectPropFail(new (class MyArray extends Array {})())
      expectPropFail(new (class MySet extends Set {})())
      expectPropFail(new (class MyMap extends Map {})())
      expectPropFail(new (class MyUint8Array extends Uint8Array {})())
    })

    it.skip('throws for anonymous functions', () => {
      expectPropFail(function () { })
      expectPropFail(() => { })
      expectPropFail(class { })
    })

    // ------------------------------------------------------------------------
    // Deps
    // ------------------------------------------------------------------------

    it('makes deps globals', () => {
      const run = new Run()
      class A { }
      function f () { return A }
      f.deps = { A }
      const sf = run.deploy(f)
      expect(sf()).to.equal(run.deploy(A))
    })

    it('supports normal javascript values as deps', () => {
      const run = new Run()
      class A {
        static n () { return n } // eslint-disable-line
        static o () { return o } // eslint-disable-line
      }
      A.deps = { n: 1, o: { a: [] } }
      const CA = run.deploy(A)
      expect(CA.n()).to.equal(1)
      expect(CA.o()).not.to.equal(A.deps.o)
      expect(CA.o()).to.deep.equal(A.deps.o)
      expect(CA.o() instanceof SI.Object).to.equal(true)
      expect(CA.o().a instanceof SI.Array).to.equal(true)
    })

    it('sets deps on returned code jig', () => {
      const run = new Run()
      class A { }
      class B { }
      A.deps = { B }
      const CA = run.deploy(A)
      expect(CA.deps.B).to.equal(run.deploy(B))
    })

    it('automatically adds parent dep', () => {
      const run = new Run()
      class A { }
      class B extends A { }
      const CB = run.deploy(B)
      expect(CB.deps).to.deep.equal({ A: Object.getPrototypeOf(CB) })
    })

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

    it('does not install parent deps on child', () => {
      const run = new Run()
      class B { f () { return n } } // eslint-disable-line
      class A extends B { g () { return n } } // eslint-disable-line
      B.deps = { n: 1 }
      const CB = run.deploy(B)
      const b = new CB()
      expect(b.f()).to.equal(1)
      const CA = run.deploy(A)
      const a = new CA()
      expect(() => a.g()).to.throw()
    })

    it.skip('throws if dep is unsupported', () => {
      const run = new Run()
      class A { }
      A.deps = { Date }
      expect(() => run.deploy(A)).to.throw('Cannot install intrinsic')
      A.deps = { A: () => { } }
      expect(() => run.deploy(A)).to.throw('TODO')
      A.deps = { r: new RegExp() }
      expect(() => run.deploy(A)).to.throw('TODO')
    })

    it.skip('supports berry deps', () => {
      // TODO
    })

    it.skip('supports jig deps', () => {
      // TODO
    })

    // ------------------------------------------------------------------------
    // Presets
    // ------------------------------------------------------------------------

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

    it.skip('supports non-binding presets', () => {
      // TODO
    })

    it.skip('deploys code presets', () => {
      // TODO
    })

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

    it('throws if parent dependency mismatch', () => {
      const run = new Run()
      class A { }
      class C { }
      class B extends A { }
      B.deps = { A: C }
      expect(() => run.deploy(B)).to.throw('Parent dependency mismatch')
    })

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
      A.presets[network].nonce = -1
      expect(() => run.deploy(A)).to.throw()
      A.presets[network].nonce = null
      expect(() => run.deploy(A)).to.throw()
      A.presets = []
      expect(() => run.deploy(A)).to.throw()
      A.presets = { [network]: new class Presets {}() }
      expect(() => run.deploy(A)).to.throw()
    })

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

    it.skip('throws if presets contain unsupported values', () => {
      // On current network and different network
    })

    // ------------------------------------------------------------------------
    // Error cases
    // ------------------------------------------------------------------------

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

    it('throws if prototype inheritance', () => {
      const run = new Run()
      function A () { }
      function B () { }
      B.prototype = Object.create(A.prototype)
      const error = 'Prototypal inheritance not supported'
      expect(() => run.deploy(B)).to.throw(error)
    })

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

    it('throws if depend on Code', () => {
      const run = new Run()
      class A extends Code { }
      const error = 'The Code class cannot be used in jigs'
      expect(() => run.deploy(A)).to.throw(error)
      class B {}
      B.Code = Code
      expect(() => run.deploy(B)).to.throw(error)
    })

    it('throws if error creating parent dependency', () => {
      const run = new Run()
      class A { }
      class B extends A { }
      B.Date = Date
      expect(() => run.deploy(B)).to.throw('Cannot install intrinsic')
    })
  })

  describe('deploy', () => {
    it('sets initial bindings', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      Membrane._sudo(() => {
        expect(CA.location.startsWith('commit://')).to.equal(true)
        expect(CA.origin.startsWith('commit://')).to.equal(true)
        expect(CA.nonce).to.equal(0)
        expect(unmangle(CA.owner)._value).to.equal(undefined)
        expect(unmangle(CA.satoshis)._value).to.equal(undefined)
      })
    })

    it('assigns bindings after sync', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      await run.sync()
      expect(CA.location.endsWith('_o1')).to.equal(true)
      expect(CA.origin.endsWith('_o1')).to.equal(true)
      expect(CA.nonce).to.equal(0)
      const owner = await run.owner.owner()
      expect(CA.owner).to.equal(owner)
      expect(CA.satoshis).to.equal(0)
    })

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

    it('deploys parent and child', async () => {
      const run = new Run()
      class A {}
      class B extends A {}
      run.deploy(B)
      await run.sync()
      expect(A.location.endsWith('_o1')).to.equal(true)
      expect(B.location.endsWith('_o2')).to.equal(true)
    })

    it('deploys jig props', async () => {
      const run = new Run()
      class A { }
      class B { }
      A.B = B
      run.deploy(A)
      await run.sync()
      expect(A.location.endsWith('_o1')).to.equal(true)
      expect(B.location.endsWith('_o2')).to.equal(true)
    })
  })

  describe('toString', () => {
    it('should return source code for class', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(CA.toString().startsWith('class A')).to.equal(true)
    })

    it('should return source code for function', () => {
      const run = new Run()
      function f () { }
      const cf = run.deploy(f)
      expect(cf.toString().startsWith('function f')).to.equal(true)
    })

    it('should return source code for jig class', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      expect(CA.toString().startsWith('class A extends Jig')).to.equal(true)
    })

    it('should return soure code for child code class', () => {
      const run = new Run()
      class A { }
      class B extends A { }
      const CB = run.deploy(B)
      expect(CB.toString().startsWith('class B')).to.equal(true)
    })

    it('should return source code for child non-code class', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B extends CA { }
      expect(B.toString().startsWith('class B')).to.equal(true)
    })

    it('should return same method for different code', () => {
      const run = new Run()
      class A { }
      function f () { }
      const CA = run.deploy(A)
      const cf = run.deploy(f)
      expect(CA.toString).to.equal(cf.toString)
      expect(CA.toString()).not.to.equal(cf.toString())
    })
  })

  describe('get', () => {
    it('adds invisible code methods to class', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CODE_METHODS.forEach(name => expect(typeof CA[name]).to.equal('function'))
      CODE_METHODS.forEach(name => expect(Object.getOwnPropertyNames(CA).includes(name)).to.equal(false))
    })

    it('adds invisible code methods to function', () => {
      const run = new Run()
      function f () { }
      const cf = run.deploy(f)
      CODE_METHODS.forEach(name => expect(typeof cf[name]).to.equal('function'))
      CODE_METHODS.forEach(name => expect(Object.getOwnPropertyNames(cf).includes(name)).to.equal(false))
    })

    it('code methods for class are always the same', () => {
      const run = new Run()
      class A { }
      class B { }
      const CA = run.deploy(A)
      const CB = run.deploy(B)
      expect(CA.upgrade).to.equal(CA.upgrade)
      expect(CA.sync).to.equal(CB.sync)
    })

    it('code methods for class are frozen', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CODE_METHODS.forEach(name => expect(Object.isFrozen(CA[name])))
    })

    it('does not have code methods', () => {
      CODE_METHODS.forEach(method => {
        expect(method in Jig).to.equal(false)
        expect(method in Berry).to.equal(false)
      })
    })

    it('same method is returned every time', () => {
      const run = new Run()
      class A { static f () { } }
      const CA = run.deploy(A)
      expect(typeof CA.f).to.equal('function')
      expect(CA.f).to.equal(CA.f)
    })

    it('same method is returned for child code', () => {
      const run = new Run()
      class A { static f () { } }
      const CA = run.deploy(A)
      class B extends CA {}
      const CB = run.deploy(B)
      expect(typeof CB.f).to.equal('function')
      expect(CB.f).to.equal(CA.f)
    })

    it('initial bindings are unreadable', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(() => CA.location).to.throw('Cannot read location: undetermined')
      expect(() => CA.origin).to.throw('Cannot read origin: undetermined')
      expect(() => CA.nonce).to.throw('Cannot read nonce: undetermined')
      expect(() => CA.owner).to.throw('Cannot read owner: unbound')
      expect(() => CA.satoshis).to.throw('Cannot read satoshis: unbound')
    })

    it('name is class or function name', () => {
      const run = new Run()
      class A { }
      expect(run.deploy(A).name).to.equal('A')
      function f () { }
      expect(run.deploy(f).name).to.equal('f')
      class B extends A { }
      expect(run.deploy(B).name).to.equal('B')
    })
  })

  describe('instanceof', () => {
    it('deployed classes returns true', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(CA instanceof Code).to.equal(true)
    })

    it('deployed functions returns true', () => {
      const run = new Run()
      function f () { }
      const cf = run.deploy(f)
      expect(cf instanceof Code).to.equal(true)
    })

    it('non-code return false', () => {
      expect(class A { } instanceof Code).to.equal(false)
      expect(function f () { } instanceof Code).to.equal(false)
      expect(undefined instanceof Code).to.equal(false)
      expect(true instanceof Code).to.equal(false)
      expect({} instanceof Code).to.equal(false)
    })

    it('native code return true', () => {
      expect(Jig instanceof Code).to.equal(true)
      expect(Berry instanceof Code).to.equal(true)
    })
  })

  describe('getOwnPropertyDescriptor', () => {
    it('returned undefined for code methods', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CODE_METHODS.forEach(name => expect(Object.getOwnPropertyDescriptor(CA, name)).to.equal(undefined))
    })
  })

  describe('isExtensible', () => {
    it('returns true', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(Object.isExtensible(CA)).to.equal(true)
    })
  })

  describe('setPrototypeOf', () => {
    it('throws if change externally', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(() => Object.setPrototypeOf(CA, {})).to.throw()
    })

    it.skip('throws if change internally', () => {
      // TODO
    })

    it('allowed to change on non-code child', () => {
      const run = new Run()
      class A {}
      const CA = run.deploy(A)
      class B extends CA { }
      Object.setPrototypeOf(B, {})
    })
  })

  describe.skip('deploy', () => {
    it.skip('deploys with custom lock', async () => {
      const run = new Run()
      class L {
        script () { return new Uint8Array() }
        domain () { return 0 }
      }
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
  })

  describe.skip('sealed', () => {
    it.skip('sealed by default', () => {
      const run = new Run()
      class A { }
      A.options = { utility: true }
      const CA = run.deploy(A)
      CA.deploy()
      class C extends A { }
      const CC = run.deploy(C)
      CC.deploy()
      // TODO: Parent approval
    })

    it('allows unsealing', async () => {
      const run = new Run()
      class A { }
      A.sealed = false
      class B extends A { }
      const CA = run.deploy(A)
      await run.sync()
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.deploy(B)
      await CA.sync()
      expect(CA.origin).to.equal(CA.location)
    })

    it('throws if invalid', () => {
      const run = new Run()
      class A { }
      A.sealed = null
      expect(() => run.deploy(A)).to.throw('Invalid sealed option: null')
      A.sealed = 1
      expect(() => run.deploy(A)).to.throw('Invalid sealed option: 1')
    })
  })

  describe.skip('methods', () => {
    // Code functions are not available inside functions
  })

  describe.skip('sync', () => {
    // Only waits for current record
    // TODO: Check records

    it('deploys a class and syncs it', async () => {
      const run = new Run()
      class A {}
      run.deploy(A)
      await run.sync()
      const A2 = await run.load(A.location)
      expect(A2.toString()).to.equal(A.toString())
      expect(A2.origin).to.equal(A.origin)
      expect(A2.location).to.equal(A.location)
    })

    it('publishes after dependent transaction', async () => {
      const run = new Run()

      class A { }
      class B extends A { }
      A.B = B

      run.deploy(A)
      await run.sync()

      await run.load(A.location)

      const B2 = await run.load(B.location)

      class C extends B2 { }
      run.deploy(C)
      await run.sync()
    })

    it('should sync with warning when UTXO is incorrectly spent', async () => {
      const run = new Run()

      class A { }
      const C = run.deploy(A)

      await C.sync()
      const location = C.location

      const utxos = await run.blockchain.utxos(run.owner.address)
      const tx = new Transaction().from(utxos)
      const paid = await payFor(tx, run)
      const signed = paid.sign(run.owner.privkey)
      await run.blockchain.broadcast(signed.toString('hex'))

      await C.sync()
      expect(C.location).to.equal(location)
    })
  })

  describe.skip('upgrade', () => {
    it('should replace code', async () => {
      const run = new Run()

      class A { f () { } }
      const CA = run.deploy(A)

      expect(typeof CA.prototype.f).to.equal('function')
      expect(CA.toString()).to.equal(A.toString())
      expect(CA.name).to.equal(A.name)

      const x = new CA()

      expect(x instanceof CA).to.equal(true)
      expect(typeof x.f).to.equal('function')

      run.deploy(A)
      await CA.sync()

      class B { g () { } }
      CA.upgrade(B)

      expect(typeof CA.prototype.f).to.equal('undefined')
      expect(typeof CA.prototype.g).to.equal('function')
      expect(CA.toString()).to.equal(B.toString())
      expect(CA.name).to.equal(B.name)
      expect(CA.prototype.constructor).to.equal(CA)

      const y = new CA()

      expect(y instanceof CA).to.equal(true)
      expect(typeof y.f).to.equal('undefined')
      expect(typeof y.g).to.equal('function')

      expect(x instanceof CA).to.equal(true)
      expect(typeof x.f).to.equal('undefined')
      expect(typeof x.g).to.equal('function')

      // Load with cache
      await run.sync()
      await run.load(CA.origin)
      await run.load(CA.location)

      // Load without cache
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(CA.origin)
      await run2.load(CA.location)
    })

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
  })

  describe.skip('activate', () => {
    it('simple activate test', async () => {
      const run = new Run()
      class A { }
      run.deploy(A)
      await run.sync()
      const location = A.location

      run.deactivate()
      expect(typeof A.location).to.equal('undefined')

      run.activate()
      expect(A.location).to.equal(location)
    })
  })

  describe.skip('destroy', () => {
    it('destroys code', async () => {
      const run = new Run()
      class A { }
      const C = run.deploy(A)
      await C.sync()

      C.destroy()
      await C.sync()
      expect(C.location.endsWith('_d0')).to.equal(true)

      // Load from state cache
      await run.load(C.origin)
      await run.load(C.location)

      // Load via replay
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(C.location)
    })
  })

  describe.skip('load', () => {
    it('loads circular jig props', async () => {
      const run = new Run()

      class A { }
      class B { }
      A.B = B
      B.A = A

      run.deploy(A)
      await run.sync()

      // Load from cache
      const CA = await run.load(A.location)
      expect(CA.B.A).to.equal(CA)

      // Load via replay
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      const CA2 = await run2.load(A.location)
      expect(CA2.B.A).to.equal(CA2)
    })
  })

  describe.skip('auth', () => {
    it('auths code', async () => {
      const run = new Run()
      class A { }
      const C = run.deploy(A)
      await C.sync()

      C.auth()
      await C.sync()
      expect(C.origin).not.to.equal(C.location)

      // Load from state cache
      await run.load(C.origin)
      await run.load(C.location)

      // Load via replay
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(C.location)
    })

    // Auth fails on new jigs, or when owner transfers in a batch
    // Auth is allowed when unbound and undefined, but a different transaction
  })

  describe.skip('call', () => {
    it('calls static get method on jig', async () => {
      const run = new Run()
      class A extends Jig { static f (x) { return 123 + x } }
      const C = run.deploy(A)
      await C.sync()
      expect(C.f(1)).to.equal(124)
      expect(C.origin).to.equal(C.location)
    })

    it('calls static set method on jig', async () => {
      const run = new Run()
      class A extends Jig { static f (x) { this.x = x } }
      const C = run.deploy(A)
      await C.sync()
      C.f(1)
      expect(C.x).to.equal(1)
      await C.sync()
      expect(C.location).not.to.equal(C.origin)

      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      const C2 = await run2.load(C.location)

      expect(C.location).to.equal(C2.location)
      expect(C.x).to.equal(C2.x)
    })

    // TODO: Move to deploy
    it('allowed to set native class as dependency', async () => {
      const run = new Run()
      class A extends Jig { static f (x) { this.x = x } }
      A.deps = { Jig }
      const C = run.deploy(A)
      await C.sync()
    })

    it('calls static method with passthrough and without this on non-jig', async () => {
      const run = new Run()
      class A {
        static f (x) {
          if (x !== Symbol.hasInstance) throw new Error()
          if (this) throw new Error()
          return Symbol.iterator
        }
      }
      const C = run.deploy(A)
      await C.sync()
      expect(C.f(Symbol.hasInstance)).to.equal(Symbol.iterator)
    })

    it('can only call static methods on class they are from', async () => {
      const run = new Run()

      class A extends Jig {
        static f () { this.f = 'a' }
        static g () { this.g = 'a' }
      }

      class B extends A {
        static g () { this.g = 'b' }
        static h () { this.h = 'b' }
      }

      const CA = run.deploy(A)
      await CA.sync()

      const CB = run.deploy(B)
      await CB.sync()
      // CB.h()
      // await CB.sync()
      // console.log(CB)
    })
  })

  describe.skip('get', () => {
    it('returns the same method twice', async () => {
      const run = new Run()
      class A { static f () { return 123 } }
      const C = run.deploy(A)
      await C.sync()
      expect(C.f).to.equal(C.f)
      expect(C.f()).to.equal(123)

      // Move these to separate tests
      // C.f.x = 1
      /*
      class B {
        static g () { this.x = 1 }
        static h () { this.g.x = 1 }
      }
      const D = run.deploy(B)
      await D.sync()
      // D.g()
      D.h()
      */
    })
  })

  // Constructing Code objects inside... they would normally construct sandbox. How to do base?
  //      Need for arb objects
  // Clean up loader
  // Spend all stack when set
  // Spend all stack when delete
  // Spend all stack when create too
  // Handle auth and destroy
  // Borrowing
  // Cache protocol
  // Inheritance and upgrading parents

  // TODO: Delete a parent class property from a child?
  // Classes should always operate on themselves

  // Test set properties on child when there is a similar property on parent class
  // Same for delete. There's a comment in membrane about this.
  // Call auth in a jig

  // Owner is parent ... for new jigs
})

// ------------------------------------------------------------------------------------------------
