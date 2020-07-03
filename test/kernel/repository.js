/**
 * repository.js
 *
 * Tests for lib/kernel/repository.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { PrivateKey } = require('bsv')
const Run = require('../env/run')
const { Code, sandbox } = Run
const unmangle = require('../env/unmangle')
const SI = unmangle(sandbox)._intrinsics

const randomLocation = () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + '_o0'
const randomOwner = () => new PrivateKey().toAddress().toString()

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

    it('throws if not a function', () => {
      const run = new Run()
      expect(() => run.install()).to.throw('Cannot install')
      expect(() => run.install(0)).to.throw('Cannot install')
      expect(() => run.install({})).to.throw('Cannot install')
      expect(() => run.install('class A {}')).to.throw('Cannot install')
      expect(() => run.install(null)).to.throw('Cannot install')
    })

    it('throw if anonymous', () => {
      const run = new Run()
      expect(() => run.install(() => {})).to.throw('Cannot install')
      expect(() => run.install(class {})).to.throw('Cannot install')
    })

    it('throws if built-in', () => {
      const run = new Run()
      expect(() => run.install(Object)).to.throw('Cannot install Object')
      expect(() => run.install(Date)).to.throw('Cannot install Date')
      expect(() => run.install(Uint8Array)).to.throw('Cannot install')
      expect(() => run.install(Math.sin)).to.throw('Cannot install sin')
      expect(() => run.install(parseInt)).to.throw('Cannot install parseInt')
      expect(() => run.install(SI.Object)).to.throw('Cannot install Object')
    })

    it('throws if prototype inheritance', () => {
      const run = new Run()
      function A () { }
      function B () { }
      B.prototype = Object.create(A.prototype)
      expect(() => run.install(B)).to.throw('Cannot install B')
    })

    it('throws if contains reserved words', () => {
      const run = new Run()
      class A { }
      A.toString = () => 'hello'
      expect(() => run.install(A)).to.throw('Cannot install A')
      class B { }
      B.upgrade = 1
      expect(() => run.install(B)).to.throw('Cannot install B')
      class C { static sync () { }}
      expect(() => run.install(C)).to.throw('Cannot install C')
      class D { static get destroy () { } }
      expect(() => run.install(D)).to.throw('Cannot install D')
    })

    it('throws if contains bindings', () => {
      const run = new Run()
      class A { }
      A.location = randomLocation()
      A.origin = randomLocation()
      A.owner = randomOwner()
      A.satoshis = 0
      A.nonce = 1
      expect(() => run.install(A)).to.throw('Cannot install A')
    })

    it('installs parents', () => {
      const run = new Run()
      class A { }
      class B extends A { }
      class C extends B { }
      const CC = run.install(C)
      const CB = run.install(B)
      const CA = run.install(A)
      expect(Object.getPrototypeOf(CC)).to.equal(CB)
      expect(Object.getPrototypeOf(CB)).to.equal(CA)
    })

    it('throws if error creating dependency', () => {
      const run = new Run()
      class A { }
      A.Date = Date
      expect(() => run.install(A)).to.throw('Cannot install Date')
    })
  })
})

// ------------------------------------------------------------------------------------------------
