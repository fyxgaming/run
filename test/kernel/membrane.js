/**
 * membrane.js
 *
 * Tests for lib/kernel/membrane.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, Berry } = Run
const unmangle = require('../env/unmangle')
const { _sudo } = require('../../lib/run')
const Membrane = unmangle(Run)._Membrane
const Proxy2 = unmangle(Run)._Proxy2
const Unbound = unmangle(Run)._Unbound
const sudo = unmangle(Run)._sudo

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const DUMMY_OWNER = '1NbnqkQJSH86yx4giugZMDPJr2Ss2djt3N'

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

    // ------------------------------------------------------------------------

    it('jig code', () => {
      new Membrane(class A extends Jig { }) // eslint-disable-line
    })

    // ------------------------------------------------------------------------

    it('static jig code', () => {
      new Membrane(class A { }) // eslint-disable-line
    })

    // ------------------------------------------------------------------------

    it('jig instance', () => {
      const o = {}
      Object.setPrototypeOf(o, (class A extends Jig { }).prototype)
      new Membrane(o) // eslint-disable-line
    })

    // ------------------------------------------------------------------------

    it('berry', () => {
      const o = {}
      Object.setPrototypeOf(o, (class A extends Berry { }).prototype)
      new Membrane(o) // eslint-disable-line
    })

    // ------------------------------------------------------------------------

    it('inner object', () => {
      new Membrane({}, {}) // eslint-disable-line
    })

    // ------------------------------------------------------------------------

    it('inner method', () => {
      new Membrane(function f() { }, {}) // eslint-disable-line
    })

    // ------------------------------------------------------------------------

    it('throws if unsupported', () => {
      expect(() => new Membrane()).to.throw()
      expect(() => new Membrane(1)).to.throw()
      expect(() => new Membrane(null)).to.throw()
      expect(() => new Membrane({})).to.throw()
    })
  })

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  describe('Handlers', () => {
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

    it('defineProperty disabled', () => {
      class A { static f () { Object.defineProperty(this, 'n', { value: 1 }) } }
      const A2 = new Membrane(A)
      expect(() => A2.f()).to.throw('defineProperty disabled')
    })

    // ------------------------------------------------------------------------

    it('delete', () => {
      class A { static f () { delete this.n } }
      A.n = 1
      const A2 = new Membrane(A)
      A2.f()
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
      class A { }
      const A2 = new Membrane(A)
      expect(Object.isExtensible(A2)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('ownKeys', () => {
      class A { }
      A.n = 1
      const A2 = new Membrane(A)
      const keys = ['length', 'prototype', 'name', 'n']
      expect(Reflect.ownKeys(A2)).to.deep.equal(keys)
    })

    // ------------------------------------------------------------------------

    it('preventExtensions disabled', () => {
      class A { static f () { Object.preventExtensions(this) } }
      const A2 = new Membrane(A)
      expect(() => A2.f()).to.throw('preventExtensions disabled')
    })

    // ------------------------------------------------------------------------

    it('set', () => {
      class A { static f () { this.n = 1 } }
      const A2 = new Membrane(A)
      A2.f()
      expect(A2.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('setPrototypeOf disabled', () => {
      class A { static f () { Object.setPrototypeOf(this, {}) } }
      const A2 = new Membrane(A)
      expect(() => A2.f()).to.throw('setPrototypeOf disabled')
    })

    // ------------------------------------------------------------------------

    it('intrinsic handlers', () => {
      const m = new Membrane(new Map(), {})
      m.set(1, 2)
      expect(m.get(1)).to.equal(2)
    })
  })

  // --------------------------------------------------------------------------
  // Errors
  // --------------------------------------------------------------------------

  describe('Errors', () => {
    it('throws if use jig that has errors', () => {
      const A = new Membrane(class A {})
      const f = new Membrane(function f () {})
      const m = new Membrane(new Map(), A)
      const mset = m.set
      const mclear = m.clear
      const mget = m.get
      const mhas = m.has

      const error = 'hello'
      sudo(() => { A.location = `error://${error}` })
      sudo(() => { f.location = `error://${error}` })

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
      const jig = { location: 'error://hello' }
      const o = new Membrane({}, jig)
      expect(() => o.n).to.throw('hello')
    })
  })

  // --------------------------------------------------------------------------
  // Admin
  // --------------------------------------------------------------------------

  describe('Admin', () => {
    it('admin mode runs directly on target', () => {
      class A { }
      const A2 = new Membrane(A)
      function f () { return f }
      const f2 = new Membrane(f)
      expect(sudo(() => new A2()) instanceof A).to.equal(true)
      expect(sudo(() => f2())).to.equal(f)
      sudo(() => Object.defineProperty(A2, 'n', { value: 1, configurable: true }))
      expect(A.n).to.equal(1)
      sudo(() => { delete A2.n })
      expect('n' in A).to.equal(false)
      A.n = 2
      expect(sudo(() => Object.getOwnPropertyDescriptor(A2, 'n')).value).to.equal(2)
      expect(sudo(() => Object.getPrototypeOf(A2))).to.equal(Object.getPrototypeOf(A))
      expect(sudo(() => 'n' in A2)).to.equal(true)
      expect(sudo(() => Object.isExtensible(A2))).to.equal(Object.isExtensible(A))
      A._private = 1
      expect(sudo(() => Object.getOwnPropertyNames(A2))).to.deep.equal(Object.getOwnPropertyNames(A))
      sudo(() => Object.preventExtensions(A2))
      expect(Object.isExtensible(A)).to.equal(false)
      sudo(() => { f2.n = 1 })
      expect(f.n).to.equal(1)
      function g () { }
      sudo(() => Object.setPrototypeOf(f2, g))
      expect(Object.getPrototypeOf(f)).to.equal(g)
      const m = new Map()
      const o = {}
      const m2 = new Membrane(m, f)
      const mset = m2.set
      const mhas = m2.has
      const mget = m2.get
      expect(sudo(() => m2.set(o, 2))).to.equal(m2)
      expect(sudo(() => mset.call(m2, o, 3))).to.equal(m2)
      expect(sudo(() => mhas.call(m2, o))).to.equal(true)
      expect(sudo(() => mget.call(m2, o))).to.equal(3)
      expect(sudo(() => m.has(o))).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('admin mode overrides errors', () => {
      const f = new Membrane(function f () { })
      sudo(() => { f.location = 'error://hello' })
      expect(sudo(() => f.location)).to.equal('error://hello')
    })
  })

  // --------------------------------------------------------------------------
  // Code methods
  // --------------------------------------------------------------------------

  describe('Code Methods', () => {
    it('has', () => {
      const f = new Membrane(function f () { })
      expect('sync' in f).to.equal(true)
      expect('upgrade' in f).to.equal(true)
      expect('destroy' in f).to.equal(true)
      expect('auth' in f).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('get', () => {
      const f = new Membrane(function f () { })
      expect(typeof f.sync).to.equal('function')
      expect(typeof f.upgrade).to.equal('function')
      expect(typeof f.destroy).to.equal('function')
      expect(typeof f.auth).to.equal('function')
    })

    // ------------------------------------------------------------------------

    it('getOwnPropertyDescriptor undefined', () => {
      const f = new Membrane(function f () { })
      expect(Object.getOwnPropertyDescriptor(f, 'sync')).to.equal(undefined)
      expect(Object.getOwnPropertyDescriptor(f, 'upgrade')).to.equal(undefined)
      expect(Object.getOwnPropertyDescriptor(f, 'destroy')).to.equal(undefined)
      expect(Object.getOwnPropertyDescriptor(f, 'auth')).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('cannot set', () => {
      const f = new Membrane(function f () { })
      expect(() => { f.sync = 1 }).to.throw('Cannot set sync')
      expect(() => { f.upgrade = 1 }).to.throw('Cannot set upgrade')
      expect(() => { f.destroy = 1 }).to.throw('Cannot set destroy')
      expect(() => { f.auth = 1 }).to.throw('Cannot set auth')
    })

    // ------------------------------------------------------------------------

    it('cannot delete', () => {
      const f = new Membrane(function f () { })
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
    it('read bindings on jigs', () => {
      const A = new Membrane(class A { })
      sudo(() => { A.location = 'abc_o1' })
      sudo(() => { A.origin = 'def_o2' })
      sudo(() => { A.nonce = 1 })
      sudo(() => { A.owner = DUMMY_OWNER })
      sudo(() => { A.satoshis = 0 })
      expect(A.location).to.equal('abc_o1')
      expect(A.origin).to.equal('def_o2')
      expect(A.nonce).to.equal(1)
      expect(A.owner).to.equal(DUMMY_OWNER)
      expect(A.satoshis).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('read bindings on inner objects', () => {
      const o = new Membrane({}, {})
      sudo(() => { o.location = [] })
      sudo(() => { o.origin = null })
      sudo(() => { o.nonce = new Set() })
      sudo(() => { o.owner = false })
      sudo(() => { o.satoshis = -1000 })
      expect(o.location).to.deep.equal([])
      expect(o.origin).to.equal(null)
      expect(o.nonce).to.deep.equal(new Set())
      expect(o.owner).to.equal(false)
      expect(o.satoshis).to.equal(-1000)
    })

    // ------------------------------------------------------------------------

    it('throws if read undetermined bindings', () => {
      const A = new Membrane(class A { })
      sudo(() => { A.location = '_o1' })
      sudo(() => { A.origin = 'commit://def_d2' })
      sudo(() => { A.owner = new Unbound() })
      sudo(() => { A.satoshis = new Unbound() })
      expect(() => A.location).to.throw('location is undetermined')
      expect(() => A.origin).to.throw('origin is undetermined')
      expect(() => A.nonce).to.throw('nonce is undetermined')
      expect(() => A.owner).to.throw('owner is undetermined')
      expect(() => A.satoshis).to.throw('satoshis is undetermined')
    })

    // ------------------------------------------------------------------------

    it('can read unbound bindings', () => {
      const A = new Membrane(class A { })
      sudo(() => { A.owner = new Unbound(DUMMY_OWNER) })
      sudo(() => { A.satoshis = new Unbound(1) })
      expect(A.owner).to.equal(DUMMY_OWNER)
      expect(A.satoshis).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('set bindings marks them unbound', () => {
      class A { static f () { this.owner = DUMMY_OWNER; this.satoshis = 1 } }
      const A2 = new Membrane(A)
      A2.f()
      expect(_sudo(() => A.owner) instanceof Unbound).to.equal(true)
      expect(_sudo(() => A.satoshis) instanceof Unbound).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('can set owner when undefined', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('can set satoshis when undefined', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('can set inner object binding properties', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if set invalid bindings', () => {
      /*
      const A = new Membrane(class A { })
      sudo(() => { A.origin = null })
      sudo(() => { A.nonce = new Set() })
      sudo(() => { A.owner = false })
      sudo(() => { A.satoshis = -1000 })
      expect(() => A.origin).to.throw('Cannot read origin')
      expect(() => A.nonce).to.throw('Cannot read nonce')
      expect(() => A.owner).to.throw('Cannot read owner')
      expect(() => A.satoshis).to.throw('Cannot read satoshis')
      */
    })

    // ------------------------------------------------------------------------

    it('cannot set location, origin, or nonce', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('cannot change owner once unbound', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('cannot change satoshis once unbound', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('cannot delete jig bindings', () => {
      class A { static deleteProperty (x) { delete this[x] } }
      const A2 = new Membrane(A)
      expect(() => A2.deleteProperty('location')).to.throw('Cannot delete binding location')
      expect(() => A2.deleteProperty('origin')).to.throw('Cannot delete binding origin')
      expect(() => A2.deleteProperty('nonce')).to.throw('Cannot delete binding nonce')
      expect(() => A2.deleteProperty('owner')).to.throw('Cannot delete binding owner')
      expect(() => A2.deleteProperty('satoshis')).to.throw('Cannot delete binding satoshis')
    })

    // ------------------------------------------------------------------------

    it('can delete inner object bindings', () => {
      const o = new Membrane({}, {})
      delete o.location
      delete o.origin
      delete o.nonce
      delete o.owner
      delete o.satoshis
    })
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

  describe('immutable', () => {
    it('delete disabled', () => { })
    it('set disabled', () => { })
    it('intrinsic update disabled', () => { })
    it('sudo overrides', () => { })
    it('returns immutable inner object', () => { })
  })

  describe('private', () => {
    // TODO
  })

  describe('record', () => {
    // TODO
  })

  describe('borrow', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
