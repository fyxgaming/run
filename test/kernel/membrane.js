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
const Proxy2 = unmangle(unmangle(Run)._Proxy2)
const Unbound = unmangle(Run)._Unbound
const sudo = unmangle(Run)._sudo

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const DUMMY_OWNER = '1NbnqkQJSH86yx4giugZMDPJr2Ss2djt3N'

// Helper to create a membrane with select features
function membrane (target = class { }, options = {}) {
  const proxy = new Membrane(target, options.jig)
  const membrane = Proxy2._getHandler(proxy)
  membrane._admins = options.admins
  membrane._errors = options.errors
  membrane._immutable = options.immutable
  membrane._private = options.private
  membrane._codeMethods = options.code
  membrane._bindings = options.bindings
  membrane._recording = options.record
  return proxy
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
      const jig = new Membrane(class A { })
      new Membrane({}, jig) // eslint-disable-line
    })

    // ------------------------------------------------------------------------

    it('inner method', () => {
      const jig = new Membrane(class A { })
      new Membrane(function f() { }, jig) // eslint-disable-line
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
  // Base Handlers
  // --------------------------------------------------------------------------

  // Tests for the base handler when there are no other configurations
  describe('Base Handlers', () => {
    it('apply', () => {
      function f (x) { return x }
      const f2 = membrane(f)
      expect(f2(1)).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('construct', () => {
      class A { }
      const A2 = membrane(A)
      expect(new A2() instanceof A2).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('defineProperty', () => {
      const m = membrane()
      const desc = { value: 1, configurable: true, enumerable: true, writable: true }
      Object.defineProperty(m, 'n', desc)
      expect('n' in m).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('delete', () => {
      class A { }
      A.n = 1
      const A2 = membrane(A)
      delete A2.n
      expect('n' in A2).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('get', () => {
      class A { }
      A.n = 1
      const A2 = membrane(A)
      expect(A2.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('getOwnPropertyDescriptor', () => {
      class A { }
      A.n = 1
      const A2 = membrane(A)
      const desc = { value: 1, configurable: true, enumerable: true, writable: true }
      expect(Object.getOwnPropertyDescriptor(A2, 'n')).to.deep.equal(desc)
    })

    // ------------------------------------------------------------------------

    it('getPrototypeOf', () => {
      class B { }
      class A extends B { }
      const A2 = membrane(A)
      expect(Object.getPrototypeOf(A2)).to.equal(B)
    })

    // ------------------------------------------------------------------------

    it('has', () => {
      class A { }
      A.n = 1
      const A2 = membrane(A)
      expect('n' in A2).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('isExtensible', () => {
      const m = membrane()
      expect(Object.isExtensible(m)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('ownKeys', () => {
      class A { }
      A.n = 1
      const A2 = membrane(A)
      const keys = ['length', 'prototype', 'name', 'n'].sort()
      expect(Reflect.ownKeys(A2).sort()).to.deep.equal(keys)
    })

    // ------------------------------------------------------------------------

    it('preventExtensions disabled', () => {
      const m = membrane()
      expect(() => Object.preventExtensions(m)).to.throw('preventExtensions disabled')
    })

    // ------------------------------------------------------------------------

    it('set', () => {
      const m = membrane()
      m.n = 1
      expect(m.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('setPrototypeOf disabled', () => {
      class A { }
      const A2 = membrane(A)
      expect(() => Object.setPrototypeOf(A2, class B { })).to.throw('setPrototypeOf disabled')
    })

    // ------------------------------------------------------------------------

    it('intrinsic handlers', () => {
      const jig = membrane()
      const m = membrane(new Map(), { jig })
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
  // Errors
  // --------------------------------------------------------------------------

  describe('Errors', () => {
    it('throws if use jig that has errors', () => {
      const A = membrane(class A { }, { errors: true })
      const f = membrane(function f () {}, { errors: true })
      const m = membrane(new Map(), { jig: A, errors: true })

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
      const jig = membrane(class A { })
      jig.location = 'error://hello'
      const o = membrane({}, { jig, errors: true })
      expect(() => o.n).to.throw('hello')
    })
  })

  // --------------------------------------------------------------------------
  // Code methods
  // --------------------------------------------------------------------------

  describe('Code Methods', () => {
    it('has', () => {
      const f = membrane(function f () { }, { code: true })
      expect('sync' in f).to.equal(true)
      expect('upgrade' in f).to.equal(true)
      expect('destroy' in f).to.equal(true)
      expect('auth' in f).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('get', () => {
      const f = membrane(function f () { }, { code: true })
      expect(typeof f.sync).to.equal('function')
      expect(typeof f.upgrade).to.equal('function')
      expect(typeof f.destroy).to.equal('function')
      expect(typeof f.auth).to.equal('function')
    })

    // ------------------------------------------------------------------------

    it('getOwnPropertyDescriptor undefined', () => {
      const f = membrane(function f () { }, { code: true })
      expect(Object.getOwnPropertyDescriptor(f, 'sync')).to.equal(undefined)
      expect(Object.getOwnPropertyDescriptor(f, 'upgrade')).to.equal(undefined)
      expect(Object.getOwnPropertyDescriptor(f, 'destroy')).to.equal(undefined)
      expect(Object.getOwnPropertyDescriptor(f, 'auth')).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('cannot set', () => {
      const f = membrane(function f () { }, { code: true })
      expect(() => { f.sync = 1 }).to.throw('Cannot set sync')
      expect(() => { f.upgrade = 1 }).to.throw('Cannot set upgrade')
      expect(() => { f.destroy = 1 }).to.throw('Cannot set destroy')
      expect(() => { f.auth = 1 }).to.throw('Cannot set auth')
    })

    // ------------------------------------------------------------------------

    it('cannot delete', () => {
      const f = membrane(function f () { }, { code: true })
      expect(() => { delete f.sync }).to.throw('Cannot delete sync')
      expect(() => { delete f.upgrade }).to.throw('Cannot delete upgrade')
      expect(() => { delete f.destroy }).to.throw('Cannot delete destroy')
      expect(() => { delete f.auth }).to.throw('Cannot delete auth')
    })
  })

  // --------------------------------------------------------------------------
  // Bindings
  // --------------------------------------------------------------------------

  describe.only('Bindings', () => {
    it('read bindings when enabled', () => {
      const A = membrane(class A { }, { admins: true, bindings: true })
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

    it('read bindings when disabled', () => {
      const A = membrane(class A { }, { admins: true, bindings: false })
      sudo(() => { A.location = [] })
      sudo(() => { A.origin = null })
      sudo(() => { A.nonce = new Set() })
      sudo(() => { A.owner = false })
      sudo(() => { A.satoshis = -1000 })
      expect(A.location).to.deep.equal([])
      expect(A.origin).to.equal(null)
      expect(A.nonce).to.deep.equal(new Set())
      expect(A.owner).to.equal(false)
      expect(A.satoshis).to.equal(-1000)
    })

    // ------------------------------------------------------------------------

    it('throws if read undetermined bindings', () => {
      const A = membrane(class A { }, { admins: true, bindings: false })
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
      const A = membrane(class A { }, { admins: true, bindings: false })
      sudo(() => { A.owner = new Unbound(DUMMY_OWNER) })
      sudo(() => { A.satoshis = new Unbound(1) })
      expect(A.owner).to.equal(DUMMY_OWNER)
      expect(A.satoshis).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('set bindings marks them unbound', () => {
      class A extends Jig { static f () { this.owner = DUMMY_OWNER; this.satoshis = 1 } }
      const A2 = new Membrane(A)
      A2.f()
      expect(sudo(() => A.owner) instanceof Unbound).to.equal(true)
      expect(sudo(() => A.satoshis) instanceof Unbound).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('can set owner when undetermined', () => {
      class A extends Jig { static f () { this.owner = DUMMY_OWNER } }
      const A2 = new Membrane(A)
      sudo(() => { A2.owner = new Unbound(undefined) })
      A2.f()
      expect(A2.owner).to.equal(DUMMY_OWNER)
    })

    // ------------------------------------------------------------------------

    it('can set satoshis when undetermined', () => {
      class A extends Jig { static f () { this.satoshis = 1 } }
      const A2 = new Membrane(A)
      sudo(() => { A2.satoshis = new Unbound(undefined) })
      A2.f()
      expect(A2.satoshis).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('can set inner object binding properties', () => {
      const jig = new Membrane(class A { })
      const o = new Membrane({}, jig)
      o.location = 'abc_o1'
      o.owner = DUMMY_OWNER
    })

    // ------------------------------------------------------------------------

    it('throws if set invalid bindings', () => {
      class A { static setProperty (name, value) { this[name] = value } }
      const A2 = new Membrane(A)
      expect(() => A2.setProperty('owner', [])).to.throw('Invalid owner')
      expect(() => A2.setProperty('satoshis', null)).to.throw('satoshis must be a number')
    })

    // ------------------------------------------------------------------------

    it('cannot set location, origin, or nonce', () => {
      class A { static setProperty (name, value) { this[name] = value } }
      const A2 = new Membrane(A)
      expect(() => A2.setProperty('location', 'abc_o1')).to.throw('Must not set location')
      expect(() => A2.setProperty('origin', 'def_d2')).to.throw('Must not set origin')
      expect(() => A2.setProperty('nonce', 1)).to.throw('Must not set nonce')
    })

    // ------------------------------------------------------------------------

    it('cannot change owner once unbound', () => {
      class A { static setProperty (name, value) { this[name] = value } }
      const A2 = new Membrane(A)
      sudo(() => { A2.owner = new Unbound(DUMMY_OWNER) })
      expect(() => A2.setProperty('owner', DUMMY_OWNER)).to.throw('Cannot set binding owner again')
    })

    // ------------------------------------------------------------------------

    it('cannot change satoshis once unbound', () => {
      class A { static setProperty (name, value) { this[name] = value } }
      const A2 = new Membrane(A)
      sudo(() => { A2.satoshis = new Unbound(1) })
      expect(() => A2.setProperty('satoshis', 1)).to.throw('Cannot set binding satoshis again')
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
      const jig = new Membrane(class A { })
      const o = new Membrane({}, jig)
      delete o.location
      delete o.origin
      delete o.nonce
      delete o.owner
      delete o.satoshis
    })

    // ------------------------------------------------------------------------

    it('read bindings on jigs', () => {
      const A = new Membrane(class A { })
      sudo(() => { A.location = 'abc_o1' })
      sudo(() => { A.origin = 'def_o2' })
      sudo(() => { A.nonce = 1 })
      sudo(() => { A.owner = DUMMY_OWNER })
      sudo(() => { A.satoshis = 0 })
      expect(Object.getOwnPropertyDescriptor(A, 'location').value).to.equal('abc_o1')
      expect(Object.getOwnPropertyDescriptor(A, 'origin').value).to.equal('def_o2')
      expect(Object.getOwnPropertyDescriptor(A, 'nonce').value).to.equal(1)
      expect(Object.getOwnPropertyDescriptor(A, 'owner').value).to.equal(DUMMY_OWNER)
      expect(Object.getOwnPropertyDescriptor(A, 'satoshis').value).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('read bindings on inner objects', () => {
      const jig = new Membrane(class A { })
      const o = new Membrane({}, jig)
      sudo(() => { o.location = [] })
      sudo(() => { o.origin = null })
      sudo(() => { o.nonce = new Set() })
      sudo(() => { o.owner = false })
      sudo(() => { o.satoshis = -1000 })
      expect(Object.getOwnPropertyDescriptor(o, 'location').value).to.deep.equal([])
      expect(Object.getOwnPropertyDescriptor(o, 'origin').value).to.equal(null)
      expect(Object.getOwnPropertyDescriptor(o, 'nonce').value).to.deep.equal(new Set())
      expect(Object.getOwnPropertyDescriptor(o, 'owner').value).to.equal(false)
      expect(Object.getOwnPropertyDescriptor(o, 'satoshis').value).to.equal(-1000)
    })

    // ------------------------------------------------------------------------

    it('throws if get descriptor of undetermined bindings', () => {
      const A = new Membrane(class A { })
      sudo(() => { A.location = '_o1' })
      sudo(() => { A.origin = 'commit://def_d2' })
      sudo(() => { A.owner = new Unbound() })
      sudo(() => { A.satoshis = new Unbound() })
      expect(() => Object.getOwnPropertyDescriptor(A, 'location').value).to.throw('location is undetermined')
      expect(() => Object.getOwnPropertyDescriptor(A, 'origin').value).to.throw('origin is undetermined')
      expect(() => Object.getOwnPropertyDescriptor(A, 'nonce').value).to.throw('nonce is undetermined')
      expect(() => Object.getOwnPropertyDescriptor(A, 'owner').value).to.throw('owner is undetermined')
      expect(() => Object.getOwnPropertyDescriptor(A, 'satoshis').value).to.throw('satoshis is undetermined')
    })

    // ------------------------------------------------------------------------

    it('can get descriptor of unbound bindings', () => {
      const A = new Membrane(class A { })
      sudo(() => { A.owner = new Unbound(DUMMY_OWNER) })
      sudo(() => { A.satoshis = new Unbound(1) })
      expect(Object.getOwnPropertyDescriptor(A, 'owner').value).to.equal(DUMMY_OWNER)
      expect(Object.getOwnPropertyDescriptor(A, 'satoshis').value).to.equal(1)
    })
  })

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  describe('Private', () => {
    it('accessible on static code', () => {
      class A {
        static f () { delete this._n }
        static g () { this._n = 1 }
      }
      const A2 = new Membrane(A)
      sudo(() => { A2._n = 1 })
      expect(A2._n).to.equal(1)
      expect(Object.getOwnPropertyDescriptor(A2, '_n').value).to.equal(1)
      expect('_n' in A2).to.equal(true)
      expect(Object.getOwnPropertyNames(A2).includes('_n')).to.equal(true)
      expect(() => A2.f()).not.to.throw()
      expect(() => A2.g()).not.to.throw()
    })

    // ------------------------------------------------------------------------

    it('accessible on berries', () => {
      const o = {}
      Object.setPrototypeOf(o, (class A extends Berry { }).prototype)
      const o2 = new Membrane(o)
      sudo(() => { o2._n = 1 })
      expect(o2._n).to.equal(1)
      expect(Object.getOwnPropertyDescriptor(o2, '_n').value).to.equal(1)
      expect('_n' in o2).to.equal(true)
      expect(Object.getOwnPropertyNames(o2).includes('_n')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('accessible on inner objects of static code', () => {
      const jig = new Membrane(class A { })
      const o = new Membrane({}, jig)
      sudo(() => { o._n = 1 })
      expect(o._n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('accessible on inner objects of berries', () => {
      const o = {}
      Object.setPrototypeOf(o, (class A extends Berry { }).prototype)
      const berry = new Membrane(o)
      const o2 = new Membrane({}, berry)
      sudo(() => { o2._n = 1 })
      expect(o2._n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('inaccessible on jig code from outside', () => {
      class A extends Jig { }
      const A2 = new Membrane(A)
      sudo(() => { A2._n = 1 })
      expect(() => A2._n).to.throw('Cannot access private property _n')
      expect(() => Object.getOwnPropertyDescriptor(A2, '_n')).to.throw('Cannot access private property _n')
      expect(() => '_n' in A2).to.throw('Cannot access private property _n')
      expect(Object.getOwnPropertyNames(A2).includes('_n')).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('inaccessible on jig code from a different jig', () => {
      const A = new Membrane(class A { static testGet (b) { return b._n } })
      const B = new Membrane(class B extends Jig { })
      sudo(() => { B._n = 1 })
      expect(() => A.testGet(B)).to.throw('Cannot access private property _n')
    })

    // ------------------------------------------------------------------------

    it('inaccessible on jig objects from outside', () => {
      const jig = { }
      class A extends Jig { }
      Object.setPrototypeOf(jig, A.prototype)
      const jig2 = new Membrane(jig)
      sudo(() => { jig2._n = 1 })
      expect(() => jig2._n).to.throw('Cannot access private property _n')
    })

    // ------------------------------------------------------------------------

    it('throws on delete', () => {
      const A = new Membrane(class A { static testDelete (b) { delete b._n } })
      const B = new Membrane(class B extends Jig { })
      expect(() => A.testDelete(B)).to.throw('Cannot delete private property _n')
    })

    // ------------------------------------------------------------------------

    it('throws on get', () => {
      const A = new Membrane(class A { static testGet (b) { return b._n } })
      const B = new Membrane(class B extends Jig { })
      expect(() => A.testGet(B)).to.throw('Cannot access private property _n')
    })

    // ------------------------------------------------------------------------

    it('throws on getOwnPropertyDescriptor', () => {
      const A = new Membrane(class A {
        static testGetDesc (b) {
          return Object.getOwnPropertyDescriptor(b, '_n')
        }
      })
      const B = new Membrane(class B extends Jig { })
      expect(() => A.testGetDesc(B)).to.throw('Cannot access private property _n')
    })

    // ------------------------------------------------------------------------

    it('throws on has', () => {
      const A = new Membrane(class A { static testHas (b) { return '_n' in b } })
      const B = new Membrane(class B extends Jig { })
      expect(() => A.testHas(B)).to.throw('Cannot access private property _n')
    })

    // ------------------------------------------------------------------------

    it('filters ownKeys', () => {
      const A = new Membrane(class A { static testKeys (b) { return Object.getOwnPropertyNames(b) } })
      const B = new Membrane(class B extends Jig { })
      sudo(() => { B._n = 1 })
      expect(A.testKeys(B).includes('_n')).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('throws on set', () => {
      const A = new Membrane(class A { static testSet (b) { b._n = 1 } })
      const B = new Membrane(class B extends Jig { })
      sudo(() => { B._n = 1 })
      expect(() => A.testSet(B)).to.throw('Cannot set private property _n')
    })

    // ------------------------------------------------------------------------

    it('accessible in jig object from instance of same class', () => {
      class A extends Jig { testGet (b) { return b._n } }
      const a = {}
      const b = {}
      Object.setPrototypeOf(a, A.prototype)
      Object.setPrototypeOf(b, A.prototype)
      const a2 = new Membrane(a)
      const b2 = new Membrane(b)
      sudo(() => { b2._n = 1 })
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
      sudo(() => { b2._n = 1 })
      expect(a2.testGet(b2)).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('accessible in jig code from same class', () => {
      class A extends Jig { static testGet () { return this._n } }
      const A2 = new Membrane(A)
      sudo(() => { A2._n = 1 })
      expect(A2.testGet()).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('accessible from inner object of same jig', () => {
      class A extends Jig { static testGet (x) { return x._n } }
      const A2 = new Membrane(A)
      const B = new Membrane({}, A2)
      sudo(() => { A2._n = 1 })
      expect(A2.testGet(B)).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('throws when access parent class private property', () => {
      class A extends Jig { static testGet () { return this._n } }
      const A2 = new Membrane(A)
      class B extends A2 { }
      const B2 = new Membrane(B)
      sudo(() => { A2._n = 1 })
      expect(() => B2.testGet()).to.throw('Cannot access private property _n')
    })

    // ------------------------------------------------------------------------

    it('accessible if only access child class private property', () => {
      class A extends Jig { static testGet () { return this._n } }
      const A2 = new Membrane(A)
      class B extends A2 { }
      const B2 = new Membrane(B)
      sudo(() => { A2._n = 1 })
      sudo(() => { B2._n = 2 })
      expect(B2.testGet()).to.equal(2)
    })
  })

  // --------------------------------------------------------------------------
  // Immutable
  // --------------------------------------------------------------------------

  describe('immutable', () => {
    it('delete disabled', () => {
      class A { static f () { delete this.n } }
      const A2 = new Membrane(A)
      expect(() => A2.f()).to.throw('delete disabled')
    })

    it('set disabled', () => {
      class A extends Berry { f () { this.n = 1 } }
      const o = { }
      Object.setPrototypeOf(o, A.prototype)
      const o2 = new Membrane(o)
      expect(() => o2.f()).to.throw('set disabled')
    })

    it('sudo overrides', () => {
      class A { static f () { delete this.n } }
      const A2 = new Membrane(A)
      expect(() => _sudo(() => A2.f())).not.to.throw()
    })

    it('inner objects inherit immutability', () => {
      const jig = new Membrane(class A { })
      class B { f () { this.n = 1 } }
      const b = new Membrane(new B(), jig)
      expect(() => b.f()).to.throw('set disabled')
    })

    it('inner methods inherit immutability', () => {
      const jig = new Membrane(class A { })
      function f (x) { delete x.n }
      const f2 = new Membrane(f, jig)
      expect(() => f2(f2)).to.throw('delete disabled')
    })

    it('adds immutable membrane when get objects', () => {
      class A { }
      A.o = { n: 1 }
      const A2 = new Membrane(A)
      expect(A2.o).not.to.equal(A.o)
      expect(A2.o).to.deep.equal(A.o)
      expect(() => { A2.o.n = 1 }).to.throw('set disabled')
    })

    it('adds immutable membrane when get object descriptor', () => {
      class A { }
      A.o = { n: 1 }
      const A2 = new Membrane(A)
      const getO = X => Object.getOwnPropertyDescriptor(X, 'o').value
      expect(getO(A2)).not.to.equal(getO(A))
      expect(getO(A2)).to.deep.equal(getO(A))
    })

    it('adds immutable membrane for intrinsic out', () => {
      const m = new Map()
      m.set(1, { n: 1 })
      const jig = new Membrane(class A { })
      const m2 = new Membrane(m, jig)
      expect(m2.get(1)).not.to.equal(m.get(1))
      expect(m2.get(1)).to.deep.equal(m.get(1))
    })

    it('removes membrane for objects set', () => {
      class A extends Jig { static f (o) { this.n = o } }
      A.o = { n: 1 }
      const A2 = new Membrane(A)
      expect(A2.o).not.to.equal(A.o)
      A2.f(A2.o)
      expect(A2.n).to.equal(A2.o)
      expect(sudo(() => A2.n)).to.equal(A.o)
    })

    // Removes membrane for intrinsic in (object)
    // Does not removes membrane for primitive types
    // Get prototype ...
    // GetOwnPropertyDescriptor prototype ...
    // defineProperty!
    // And immutable
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

  describe('record', () => {
    // TODO
  })

  describe('borrow', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
