/**
 * membrane.js
 *
 * Tests for lib/kernel/membrane.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { mangle } = unmangle
const Membrane = unmangle(Run)._Membrane
const Rules = unmangle(Run)._Rules
const Proxy2 = unmangle(unmangle(Run)._Proxy2)
const Unbound = unmangle(Run)._Unbound
const _sudo = unmangle(Run)._sudo
const JIGS = unmangle(unmangle(Run)._Universal)._JIGS

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const DUMMY_OWNER = '1NbnqkQJSH86yx4giugZMDPJr2Ss2djt3N'

// Helper to test recording calls and then roll back any changes
function testRecord (f) {
  const CURRENT_RECORD = unmangle(unmangle(unmangle(Run)._Record)._CURRENT_RECORD)
  try {
    CURRENT_RECORD._begin()
    return f(CURRENT_RECORD)
  } finally {
    CURRENT_RECORD._rollback()
  }
}

// Helpers to make a mock jig with a membrane
function makeJig (x, options) {
  options = mangle(Object.assign(options, { _admin: true }))
  const jig = new Membrane(x, options)
  _sudo(() => {
    jig.location = `abc_o${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)}`
    jig.origin = `def_o${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)}`
    jig.nonce = 0
    jig.owner = null
    jig.satoshis = null
  })
  JIGS.add(jig)
  if (typeof x === 'function') {
    const desc = { value: jig, configurable: true, enumerable: true, writable: true }
    Object.defineProperty(x.prototype, 'constructor', desc)
  }
  return jig
}

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

describe('Membrane', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('creates proxy', () => {
      class A { }
      const A2 = new Membrane(A)
      expect(Proxy2._getTarget(A2)).to.equal(A)
      expect(Proxy2._getProxy(A)).to.equal(A2)
    })

    it('assigns rules', () => {
      const rules = new Rules()
      const A = new Membrane(class A { }, rules)
      expect(unmangle(Proxy2._getHandler(A))._rules).to.equal(rules)
    })
  })

  // --------------------------------------------------------------------------
  // Base Handlers
  // --------------------------------------------------------------------------

  // Tests for the base handler when there are no other configurations
  describe('Base Handlers', () => {
    it('apply', () => {
      function f (x) { return x }
      const f2 = new Membrane(f)
      expect(f2(1)).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('construct', () => {
      class A { }
      const A2 = new Membrane(A)
      expect(new A2() instanceof A2).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('defineProperty', () => {
      const m = new Membrane(class A { })
      const desc = { value: 1, configurable: true, enumerable: true, writable: true }
      Object.defineProperty(m, 'n', desc)
      expect('n' in m).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('delete', () => {
      class A { }
      A.n = 1
      const A2 = new Membrane(A)
      delete A2.n
      expect('n' in A2).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('get', () => {
      class A { }
      A.n = 1
      const A2 = new Membrane(A)
      expect(A2.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('get on different receiver', () => {
      const A = new Membrane(class A { }, { _admin: true })
      A.n = 1
      expect(Reflect.get(A, 'n', { n: 2 })).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('getOwnPropertyDescriptor', () => {
      class A { }
      A.n = 1
      const A2 = new Membrane(A)
      const desc = { value: 1, configurable: true, enumerable: true, writable: true }
      expect(Object.getOwnPropertyDescriptor(A2, 'n')).to.deep.equal(desc)
    })

    // ------------------------------------------------------------------------

    it('getPrototypeOf', () => {
      class B { }
      class A extends B { }
      const A2 = new Membrane(A)
      expect(Object.getPrototypeOf(A2)).to.equal(B)
    })

    // ------------------------------------------------------------------------

    it('has', () => {
      class A { }
      A.n = 1
      const A2 = new Membrane(A)
      expect('n' in A2).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('isExtensible', () => {
      const m = new Membrane(class A { })
      expect(Object.isExtensible(m)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('ownKeys', () => {
      class A { }
      A.n = 1
      const A2 = new Membrane(A)
      const keys = ['length', 'prototype', 'name', 'n'].sort()
      expect(Reflect.ownKeys(A2).sort()).to.deep.equal(keys)
    })

    // ------------------------------------------------------------------------

    it('preventExtensions disabled', () => {
      const m = new Membrane(class A { })
      expect(() => Object.preventExtensions(m)).to.throw('preventExtensions disabled')
    })

    // ------------------------------------------------------------------------

    it('set', () => {
      const m = new Membrane(class A { })
      m.n = 1
      expect(m.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('set on non-membrane child class', () => {
      const A = new Membrane(class A { })
      class B extends A { }
      B.n = 1
      expect(B.n).to.equal(1)
      expect(A.n).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('setPrototypeOf disabled', () => {
      class A { }
      const A2 = new Membrane(A)
      expect(() => Object.setPrototypeOf(A2, class B { })).to.throw('setPrototypeOf disabled')
    })

    // ------------------------------------------------------------------------

    it('intrinsic handlers', () => {
      const jig = new Membrane(class A { })
      const m = new Membrane(new Map(), mangle({ _parentJig: jig }))
      m.set(1, 2)
      expect(m.get(1)).to.equal(2)
    })
  })

  // --------------------------------------------------------------------------
  // Admin
  // --------------------------------------------------------------------------

  describe('Admin', () => {
    it('admin mode runs directly on target', () => {
      class A { }
      const A2 = new Membrane(A, mangle({ _admin: true }))
      function f () { return f }
      const f2 = new Membrane(f, mangle({ _admin: true }))
      expect(_sudo(() => new A2()) instanceof A).to.equal(true)
      expect(_sudo(() => f2())).to.equal(f)
      _sudo(() => Object.defineProperty(A2, 'n', { value: 1, configurable: true }))
      expect(A.n).to.equal(1)
      _sudo(() => { delete A2.n })
      expect('n' in A).to.equal(false)
      A.n = 2
      expect(_sudo(() => Object.getOwnPropertyDescriptor(A2, 'n')).value).to.equal(2)
      expect(_sudo(() => Object.getPrototypeOf(A2))).to.equal(Object.getPrototypeOf(A))
      expect(_sudo(() => 'n' in A2)).to.equal(true)
      expect(_sudo(() => Object.isExtensible(A2))).to.equal(Object.isExtensible(A))
      A._private = 1
      expect(_sudo(() => Object.getOwnPropertyNames(A2))).to.deep.equal(Object.getOwnPropertyNames(A))
      _sudo(() => Object.preventExtensions(A2))
      expect(Object.isExtensible(A)).to.equal(false)
      _sudo(() => { f2.n = 1 })
      expect(f.n).to.equal(1)
      function g () { }
      _sudo(() => Object.setPrototypeOf(f2, g))
      expect(Object.getPrototypeOf(f)).to.equal(g)
      const m = new Map()
      const o = {}
      const m2 = new Membrane(m, mangle({ _admin: true, _parentJig: f }))
      const mset = m2.set
      const mhas = m2.has
      const mget = m2.get
      expect(_sudo(() => m2.set(o, 2))).to.equal(m2)
      expect(_sudo(() => mset.call(m2, o, 3))).to.equal(m2)
      expect(_sudo(() => mhas.call(m2, o))).to.equal(true)
      expect(_sudo(() => mget.call(m2, o))).to.equal(3)
      expect(_sudo(() => m.has(o))).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('admin mode overrides errors', () => {
      const f = new Membrane(function f () { }, mangle({ _admin: true }))
      _sudo(() => { f.location = 'error://hello' })
      expect(_sudo(() => f.location)).to.equal('error://hello')
    })
  })

  // --------------------------------------------------------------------------
  // Errors
  // --------------------------------------------------------------------------

  describe('Errors', () => {
    it('throws if use jig that has errors', () => {
      const A = new Membrane(class A { }, mangle({ _errors: true }))
      const f = new Membrane(function f () {}, mangle({ _errors: true }))
      const m = new Membrane(new Map(), mangle({ _parentJig: A, _errors: true }))

      const mset = m.set
      const mclear = m.clear
      const mget = m.get
      const mhas = m.has

      const error = 'hello'
      A.location = `error://${error}`
      f.location = `error://${error}`

      expect(() => new A()).to.throw()
      expect(() => f()).to.throw(error)
      expect(() => Object.defineProperty(A, 'n', { value: 1 })).to.throw(error)
      expect(() => { delete f.x }).to.throw(error)
      expect(() => A.x).to.throw(error)
      expect(() => Object.getOwnPropertyDescriptor(f, 'n')).to.throw(error)
      expect(() => Object.getPrototypeOf(A)).to.throw(error)
      expect(() => Object.isExtensible(f)).to.throw(error)
      expect(() => Object.getOwnPropertyNames(A)).to.throw(error)
      expect(() => Object.preventExtensions(f)).to.throw(error)
      expect(() => { A.n = 1 }).to.throw(error)
      expect(() => Object.setPrototypeOf(f, {})).to.throw(error)

      expect(() => m.set).to.throw(error)
      expect(() => mset.call(m, 1, 2)).to.throw(error)
      expect(() => mclear.call(m)).to.throw(error)
      expect(() => mget.call(m, 1)).to.throw(error)
      expect(() => mhas.call(m, 1)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if inner objects jig has errors', () => {
      const jig = new Membrane(class A { })
      jig.location = 'error://hello'
      const o = new Membrane({}, mangle({ _parentJig: jig, _errors: true }))
      expect(() => o.n).to.throw('hello')
    })
  })

  // --------------------------------------------------------------------------
  // Code methods
  // --------------------------------------------------------------------------

  describe('Code Methods', () => {
    it('has', () => {
      const f = new Membrane(function f () { }, mangle({ _code: true }))
      expect('sync' in f).to.equal(true)
      expect('upgrade' in f).to.equal(true)
      expect('destroy' in f).to.equal(true)
      expect('auth' in f).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('get', () => {
      const f = new Membrane(function f () { }, mangle({ _code: true }))
      expect(typeof f.sync).to.equal('function')
      expect(typeof f.upgrade).to.equal('function')
      expect(typeof f.destroy).to.equal('function')
      expect(typeof f.auth).to.equal('function')
    })

    // ------------------------------------------------------------------------

    it('getOwnPropertyDescriptor undefined', () => {
      const f = new Membrane(function f () { }, mangle({ _code: true }))
      expect(Object.getOwnPropertyDescriptor(f, 'sync')).to.equal(undefined)
      expect(Object.getOwnPropertyDescriptor(f, 'upgrade')).to.equal(undefined)
      expect(Object.getOwnPropertyDescriptor(f, 'destroy')).to.equal(undefined)
      expect(Object.getOwnPropertyDescriptor(f, 'auth')).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('cannot set', () => {
      const f = new Membrane(function f () { }, mangle({ _code: true }))
      expect(() => { f.sync = 1 }).to.throw('Cannot set sync')
      expect(() => { f.upgrade = 1 }).to.throw('Cannot set upgrade')
      expect(() => { f.destroy = 1 }).to.throw('Cannot set destroy')
      expect(() => { f.auth = 1 }).to.throw('Cannot set auth')
    })

    // ------------------------------------------------------------------------

    it('cannot delete', () => {
      const f = new Membrane(function f () { }, mangle({ _code: true }))
      expect(() => { delete f.sync }).to.throw('Cannot delete sync')
      expect(() => { delete f.upgrade }).to.throw('Cannot delete upgrade')
      expect(() => { delete f.destroy }).to.throw('Cannot delete destroy')
      expect(() => { delete f.auth }).to.throw('Cannot delete auth')
    })
  })

  // --------------------------------------------------------------------------
  // Bindings
  // --------------------------------------------------------------------------

  describe('Bindings', () => {
    it('read bindings', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _bindings: true }))
      _sudo(() => { A.location = 'abc_o1' })
      _sudo(() => { A.origin = 'def_o2' })
      _sudo(() => { A.nonce = 1 })
      _sudo(() => { A.owner = DUMMY_OWNER })
      _sudo(() => { A.satoshis = 0 })
      expect(A.location).to.equal('abc_o1')
      expect(A.origin).to.equal('def_o2')
      expect(A.nonce).to.equal(1)
      expect(A.owner).to.equal(DUMMY_OWNER)
      expect(A.satoshis).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('read undetermined bindings', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _bindings: true }))
      _sudo(() => { A.location = '_o1' })
      _sudo(() => { A.origin = 'commit://def_d2' })
      _sudo(() => { A.owner = new Unbound() })
      _sudo(() => { A.satoshis = new Unbound() })
      expect(() => A.location).to.throw('location is undetermined')
      expect(() => A.origin).to.throw('origin is undetermined')
      expect(() => A.nonce).to.throw('nonce is undetermined')
      expect(() => A.owner).to.throw('owner is undetermined')
      expect(() => A.satoshis).to.throw('satoshis is undetermined')
    })

    // ------------------------------------------------------------------------

    it('read unbound bindings', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _bindings: true }))
      _sudo(() => { A.owner = new Unbound(DUMMY_OWNER) })
      _sudo(() => { A.satoshis = new Unbound(1) })
      expect(A.owner).to.equal(DUMMY_OWNER)
      expect(A.satoshis).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('set bindings marks them unbound', () => {
      const A2 = new Membrane(class A { }, mangle({ _admin: true, _bindings: true }))
      A2.owner = DUMMY_OWNER
      A2.satoshis = 1
      expect(_sudo(() => A2.owner) instanceof Unbound).to.equal(true)
      expect(_sudo(() => A2.satoshis) instanceof Unbound).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('set owner when undetermined', () => {
      const A2 = new Membrane(class A { }, mangle({ _admin: true, _bindings: true }))
      _sudo(() => { A2.owner = new Unbound(undefined) })
      A2.owner = DUMMY_OWNER
      expect(A2.owner).to.equal(DUMMY_OWNER)
    })

    // ------------------------------------------------------------------------

    it('set satoshis when undetermined', () => {
      const A2 = new Membrane(class A { }, mangle({ _admin: true, _bindings: true }))
      _sudo(() => { A2.satoshis = new Unbound(undefined) })
      A2.satoshis = 1
      expect(A2.satoshis).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('set inner object binding properties', () => {
      const jig = new Membrane(class A { }, mangle({ _bindings: true }))
      const o = new Membrane({}, mangle({ _parentJig: jig }))
      o.location = 'abc_o1'
      o.owner = DUMMY_OWNER
    })

    // ------------------------------------------------------------------------

    it('throws if set invalid bindings', () => {
      const A = new Membrane(class A { }, mangle({ _bindings: true }))
      expect(() => { A.owner = [] }).to.throw('Invalid owner')
      expect(() => { A.satoshis = null }).to.throw('satoshis must be a number')
    })

    // ------------------------------------------------------------------------

    it('cannot set location, origin, or nonce', () => {
      const A = new Membrane(class A { }, mangle({ _bindings: true }))
      expect(() => { A.location = 'abc_o1' }).to.throw('Must not set location')
      expect(() => { A.origin = 'def_d2' }).to.throw('Must not set origin')
      expect(() => { A.nonce = 1 }).to.throw('Must not set nonce')
    })

    // ------------------------------------------------------------------------

    it('cannot change owner once unbound', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _bindings: true }))
      _sudo(() => { A.owner = new Unbound(DUMMY_OWNER) })
      expect(() => { A.owner = DUMMY_OWNER }).to.throw('Cannot set binding owner again')
    })

    // ------------------------------------------------------------------------

    it('cannot change satoshis once unbound', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _bindings: true }))
      _sudo(() => { A.satoshis = new Unbound(1) })
      expect(() => { A.satoshis = 1 }).to.throw('Cannot set binding satoshis again')
    })

    // ------------------------------------------------------------------------

    it('cannot delete jig bindings', () => {
      const A = new Membrane(class A { }, mangle({ _bindings: true }))
      expect(() => { delete A.location }).to.throw('Cannot delete binding location')
      expect(() => { delete A.origin }).to.throw('Cannot delete binding origin')
      expect(() => { delete A.nonce }).to.throw('Cannot delete binding nonce')
      expect(() => { delete A.owner }).to.throw('Cannot delete binding owner')
      expect(() => { delete A.satoshis }).to.throw('Cannot delete binding satoshis')
    })

    // ------------------------------------------------------------------------

    it('can delete inner object bindings', () => {
      const jig = new Membrane(class A { }, mangle({ _bindings: true }))
      const o = new Membrane({}, mangle({ _parentJig: jig }))
      delete o.location
      delete o.origin
      delete o.nonce
      delete o.owner
      delete o.satoshis
    })

    // ------------------------------------------------------------------------

    it('read bindings on jigs', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _bindings: true }))
      _sudo(() => { A.location = 'abc_o1' })
      _sudo(() => { A.origin = 'def_o2' })
      _sudo(() => { A.nonce = 1 })
      _sudo(() => { A.owner = DUMMY_OWNER })
      _sudo(() => { A.satoshis = 0 })
      expect(Object.getOwnPropertyDescriptor(A, 'location').value).to.equal('abc_o1')
      expect(Object.getOwnPropertyDescriptor(A, 'origin').value).to.equal('def_o2')
      expect(Object.getOwnPropertyDescriptor(A, 'nonce').value).to.equal(1)
      expect(Object.getOwnPropertyDescriptor(A, 'owner').value).to.equal(DUMMY_OWNER)
      expect(Object.getOwnPropertyDescriptor(A, 'satoshis').value).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('read bindings on inner objects', () => {
      const jig = new Membrane(class A { }, mangle({ _bindings: true }))
      const o = new Membrane({}, mangle({ _admin: true, _parentJig: jig }))
      _sudo(() => { o.location = [] })
      _sudo(() => { o.origin = null })
      _sudo(() => { o.nonce = new Set() })
      _sudo(() => { o.owner = false })
      _sudo(() => { o.satoshis = -1000 })
      expect(Object.getOwnPropertyDescriptor(o, 'location').value).to.deep.equal([])
      expect(Object.getOwnPropertyDescriptor(o, 'origin').value).to.equal(null)
      expect(Object.getOwnPropertyDescriptor(o, 'nonce').value).to.deep.equal(new Set())
      expect(Object.getOwnPropertyDescriptor(o, 'owner').value).to.equal(false)
      expect(Object.getOwnPropertyDescriptor(o, 'satoshis').value).to.equal(-1000)
    })

    // ------------------------------------------------------------------------

    it('throws if get descriptor of undetermined bindings', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _bindings: true }))
      _sudo(() => { A.location = '_o1' })
      _sudo(() => { A.origin = 'commit://def_d2' })
      _sudo(() => { A.owner = new Unbound() })
      _sudo(() => { A.satoshis = new Unbound() })
      expect(() => Object.getOwnPropertyDescriptor(A, 'location').value).to.throw('location is undetermined')
      expect(() => Object.getOwnPropertyDescriptor(A, 'origin').value).to.throw('origin is undetermined')
      expect(() => Object.getOwnPropertyDescriptor(A, 'nonce').value).to.throw('nonce is undetermined')
      expect(() => Object.getOwnPropertyDescriptor(A, 'owner').value).to.throw('owner is undetermined')
      expect(() => Object.getOwnPropertyDescriptor(A, 'satoshis').value).to.throw('satoshis is undetermined')
    })

    // ------------------------------------------------------------------------

    it('can get descriptor of unbound bindings', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _bindings: true }))
      _sudo(() => { A.owner = new Unbound(DUMMY_OWNER) })
      _sudo(() => { A.satoshis = new Unbound(1) })
      expect(Object.getOwnPropertyDescriptor(A, 'owner').value).to.equal(DUMMY_OWNER)
      expect(Object.getOwnPropertyDescriptor(A, 'satoshis').value).to.equal(1)
    })
  })

  // --------------------------------------------------------------------------
  // Immutable
  // --------------------------------------------------------------------------

  describe('Immutable', () => {
    it('defineProperty throws', () => {
      const o = new Membrane({ }, mangle({ _immutable: true }))
      const desc = { value: 1, configurable: true, enumerable: true, writable: true }
      expect(() => Object.defineProperty(o, 'n', desc)).to.throw('defineProperty disabled')
    })

    // ------------------------------------------------------------------------

    it('delete disabled', () => {
      const A = new Membrane(class A { }, mangle({ _immutable: true }))
      expect(() => { delete A.n }).to.throw('delete disabled')
    })

    // ------------------------------------------------------------------------

    it('set disabled', () => {
      const o = new Membrane({ }, mangle({ _immutable: true }))
      expect(() => { o.n = 1 }).to.throw('set disabled')
    })

    // ------------------------------------------------------------------------

    it('get adds immutable membrane', () => {
      const A = new Membrane({ }, mangle({ _admin: true, _immutable: true }))
      _sudo(() => { A.o = {} })
      expect(A.o).not.to.equal(_sudo(() => A.o))
      expect(() => { A.o.n = 1 }).to.throw('set disabled')
    })

    // ------------------------------------------------------------------------

    it('getOwnPropertyDescriptor adds immutable membrane', () => {
      const A = new Membrane({ }, mangle({ _admin: true, _immutable: true }))
      _sudo(() => { A.o = {} })
      expect(Object.getOwnPropertyDescriptor(A, 'o').value)
        .not.to.equal(_sudo(() => Object.getOwnPropertyDescriptor(A, 'o').value))
      expect(() => { Object.getOwnPropertyDescriptor(A, 'o').value.n = 1 }).to.throw('set disabled')
    })

    // ------------------------------------------------------------------------

    it('intrinsic out adds immutable membrane', () => {
      const A = new Membrane(new Map(), mangle({ _admin: true, _immutable: true }))
      _sudo(() => A.set(1, {}))
      expect(A.get(1)).not.to.equal(_sudo(() => A.get(1)))
      expect(() => { A.get(1).n = 1 }).to.throw('set disabled')
    })
  })

  // --------------------------------------------------------------------------
  // Record
  // --------------------------------------------------------------------------

  describe('Record', () => {
    it('construct', () => {
      const A = makeJig(class A { }, { _recordReads: true })
      testRecord(record => {
        new A() // eslint-disable-line
        expect(record._reads.includes(A)).to.equal(true)
        expect(record._snapshots.has(A)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('construct chain', () => {
      const A = makeJig(class A { }, { _recordReads: true })
      const B = makeJig(class B extends A { }, { _recordReads: true })
      testRecord(record => {
        new B() // eslint-disable-line
        expect(record._reads.includes(A)).to.equal(true)
        expect(record._reads.includes(B)).to.equal(true)
        expect(record._snapshots.has(A)).to.equal(true)
        expect(record._snapshots.has(B)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('apply static method to code', () => {
      class A { static f () { this._n = 1 }}
      const A2 = makeJig(A, { _recordReads: true, _recordUpdates: true, _recordCalls: true })
      testRecord(record => {
        A2.f()
        expect(record._reads.length).to.equal(1)
        expect(record._reads.includes(A2)).to.equal(true)
        expect(record._actions.length).to.equal(1)
        expect(record._actions[0]._method).to.equal('f')
        expect(record._actions[0]._jig).to.equal(A2)
        expect(record._snapshots.size).to.equal(1)
        expect(record._snapshots.has(A2)).to.equal(true)
        expect(record._updates.length).to.equal(1)
        expect(record._updates.includes(A2)).to.equal(true)
        expect(A2._n).to.equal(1)
      })
    })

    // ------------------------------------------------------------------------

    it('apply method to instance', () => {
      class A { f () { this._n = 1 }}
      const A2 = makeJig(A, { _recordReads: true, _recordUpdates: true, _recordCalls: true })
      const a = new A2()
      const a2 = makeJig(a, { _recordReads: true, _recordUpdates: true, _recordCalls: true })
      testRecord(record => {
        a2.f()
        expect(record._reads.includes(A2)).to.equal(true)
        expect(record._actions.length).to.equal(1)
        expect(record._actions[0]._method).to.equal('f')
        expect(record._actions[0]._jig).to.equal(a2)
        expect(record._snapshots.size).to.equal(2)
        expect(record._snapshots.has(a2)).to.equal(true)
        expect(record._snapshots.has(A2)).to.equal(true)
        expect(record._updates.length).to.equal(1)
        expect(record._updates.includes(a2)).to.equal(true)
        expect(a2._n).to.equal(1)
      })
    })

    // ------------------------------------------------------------------------

    it('define', () => {
      const o = makeJig({}, { _recordReads: true, _recordUpdates: true })
      const desc = { value: 1, configurable: true, enumerable: true, writable: true }
      testRecord(record => {
        Object.defineProperty(o, 'n', desc)
        expect(record._snapshots.size).to.equal(1)
        expect(record._snapshots.has(o)).to.equal(true)
        expect(record._updates.length).to.equal(1)
        expect(record._updates.includes(o)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('delete', () => {
      const o = makeJig({}, { _recordReads: true, _recordUpdates: true })
      testRecord(record => {
        delete o.n
        expect(record._snapshots.size).to.equal(1)
        expect(record._snapshots.has(o)).to.equal(true)
        expect(record._updates.length).to.equal(1)
        expect(record._updates.includes(o)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('get', () => {
      const o = makeJig({}, { _recordReads: true })
      testRecord(record => {
        o.n // eslint-disable-line
        expect(record._reads.length).to.equal(1)
        expect(record._reads.includes(o)).to.equal(true)
        expect(record._snapshots.size).to.equal(1)
        expect(record._snapshots.has(o)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('get method', () => {
      const A = makeJig(class A { f () { } }, { _recordReads: true })
      const a = makeJig(new A(), { _recordReads: true })
      testRecord(record => {
        a.f // eslint-disable-line
        expect(record._reads.length).to.equal(2)
        expect(record._reads.includes(A)).to.equal(true)
        expect(record._reads.includes(a)).to.equal(true)
        expect(record._snapshots.size).to.equal(2)
        expect(record._snapshots.has(A)).to.equal(true)
        expect(record._snapshots.has(a)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('get parent method', () => {
      const A = makeJig(class A { f () { } }, { _recordReads: true })
      const B = makeJig(class B extends A { }, { _recordReads: true })
      const b = makeJig(new B(), { _recordReads: true })
      testRecord(record => {
        b.f // eslint-disable-line
        expect(record._reads.length).to.equal(3)
        expect(record._reads.includes(A)).to.equal(true)
        expect(record._reads.includes(B)).to.equal(true)
        expect(record._reads.includes(b)).to.equal(true)
        expect(record._snapshots.size).to.equal(3)
        expect(record._snapshots.has(A)).to.equal(true)
        expect(record._snapshots.has(B)).to.equal(true)
        expect(record._snapshots.has(b)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('getOwnPropertyDescriptor', () => {
      const o = makeJig({}, { _recordReads: true })
      testRecord(record => {
        Object.getOwnPropertyDescriptor(o, 'n')
        expect(record._reads.length).to.equal(1)
        expect(record._reads.includes(o)).to.equal(true)
        expect(record._snapshots.size).to.equal(1)
        expect(record._snapshots.has(o)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('getPrototypeOf', () => {
      const A = makeJig(class A { f () { } }, { _recordReads: true })
      const a = makeJig(new A(), { _recordReads: true })
      testRecord(record => {
        Object.getPrototypeOf(a)
        expect(record._reads.length).to.equal(1)
        expect(record._reads.includes(a)).to.equal(true)
        expect(record._snapshots.size).to.equal(1)
        expect(record._snapshots.has(a)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('has', () => {
      const o = makeJig({}, { _recordReads: true })
      testRecord(record => {
        'n' in o // eslint-disable-line
        expect(record._reads.length).to.equal(1)
        expect(record._reads.includes(o)).to.equal(true)
        expect(record._snapshots.size).to.equal(1)
        expect(record._snapshots.has(o)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('ownKeys', () => {
      const o = makeJig({}, { _recordReads: true })
      testRecord(record => {
        Object.keys(o)
        expect(record._reads.length).to.equal(1)
        expect(record._reads.includes(o)).to.equal(true)
        expect(record._snapshots.size).to.equal(1)
        expect(record._snapshots.has(o)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('set', () => {
      const o = makeJig({}, { _recordReads: true, _recordUpdates: true })
      testRecord(record => {
        o.n = 1
        expect(record._snapshots.size).to.equal(1)
        expect(record._snapshots.has(o)).to.equal(true)
        expect(record._updates.length).to.equal(1)
        expect(record._updates.includes(o)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('intrinsicGetMethod', () => {
      const s = makeJig(new Set(), { _recordReads: true })
      testRecord(record => {
        s.add // eslint-disable-line
        expect(record._reads.length).to.equal(1)
        expect(record._reads.includes(s)).to.equal(true)
        expect(record._snapshots.size).to.equal(1)
        expect(record._snapshots.has(s)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('intrinsicRead', () => {
      const m = makeJig(new Map(), { _recordReads: true })
      testRecord(record => {
        m.has(1)
        expect(record._reads.length).to.equal(1)
        expect(record._reads.includes(m)).to.equal(true)
        expect(record._snapshots.size).to.equal(1)
        expect(record._snapshots.has(m)).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------

    it('intrinsicUpdate', () => {
      const m = makeJig(new Map(), { _recordReads: true, _recordUpdates: true })
      testRecord(record => {
        m.set(1, 2)
        expect(record._snapshots.size).to.equal(1)
        expect(record._snapshots.has(m)).to.equal(true)
        expect(record._updates.length).to.equal(1)
        expect(record._updates.includes(m)).to.equal(true)
      })
    })
  })

  // --------------------------------------------------------------------------
  // Contract
  // --------------------------------------------------------------------------

  describe('Contract', () => {
    it('delete throws if outside method', () => {
      const a = makeJig({}, { _contract: true })
      const error = 'Updates must be performed in this jig\'s methods'
      expect(() => { delete a.n }).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('delete allowed in jig methods', () => {
      class A { static f () { delete this.n } }
      const a = makeJig(A, { _recordCalls: true, _contract: true })
      testRecord(record => a.f())
    })

    // ------------------------------------------------------------------------

    it('delete throws from another jigs method', () => {
      class A { static f (b) { delete b.n } }
      const a = makeJig(A, { _recordCalls: true, _contract: true })
      const b = makeJig({}, { _recordCalls: true, _contract: true })
      const error = 'Updates must be performed in this jig\'s methods'
      testRecord(record => expect(() => a.f(b)).to.throw(error))
    })

    // ------------------------------------------------------------------------

    it('defineProperty throws if outside method', () => {
      const a = makeJig({}, { _contract: true })
      const error = 'Updates must be performed in this jig\'s methods'
      const desc = { value: 1, configurable: true, enumerable: true, writable: true }
      expect(() => Object.defineProperty(a, 'n', desc)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('defineProperty allowed in jig methods', () => {
      class A {
        static f () {
          const desc = { value: 1, configurable: true, enumerable: true, writable: true }
          Object.defineProperty(this, 'n', desc)
        }
      }
      const a = makeJig(A, { _recordCalls: true, _contract: true })
      testRecord(record => a.f())
    })

    // ------------------------------------------------------------------------

    it('delete throws from another jigs method', () => {
      class A {
        static f (b) {
          const desc = { value: 1, configurable: true, enumerable: true, writable: true }
          Object.defineProperty(b, 'n', desc)
        }
      }
      const a = makeJig(A, { _recordCalls: true, _contract: true })
      const b = makeJig({}, { _recordCalls: true, _contract: true })
      const error = 'Updates must be performed in this jig\'s methods'
      testRecord(record => expect(() => a.f(b)).to.throw(error))
    })

    // ------------------------------------------------------------------------

    it('set throws if outside method', () => {
      const a = makeJig({}, { _contract: true })
      const error = 'Updates must be performed in this jig\'s methods'
      expect(() => { a.n = 1 }).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('set allowed in jig methods', () => {
      class A { static f () { this.n = 1 } }
      const a = makeJig(A, { _recordCalls: true, _contract: true })
      testRecord(record => a.f())
    })

    // ------------------------------------------------------------------------

    it('set throws from another jigs method', () => {
      class A { static f (b) { b.n = 1 } }
      const a = makeJig(A, { _recordCalls: true, _contract: true })
      const b = makeJig({}, { _recordCalls: true, _contract: true })
      const error = 'Updates must be performed in this jig\'s methods'
      testRecord(record => expect(() => a.f(b)).to.throw(error))
    })

    // ------------------------------------------------------------------------

    it('intrinsicUpdate throws if outside method', () => {
      const s = makeJig(new Set(), { _contract: true })
      const error = 'Updates must be performed in this jig\'s methods'
      expect(() => s.add(1)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('intrinsicUpdate allowed in jig methods', () => {
      class A { static f () { this.set.add(1) } }
      A.set = new Set()
      const a = makeJig(A, { _recordCalls: true, _contract: true })
      testRecord(record => a.f())
    })

    // ------------------------------------------------------------------------

    it('intrinsicUpdate throws from another jigs method', () => {
      class A { static f (b) { b.add(1) } }
      const a = makeJig(A, { _recordCalls: true, _contract: true })
      const b = makeJig(new Set(), { _recordCalls: true, _contract: true })
      const error = 'Updates must be performed in this jig\'s methods'
      testRecord(record => expect(() => a.f(b)).to.throw(error))
    })
  })

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  describe('Private', () => {
    it('delete throws if outside', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _private: true }))
      expect(() => { delete A._n }).to.throw('Cannot delete private property _n')
    })

    // ------------------------------------------------------------------------

    it('delete allowed in jig methods', () => {
      class A { static f () { delete this._n } }
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      testRecord(() => a.f())
    })

    // ------------------------------------------------------------------------

    it('delete throws from another jigs method', () => {
      class A { static f (b) { delete b._n } }
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      const b = makeJig({}, options)
      const error = 'Cannot delete private property _n'
      expect(() => testRecord(() => a.f(b))).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('define throws if outside', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _private: true }))
      const desc = { value: 1, configurable: true, enumerable: true, writable: true }
      expect(() => Object.defineProperty(A, '_n', desc)).to.throw('Cannot define private property _n')
    })

    // ------------------------------------------------------------------------

    it('define allowed in jig methods', () => {
      class A {
        static f () {
          const desc = { value: 1, configurable: true, enumerable: true, writable: true }
          Object.defineProperty(this, '_n', desc)
        }
      }
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      testRecord(() => a.f())
    })

    // ------------------------------------------------------------------------

    it('define throws from another jigs method', () => {
      class A {
        static f (b) {
          const desc = { value: 1, configurable: true, enumerable: true, writable: true }
          Object.defineProperty(b, '_n', desc)
        }
      }
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      const b = makeJig({}, options)
      const error = 'Cannot define private property _n'
      expect(() => testRecord(() => a.f(b))).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('get throws if outside', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _private: true }))
      _sudo(() => { A._n = 1 })
      expect(() => A._n).to.throw('Cannot access private property _n')
    })

    // ------------------------------------------------------------------------

    it('get allowed in jig methods', () => {
      class A { static f () { return this._n } }
      A._n = 1
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      testRecord(() => a.f())
    })

    // ------------------------------------------------------------------------

    it('get throws from another jigs method', () => {
      class A { static f (b) { return b._n } }
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      const b = makeJig({}, options)
      const error = 'Cannot access private property _n'
      expect(() => testRecord(() => a.f(b))).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('getOwnPropertyDescriptor throws if outside', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _private: true }))
      expect(() => Object.getOwnPropertyDescriptor(A, '_n')).to.throw('Cannot access private property _n')
    })

    // ------------------------------------------------------------------------

    it('getOwnPropertyDescriptor allowed in jig methods', () => {
      class A { static f () { return Object.getOwnPropertyDescriptor(this, '_n') } }
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      testRecord(() => a.f())
    })

    // ------------------------------------------------------------------------

    it('getOwnPropertyDescriptor throws from another jigs method', () => {
      class A { static f (b) { return Object.getOwnPropertyDescriptor(b, '_n') } }
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      const b = makeJig({}, options)
      const error = 'Cannot access private property _n'
      expect(() => testRecord(() => a.f(b))).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('has throws if outside', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _private: true }))
      expect(() => '_n' in A).to.throw('Cannot access private property _n')
    })

    // ------------------------------------------------------------------------

    it('has allowed in jig methods', () => {
      class A { static f () { return '_n' in this } }
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      testRecord(() => a.f())
    })

    // ------------------------------------------------------------------------

    it('has throws from another jigs method', () => {
      class A { static f (b) { return '_n' in b } }
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      const b = makeJig({}, options)
      const error = 'Cannot access private property _n'
      expect(() => testRecord(() => a.f(b))).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('ownKeys filters private properties if outside', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _private: true }))
      _sudo(() => { A._n = 1 })
      expect(Object.getOwnPropertyNames(A).includes('_n')).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('ownKeys returns private properties in jig methods', () => {
      class A { static f () { return Object.getOwnPropertyNames(this).includes('_n') } }
      A._n = 1
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      expect(testRecord(() => a.f())).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('ownKeys filters private properties from another jigs method', () => {
      class A { static f (b) { return Object.getOwnPropertyNames(b).includes('_n') } }
      A._n = 1
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      const b = makeJig({}, options)
      expect(testRecord(() => a.f(b))).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('set throws if outside', () => {
      const A = new Membrane(class A { }, mangle({ _admin: true, _private: true }))
      expect(() => { A._n = 1 }).to.throw('Cannot set private property _n')
    })

    // ------------------------------------------------------------------------

    it('set allowed in jig methods', () => {
      class A { static f () { this._n = 1 } }
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      testRecord(() => a.f())
    })

    // ------------------------------------------------------------------------

    it('set throws from another jigs method', () => {
      class A { static f (b) { b._n = 1 } }
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const a = makeJig(A, options)
      const b = makeJig({}, options)
      const error = 'Cannot set private property _n'
      expect(() => testRecord(() => a.f(b))).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('get private method allowed from instance', () => {
      class A {
        g () { return this._f() }
        _f (b) { return 1 }
      }
      const options = { _private: true, _recordReads: true, _recordUpdates: true, _recordCalls: true }
      const A2 = makeJig(A, options)
      const b = makeJig(new A2(), options)
      expect(testRecord(() => b.g())).to.equal(1)
    })

    /*
    it('accessible in jig object from instance of same class', () => {
      class A extends Jig { testGet (b) { return b._n } }
      const a = {}
      const b = {}
      Object.setPrototypeOf(a, A.prototype)
      Object.setPrototypeOf(b, A.prototype)
      const a2 = new Membrane(a)
      const b2 = new Membrane(b)
      _sudo(() => { b2._n = 1 })
      expect(a2.testGet(b2)).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('accessible in jig object from child instance of same class', () => {
      class A extends Jig { }
      class B extends A { testGet (b) { return b._n } }
      const a = {}
      const b = {}
      Object.setPrototypeOf(a, B.prototype)
      Object.setPrototypeOf(b, B.prototype)
      const a2 = new Membrane(a)
      const b2 = new Membrane(b)
      _sudo(() => { b2._n = 1 })
      expect(a2.testGet(b2)).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('accessible in jig code from same class', () => {
      class A extends Jig { static testGet () { return this._n } }
      const A2 = new Membrane(A)
      _sudo(() => { A2._n = 1 })
      expect(A2.testGet()).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('accessible from inner object of same jig', () => {
      class A extends Jig { static testGet (x) { return x._n } }
      const A2 = new Membrane(A)
      const B = new Membrane({}, A2)
      _sudo(() => { A2._n = 1 })
      expect(A2.testGet(B)).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('throws when access parent class private property', () => {
      class A extends Jig { static testGet () { return this._n } }
      const A2 = new Membrane(A)
      class B extends A2 { }
      const B2 = new Membrane(B)
      _sudo(() => { A2._n = 1 })
      expect(() => B2.testGet()).to.throw('Cannot access private property _n')
    })

    // ------------------------------------------------------------------------

    it('accessible if only access child class private property', () => {
      class A extends Jig { static testGet () { return this._n } }
      const A2 = new Membrane(A)
      class B extends A2 { }
      const B2 = new Membrane(B)
      _sudo(() => { A2._n = 1 })
      _sudo(() => { B2._n = 2 })
      expect(B2.testGet()).to.equal(2)
    })
    */
  })

  // --------------------------------------------------------------------------
  // Jig Method
  // --------------------------------------------------------------------------

  describe('jig method', () => {
    it('returns membrane', () => { })
    it('returns same method twice', () => { })
    it('immutable', () => { })
    it('method can only be applied to jig instance', () => {})
    it('static method can only be applied to jig class', () => {})
  })

  describe('inner object', () => {
    it('returns membrane', () => { })
    it('returns same object twice', () => { })
    it('returns membrane for inner inner object', () => { })
    it('store and retrieve from intrinsic', () => { })
  })

  describe('inner method', () => {
    it('intrinsic method immutable', () => { })
    it('arbitrary object method immutable', () => { })
    it('can call inside of jig', () => { })
    it('can call outside of jig if no updates', () => { })
  })

  describe('borrow', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
