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
const { Code, Jig, Berry, LocalCache, sandbox } = Run
const unmangle = require('../env/unmangle')
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
 * @param {?number} nin Number of references
 * @param {?Array} out Output hashes
 * @param {?Array} del Deleted hashes
 * @param {?Array} ncre Number of creates
 * @param {?Array} exec Program instructions
 */
function expectTx (opts) {
  const run = Run.instance

  function verify (rawtx) {
    const tx = new Transaction(rawtx)
    console.log(tx.toString())
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

  describe.only('deploy', () => {
    it.only('basic class', async () => {
      const run = new Run()

      class A { }

      const test = CA => {
        expect(typeof CA).to.equal('function')
        expect(CA.toString()).to.equal(A.toString())
        expect(CA).not.to.equal(A)
      }

      expectTx({
        nin: 2,
        nref: 2,
        out: [],
        del: [],
        ncre: 2,
        exec: []
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

    it('basic function', async () => {
      const run = new Run()

      function f () { }

      const test = cf => {
        expect(typeof cf).to.equal('function')
        expect(cf.toString()).to.equal(f.toString())
        expect(cf).not.to.equal(f)
      }

      const cf = run.deploy(f)
      test(cf)

      await cf.sync()
      const cf2 = await run.load(cf.location)
      test(cf2)

      run.cache = new LocalCache()
      const cf3 = await run.load(cf.location)
      test(cf3)
    })

    it('creates code for class only once', async () => {
      const run = new Run()
      class A { }
      const CA1 = run.deploy(A)
      const CA2 = run.deploy(A)
      expect(CA1 === CA2).to.equal(true)
    })

    it('creates code for function only once', () => {
      const run = new Run()
      function f () { }
      const cf1 = run.deploy(f)
      const cf2 = run.deploy(f)
      expect(cf1 === cf2).to.equal(true)
    })

    it('returns code for code', () => {
      const run = new Run()
      class A { }
      const CA1 = run.deploy(A)
      const CA2 = run.deploy(CA1)
      expect(CA1).to.equal(CA2)
    })
  })

  describe('parents', () => {
    it('deploys parent', async () => {
      class A { }
      class B extends A { }

      const test = (CA, CB) => {
        expect(CA.location.endsWith('_o1')).to.equal(true)
        expect(CB.location.endsWith('_o2')).to.equal(true)
      }

      const run = new Run()
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
  })

  describe.skip('deploy old', () => {
    // ------------------------------------------------------------------------
    // Create parents
    // ------------------------------------------------------------------------

    it('reuses installed code for parent', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B extends A { }
      const CB = run.deploy(B)
      expect(Object.getPrototypeOf(CB)).to.equal(CA)
    })

    it('reueses parent that is code', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B extends CA { }
      const CB = run.deploy(B)
      expect(Object.getPrototypeOf(CB)).to.equal(CA)
    })

    it('creates code for parent chain', () => {
      const run = new Run()
      class A { }
      class B extends A { }
      class C extends B { }
      const CC = run.deploy(C)
      const CB = run.deploy(B)
      const CA = run.deploy(A)
      expect(Object.getPrototypeOf(CC)).to.equal(CB)
      expect(Object.getPrototypeOf(CB)).to.equal(CA)
    })

    // ------------------------------------------------------------------------
    // Props
    // ------------------------------------------------------------------------

    // Helper to create a code with a prop
    function prop (a) {
      const run = new Run()
      class A { }
      A.x = a
      const CA = run.deploy(A)
      return CA.x
    }

    it('creates boolean props', () => {
      expect(prop(false)).to.equal(false)
      expect(prop(true)).to.equal(true)
      expect(prop({ n: false }).n).to.equal(false)
    })

    it('creates undefined props', () => {
      expect(prop(undefined)).to.equal(undefined)
      expect(prop([undefined])[0]).to.equal(undefined)
    })

    it('creates number props', () => {
      expect(prop(0)).to.equal(0)
      expect(prop(1)).to.equal(1)
      expect(prop(-1)).to.equal(-1)
      expect(prop(1.5)).to.equal(1.5)
      expect(prop(Number.MIN_SAFE_INTEGER)).to.equal(Number.MIN_SAFE_INTEGER)
      expect(prop(Number.MAX_SAFE_INTEGER)).to.equal(Number.MAX_SAFE_INTEGER)
      expect(prop(Number.MIN_VALUE)).to.equal(Number.MIN_VALUE)
      expect(prop(Number.MAX_VALUE)).to.equal(Number.MAX_VALUE)
      expect(prop(Number.POSITIVE_INFINITY)).to.equal(Number.POSITIVE_INFINITY)
      expect(prop(Number.NEGATIVE_INFINITY)).to.equal(Number.NEGATIVE_INFINITY)
      expect(isNaN(prop(NaN))).to.equal(true)
      expect(prop([1])[0]).to.equal(1)
    })

    it('creates string props', () => {
      expect(prop('')).to.equal('')
      expect(prop('abc')).to.equal('abc')
      expect(prop('0\n1\n2\n3\n')).to.equal('0\n1\n2\n3\n')
      expect(prop('😄')).to.equal('😄')
      const long = 'x'.repeat(10000)
      expect(prop(long)).to.equal(long)
      expect(prop({ a: ['a'] }).a[0]).to.equal('a')
    })

    it('creates sandboxed array props', () => {
      const a = []
      expect(prop(a)).not.to.equal(a)
      expect(prop([]) instanceof Array).to.equal(false)
      expect(prop([]) instanceof SI.Array).to.equal(true)
      expect(prop([])).to.deep.equal([])
      expect(prop([1, 2, 3])).to.deep.equal([1, 2, 3])
      expect(prop([[[]]])).to.deep.equal([[[]]])
      expect(prop({ a: [] }).a).to.deep.equal([])
      const sparseArray = []
      sparseArray[0] = 1
      sparseArray[99] = 2
      const sparseArrayProp = prop(sparseArray)
      expect(sparseArrayProp.length).to.equal(sparseArray.length)
      expect(sparseArrayProp[0]).to.equal(1)
      expect(sparseArrayProp[99]).to.equal(2)
      expect(sparseArrayProp[1]).to.equal(undefined)
      const arrayWithProps = []
      arrayWithProps.a = 'b'
      expect(prop(arrayWithProps)).to.deep.equal(arrayWithProps)
    })

    it('creates sandboxed object props', () => {
      const o = {}
      expect(prop(o)).not.to.equal(o)
      expect(prop({}) instanceof Object).to.equal(false)
      expect(prop({}) instanceof SI.Object).to.equal(true)
      expect(prop({})).to.deep.equal({})
      expect(prop({ n: 1, m: 2 })).to.deep.equal({ n: 1, m: 2 })
      expect(prop({ n: {} })).to.deep.equal({ n: {} })
      expect(prop([{}])).to.deep.equal([{}])
      expect(prop(null)).to.equal(null)
    })

    it('creates sandboxed Set props', () => {
      const s = new Set()
      expect(prop(s)).not.to.equal(s)
      expect(prop(new Set()) instanceof Set).to.equal(false)
      expect(prop(new Set()) instanceof SI.Set).to.equal(true)
      expect(prop(new Set())).to.deep.equal(new Set())
      expect(prop(new Set([1, 2, 3]))).to.deep.equal(new Set([1, 2, 3]))
      expect(prop(new Set([{}, [], null, new Set()]))).to.deep.equal(new Set([{}, [], null, new Set()]))
      const set = new Set([1, 2])
      set.a = []
      set.s = new Set()
      const setProp = prop(set)
      expect(setProp).to.deep.equal(set)
      expect(setProp.a).to.deep.equal([])
      expect(setProp.s).to.deep.equal(new Set())
      expect(setProp.has(1)).to.equal(true)
    })

    it('creates sandboxed Map props', () => {
      const m = new Map()
      expect(prop(m)).not.to.equal(m)
      expect(prop(new Map()) instanceof Map).to.equal(false)
      expect(prop(new Map()) instanceof SI.Map).to.equal(true)
      expect(prop(new Map())).to.deep.equal(new Map())
      expect(prop(new Map([[1, 2], [3, 4]]))).to.deep.equal(new Map([[1, 2], [3, 4]]))
      expect(prop(new Map([['a', new Map()]]))).to.deep.equal(new Map([['a', new Map()]]))
      expect(prop(new Map([[{}, null]]))).to.deep.equal(new Map([[{}, null]]))
      const map = new Map([[1, 2]])
      map.b = false
      map.u = undefined
      const mapProp = prop(map)
      expect(mapProp).to.deep.equal(map)
      expect(mapProp.b).to.equal(false)
      expect('u' in mapProp).to.equal(true)
      expect(mapProp.u).to.equal(undefined)
      expect(mapProp.get(1)).to.equal(2)
    })

    it('creates sandboxed Uint8Array props', () => {
      const u = new Uint8Array()
      expect(prop(u)).not.to.equal(u)
      expect(prop(new Uint8Array()) instanceof Uint8Array).to.equal(false)
      expect(prop(new Uint8Array()) instanceof SI.Uint8Array).to.equal(true)
      expect(prop(new Uint8Array())).to.deep.equal(new Uint8Array())
      expect(prop(new Uint8Array([0, 1, 255]))).to.deep.equal(new Uint8Array([0, 1, 255]))
    })

    it('creates cirular props', () => {
      const o = { }
      o.o = o
      o.a = [o]
      o.a.push(o.a)
      const p = prop(o)
      expect(p.o).to.equal(p)
      expect(p.a[0]).to.equal(p)
      expect(p.a[1]).to.equal(p.a)
    })

    it('creates code for self-reference prop', () => {
      const run = new Run()
      class A { }
      A.A = A
      const CA = run.deploy(A)
      expect(CA.A).to.equal(CA)
    })

    it('copies code props', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B { }
      B.CA = CA
      const CB = run.deploy(B)
      expect(CB.CA).to.equal(CA)
    })

    it('creates code for function props', () => {
      const run = new Run()
      class A { }
      function f () { }
      A.f = f
      const CA = run.deploy(A)
      expect(CA.f).not.to.equal(f)
      expect(CA.f).to.equal(run.deploy(f))
    })

    it('creates circular code props', () => {
      const run = new Run()
      class A { }
      class B { }
      A.B = B
      B.A = A
      const CA = run.deploy(A)
      const CB = run.deploy(B)
      expect(CA.B).to.equal(CB)
      expect(CB.A).to.equal(CA)
    })

    it('creates circular parent-child code', () => {
      const run = new Run()
      class B { }
      class A extends B { }
      B.A = A
      const CA = run.deploy(A)
      const CB = run.deploy(B)
      expect(Object.getPrototypeOf(CA)).to.equal(CB)
      expect(CB.A).to.equal(CA)
    })

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
