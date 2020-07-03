/**
 * repository.js
 *
 * Tests for lib/kernel/repository.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { PrivateKey } = require('bsv')
const Run = require('../env/run')
const { Code, Jig, Berry, sandbox } = Run
const unmangle = require('../env/unmangle')
const SI = unmangle(sandbox)._intrinsics
const Membrane = unmangle(unmangle(Run)._Membrane)

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

    it('creates code for props', () => {
      const run = new Run()
      class A { }
      class B { }
      A.B = B
      const CA = run.install(A)
      expect(CA.B).to.equal(run.install(B))
    })

    it('installs circular prop code', () => {
      const run = new Run()
      class A { }
      class B { }
      A.B = B
      B.A = A
      const CA = run.install(A)
      const CB = run.install(B)
      expect(CA.B).to.equal(CB)
      expect(CB.A).to.equal(CA)
    })

    it('installs circular parent-child code', () => {
      const run = new Run()
      class B { }
      class A extends B { }
      B.A = A
      const CA = run.install(A)
      const CB = run.install(B)
      expect(Object.getPrototypeOf(CA)).to.equal(CB)
      expect(CB.A).to.equal(CA)
    })

    it('installs parent that is code jig', () => {
      const run = new Run()
      class B { }
      const CB = run.install(B)
      class A extends CB { }
      B.deps = { A }
      const CA = run.install(A)
      expect(Object.getPrototypeOf(CA)).to.equal(CB)
    })

    it('sets initial bindings', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      expect(() => CA.location).to.throw('Cannot read location: Undeployed')
      expect(() => CA.origin).to.throw('Cannot read origin: Undeployed')
      expect(() => CA.nonce).to.throw('Cannot read nonce: Undeployed')
      expect(() => CA.owner).to.throw('Cannot read owner: Not bound')
      expect(() => CA.satoshis).to.throw('Cannot read satoshis: Not bound')
      Membrane._sudo(() => {
        expect(CA.location).to.equal('error://Undeployed')
        expect(CA.origin).to.equal('error://Undeployed')
        expect(CA.nonce).to.equal(-1)
        expect(unmangle(CA.owner)._value).to.equal(undefined)
        expect(unmangle(CA.satoshis)._value).to.equal(undefined)
      })
    })
  })

  describe('deps', () => {
    it('makes deps globals', () => {
      const run = new Run()
      class A { }
      function f () { return A }
      f.deps = { A }
      const sf = run.install(f)
      expect(sf()).to.equal(run.install(A))
    })

    it('supports normal javascript values as deps', () => {
      const run = new Run()
      class A {
        static n () { return n } // eslint-disable-line
        static o () { return o } // eslint-disable-line
      }
      A.deps = { n: 1, o: { a: [] } }
      const CA = run.install(A)
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
      const CA = run.install(A)
      expect(CA.deps.B).to.equal(run.install(B))
    })

    it('throws if deps invalid', () => {
      const run = new Run()
      class A { }
      A.deps = null
      expect(() => run.install(A)).to.throw('Cannot install A')
      A.deps = '123'
      expect(() => run.install(A)).to.throw('Cannot install A')
      A.deps = []
      expect(() => run.install(A)).to.throw('Cannot install A')
      A.deps = new class Deps {}()
      expect(() => run.install(A)).to.throw('Cannot install A')
    })

    it('doesnt install parent deps on child', () => {
      const run = new Run()
      class B { f () { return n } } // eslint-disable-line
      class A extends B { g () { return n } } // eslint-disable-line
      B.deps = { n: 1 }
      const CB = run.install(B)
      const b = new CB()
      expect(b.f()).to.equal(1)
      const CA = run.install(A)
      const a = new CA()
      expect(() => a.g()).to.throw()
    })
  })

  describe('presets', () => {
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
      const CA = run.install(A)
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
      const CA = run.install(A)
      expect(CA.a).not.to.equal(A.presets[network].a)
      expect(CA.s).not.to.equal(A.presets[network].s)
      expect(CA.a instanceof SI.Array).to.equal(true)
      expect(CA.s instanceof SI.Set).to.equal(true)
    })

    it.skip('copies jigs', async () => {
      const run = new Run()
      const network = run.blockchain.network
      class J extends Jig { }
      const j = new J()
      class B extends Berry { static pluck () { return new B() } }
      const b = await run.load('', B)
      class C {}
      class A { }
      A.presets = { [network]: { b, j, C } }
      const CA = run.install(A)
      expect(CA.b).to.equal(b)
      expect(CA.j).to.equal(j)
      expect(CA.C).not.to.equal(C)
      expect(CA.C.toString()).to.equal(C.toString())
      expect(CA.C).to.equal(run.install(C))
    })

    it('does not add presets to code jig', () => {
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
      const CA = run.install(A)
      expect(CA.presets).to.equal(undefined)
    })
  })
})

// ------------------------------------------------------------------------------------------------
