/**
 * repository.js
 *
 * Tests for lib/kernel/repository.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Code } = Run

// ------------------------------------------------------------------------------------------------
// Repository
// ------------------------------------------------------------------------------------------------

describe('Repository', () => {
  describe('install', () => {
    it('creates from class', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      expect(CA.toString()).to.equal(A.toString())
    })

    it('creates from function', () => {
      const run = new Run()
      function f () { }
      const f2 = run.install(f)
      expect(f2.toString()).to.equal(f.toString())
    })

    it('is instanceof Code', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      expect(A instanceof Code).to.equal(false)
      expect(CA instanceof Code).to.equal(true)
      function f () { }
      const f2 = run.install(f)
      expect(f instanceof Code).to.equal(false)
      expect(f2 instanceof Code).to.equal(true)
    })

    it('adds invisible Code functions', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      expect(typeof CA.upgrade).to.equal('function')
      expect(typeof CA.sync).to.equal('function')
      expect(typeof CA.destroy).to.equal('function')
      expect(Object.getOwnPropertyNames(CA).includes('upgrade')).to.equal(false)
      expect(Object.getOwnPropertyNames(CA).includes('sync')).to.equal(false)
      expect(Object.getOwnPropertyNames(CA).includes('destroy')).to.equal(false)
    })

    it('creates local code only once', () => {
      const run = new Run()
      class A { }
      const CA1 = run.install(A)
      const CA2 = run.install(A)
      expect(CA1).to.equal(CA2)
    })
  })
})

// ------------------------------------------------------------------------------------------------
