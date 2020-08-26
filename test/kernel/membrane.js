/**
 * membrane.js
 *
 * Tests for lib/kernel/membrane.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { _sudo } = require('../../lib/util/admin')
const Membrane = unmangle(Run)._Membrane
const sudo = unmangle(Run)._sudo

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

describe('Membrane', () => {
  describe('constructor', () => {
    it('creates proxy', () => {
      // TODO
    })
  })

  describe('errors', () => {
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

    it('throws if inner objects jig has errors', () => {
      const jig = { location: 'error://hello' }
      const o = new Membrane({}, jig)
      expect(() => o.n).to.throw('hello')
    })
  })

  describe('admin', () => {
    it('admin mode runs directly on target', () => {
      class A { }
      const A2 = new Membrane(A)
      function f () { return f }
      const f2 = new Membrane(f)
      expect(_sudo(() => new A2()) instanceof A).to.equal(true)
      expect(_sudo(() => f2())).to.equal(f)
      _sudo(() => Object.defineProperty(A2, 'n', { value: 1, configurable: true }))
      expect(A.n).to.equal(1)
      _sudo(() => { delete A2.n })
      expect('n' in A).to.equal(false)
      A.n = 2
      expect(_sudo(() => Object.getOwnPropertyDescriptor(A, 'n')).value).to.equal(2)
      expect(_sudo(() => Object.getPrototypeOf(A2))).to.equal(Object.getPrototypeOf(A))
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
      const m2 = new Membrane(m, f)
      _sudo(() => m2.set(o))
      expect(_sudo(() => m.has(o))).to.equal(true)
    })

    it('admin mode overrides errors', () => {
      const f = new Membrane(function f () { })
      _sudo(() => { f.location = 'error://hello' })
      expect(_sudo(() => f.location)).to.equal('error://hello')
    })
  })

  describe('code methods', () => {
    it('has', () => {
      const f = new Membrane(function f () { })
      expect('sync' in f).to.equal(true)
      expect('upgrade' in f).to.equal(true)
      expect('destroy' in f).to.equal(true)
      expect('auth' in f).to.equal(true)
    })
  })
})

// ------------------------------------------------------------------------------------------------
