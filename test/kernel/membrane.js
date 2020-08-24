/**
 * membrane.js
 *
 * Tests for lib/kernel/membrane.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
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
    it('throws if use jig with errors', () => {
      const A = new Membrane(class A {})
      const f = new Membrane(function f () {})
      const m = new Membrane(new Map(), A)

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
    })

    it('throws if inner object with jig errors', () => {
      // TODO
    })

    it('does not throw if no errors', () => {
      // TODO
    })
  })

  describe('admin', () => {
    it('admin mode runs directly on target', () => {
      // TODO
    })

    it('admin mode overrides errors', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
