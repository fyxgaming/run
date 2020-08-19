/**
 * membrane.js
 *
 * Tests for lib/membrane/membrane.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Membrane = unmangle(Run)._Membrane

describe('Membrane', () => {
  describe('pass through', () => {
    it('apply', () => {
      const f = new Proxy(function f (n) { return n }, new Membrane())
      expect(f(1)).to.equal(1)
    })

    it('construct', () => {
      const A = new Proxy(class A { constructor (n) { this.n = n } }, new Membrane())
      expect(new A() instanceof A).to.equal(true)
      expect(new A(1).n).to.equal(1)
    })

    it('defineProperty', () => {
      const o = new Proxy({}, new Membrane())
      Object.defineProperty(o, 'n', { value: 1, configurable: true })
      expect(o.n).to.equal(1)
    })

    it('deleteProperty', () => {
      const o = new Proxy({ n: 1 }, new Membrane())
      delete o.n
      expect('n' in o).to.equal(false)
      expect(o.n).to.equal(undefined)
    })

    it('get', () => {
      const o = new Proxy({ n: 1 }, new Membrane())
      expect(o.n).to.equal(1)
      expect(o.m).to.equal(undefined)
    })

    it('getOwnPropertyDescriptor', () => {
      const o = new Proxy({ n: 1 }, new Membrane())
      const desc = { value: 1, configurable: true, enumerable: true, writable: true }
      expect(Object.getOwnPropertyDescriptor(o, 'n')).to.deep.equal(desc)
    })

    it('getPrototypeOf', () => {
      class A { }
      const a = new Proxy(new A(), new Membrane())
      expect(Object.getPrototypeOf(a)).to.equal(A.prototype)
    })

    it('has', () => {
      const o = new Proxy({ n: 1 }, new Membrane())
      expect('n' in o).to.equal(true)
      expect('m' in o).to.equal(false)
    })

    it('isExtensible', () => {
      const o = new Proxy({ }, new Membrane())
      expect(Object.isExtensible(o)).to.equal(true)
    })

    it('ownKeys', () => {
      const o = new Proxy({ n: 1 }, new Membrane())
      expect(Object.getOwnPropertyNames(o)).to.deep.equal(['n'])
    })

    it('preventExtensions', () => {
      const o = new Proxy({ n: 1 }, new Membrane())
      Object.preventExtensions(o)
      expect(Object.isExtensible(o)).to.equal(true)
    })

    it('set', () => {
      const o = new Proxy({ n: 1 }, new Membrane())
      o.n = 2
      o.o = 3
      expect(o.n).to.equal(2)
      expect(o.o).to.equal(3)
    })

    it('setPrototypeOf', () => {
      const o = new Proxy({ }, new Membrane())
      class A { }
      Object.setPrototypeOf(o, A.prototype)
      expect(Object.getPrototypeOf(o)).to.equal(A.prototype)
    })
  })
})
