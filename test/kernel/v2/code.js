/**
 * code.js
 *
 * Tests for lib/kernel/code.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../../env/config')
const { Jig, Berry } = Run
const { unmangle } = require('../../env/unmangle')
const Code = unmangle(Run)._Code

const randomLocation = () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + '_o0'

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

describe('Code', () => {
  describe('new', () => {
    it('creates from class', () => {
      new Run() // eslint-disable-line
      class A { }
      const CA = new Code(A)
      expect(CA.toString()).to.equal(A.toString())
    })

    it('creates from function', () => {
      new Run() // eslint-disable-line
      function f () { }
      new Code(f) // eslint-disable-line
    })

    it('throws if not a valid type', () => {
      new Run() // eslint-disable-line
      expect(() => new Code()).to.throw('Cannot install')
      expect(() => new Code(0)).to.throw('Cannot install')
      expect(() => new Code({})).to.throw('Cannot install')
      expect(() => new Code('class A {}')).to.throw('Cannot install')
      expect(() => new Code(null)).to.throw('Cannot install')
    })

    it('throw if anonymous', () => {
      new Run() // eslint-disable-line
      expect(() => new Code(() => {})).to.throw('Cannot install')
      expect(() => new Code(class {})).to.throw('Cannot install')
    })

    it('throws if create built-in type', () => {
      new Run() // eslint-disable-line
      expect(() => new Code(Object)).to.throw('Cannot install Object')
      expect(() => new Code(Date)).to.throw('Cannot install Date')
      expect(() => new Code(Uint8Array)).to.throw('Cannot install')
      expect(() => new Code(Math.sin)).to.throw('Cannot install sin')
      expect(() => new Code(parseInt)).to.throw('Cannot install parseInt')
    })

    it('creates parents', () => {
      new Run() // eslint-disable-line
      class A { }
      class B extends A { }
      class C extends B { }
      const CC = new Code(C)
      const CB = new Code(B)
      const CA = new Code(A)
      expect(Object.getPrototypeOf(CC)).to.equal(CB)
      expect(Object.getPrototypeOf(CB)).to.equal(CA)
    })

    it('throws if prototype inheritance', () => {
      new Run() // eslint-disable-line
      function A () { }
      function B () { }
      B.prototype = Object.create(A.prototype)
      expect(() => new Code(B)).to.throw('Cannot install B')
    })

    it('creates only once', () => {
      new Run() // eslint-disable-line
      class A { }
      const CA1 = new Code(A)
      const CA2 = new Code(A)
      expect(CA1).to.equal(CA2)
    })

    it('throws if error creating dependent code', () => {
      new Run() // eslint-disable-line
      class A { }
      A.Date = Date
      expect(() => new Code(A)).to.throw('Cannot install Date')
      expect(Code._get(A)).to.equal(undefined)
      expect(Code._get(Date)).to.equal(undefined)
    })

    it('throws if contains reserved properties', () => {
      new Run() // eslint-disable-line
      class A { }
      A.toString = () => 'hello'
      expect(() => new Code(A)).to.throw('Cannot install A')
      class B { static deploy () { } }
      expect(() => new Code(B)).to.throw('Cannot install B')
      class C { }
      C.upgrade = 1
      expect(() => new Code(C)).to.throw('Cannot install C')
      class D { }
      D.sync = undefined
      expect(() => new Code(D)).to.throw('Cannot install D')
      class E { static get release () { } }
      expect(() => new Code(E)).to.throw('Cannot install E')
    })

    it('should create code for props', () => {
      new Run() // eslint-disable-line
      class A { }
      class B { }
      A.B = B
      const CA = new Code(A)
      expect(CA.B).to.equal(new Code(B))
    })

    it('should install circular prop code', () => {
      new Run() // eslint-disable-line
      class A { }
      class B { }
      A.B = B
      B.A = A
      const CA = new Code(A)
      const CB = new Code(B)
      expect(CA.B).to.equal(CB)
      expect(CB.A).to.equal(CA)
    })

    it('should install circular parent-child code', () => {
      new Run() // eslint-disable-line
      class B { }
      class A extends B { }
      B.A = A
      const CA = new Code(A)
      const CB = new Code(B)
      expect(Object.getPrototypeOf(CA)).to.equal(CB)
      expect(CB.A).to.equal(CA)
    })

    it('installs parent that is code jig', () => {
      new Run() // eslint-disable-line
      class B { }
      const CB = new Code(B)
      class A extends CB { }
      B.deps = { A }
      const CA = new Code(A)
      expect(Object.getPrototypeOf(CA)).to.equal(CB)
    })

    // test read only
    // Parent can be an anonymous class?
    // Parent can be a function?

    /*
    it('does not duplicate parents', () => {
      // Parent
    })
    */
  })

  describe('deps', () => {
    it('should make deps globals', () => {
      new Run() // eslint-disable-line
      class A { }
      function f () { return A }
      f.deps = { A }
      const sf = new Code(f)
      expect(sf()).to.equal(new Code(A))
    })

    it('should support non-resource deps', () => {
      new Run() // eslint-disable-line
      class A {
        static n () { return n } // eslint-disable-line
        static o () { return o } // eslint-disable-line
      }
      A.deps = { n: 1, o: { a: [] } }
      const CA = new Code(A)
      expect(CA.n()).to.equal(1)
      expect(CA.o()).not.to.equal(A.deps.o)
      expect(CA.o()).to.deep.equal(A.deps.o)
    })

    it('should set deps on code jig', () => {
      new Run() // eslint-disable-line
      class A { }
      class B { }
      A.deps = { B }
      const CA = new Code(A)
      expect(CA.deps.B).to.equal(new Code(B))
    })

    it('throws if deps invalid', () => {
      new Run() // eslint-disable-line
      class A { }
      A.deps = null
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.deps = '123'
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.deps = []
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.deps = new class Deps {}()
      expect(() => new Code(A)).to.throw('Cannot install A')
    })

    it('should not install parent deps on child', () => {
      new Run() // eslint-disable-line
      class B { f () { return n } } // eslint-disable-line
      class A extends B { g () { return n } } // eslint-disable-line
      B.deps = { n: 1 }
      const CB = new Code(B)
      const b = new CB()
      expect(b.f()).to.equal(1)
      const CA = new Code(A)
      const a = new CA()
      expect(() => a.g()).to.throw()
    })
  })

  describe('presets', () => {
    it('creates with resource presets', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = {
        [network]: {
          location: randomLocation(),
          origin: randomLocation(),
          owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td'
        }
      }
      const CA = new Code(A)
      expect(CA.location).to.equal(A.presets[network].location)
      expect(CA.origin).to.equal(A.presets[network].origin)
      expect(CA.owner).to.equal(A.presets[network].owner)
      expect(typeof CA.presets).to.equal('undefined')
    })

    it('clones objects in presets', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { a: [], s: new Set() } }
      const CA = new Code(A)
      const SI = unmangle(Run.sandbox)._intrinsics
      expect(CA.a).not.to.equal(A.presets[network].a)
      expect(CA.s).not.to.equal(A.presets[network].s)
      expect(CA.a instanceof SI.Array).to.equal(true)
      expect(CA.s instanceof SI.Set).to.equal(true)
    })

    it('copies jigs in presets', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      class B extends Jig { }
      const b = new B()
      A.presets = { [network]: { b } }
      const CA = new Code(A)
      expect(CA.b).to.equal(b)
    })

    it('copies berries in presets', async () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      class B extends Berry { static pluck () { return new B() } }
      const b = await run.load('', B)
      A.presets = { [network]: { b } }
      const CA = new Code(A)
      expect(CA.b).to.equal(b)
    })

    it('installs code in presets', async () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      class B { }
      A.presets = { [network]: { B } }
      const CA = new Code(A)
      expect(CA.B).not.to.equal(B)
      expect(CA.B.toString()).to.equal(B.toString())
    })

    it('throws if parent dependency mismatch', () => {
      new Run() // eslint-disable-line
      class A { }
      class C { }
      class B extends A { }
      B.deps = { A: C }
      expect(() => new Code(B)).to.throw('Parent dependency mismatch')
    })

    it('throws if presets invalid', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = null
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.presets = { [network]: null }
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.presets = { [network]: { location: randomLocation() } }
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.presets = { [network]: { origin: randomLocation() } }
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.presets = { [network]: { owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td' } }
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.presets = {
        [network]: {
          location: '_o1',
          origin: randomLocation(),
          owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td'
        }
      }
      expect(() => new Code(A)).to.throw()
      A.presets = {
        [network]: {
          location: randomLocation(),
          origin: randomLocation(),
          owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td'
        },
        test: null
      }
      expect(() => new Code(A)).to.throw()
      A.presets = []
      expect(() => new Code(A)).to.throw()
      A.presets = { [network]: new class Presets {}() }
      expect(() => new Code(A)).to.throw()
    })

    it('returns existing code for a preset copy', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = {
        [network]: {
          location: randomLocation(),
          origin: randomLocation(),
          owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td'
        }
      }
      class B { }
      Object.assign(B, A)
      const CA = new Code(A)
      const CB = new Code(B)
      expect(CA).to.equal(CB)
    })

    it('should not have presets on code jig', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = {
        [network]: {
          location: randomLocation(),
          origin: randomLocation(),
          owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td'
        }
      }
      const CA = new Code(A)
      expect(CA.presets).to.equal(undefined)
    })

    it('throws if presets contains reserved properties', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { deps: {} } }
      expect(() => new Code(A)).to.throw()
      A.presets = { [network]: { presets: {} } }
      expect(() => new Code(A)).to.throw()
      A.presets = { [network]: { upgrade: () => {} } }
      expect(() => new Code(A)).to.throw()
    })

    it('should install presets separately on child', () => {
      const run = new Run()
      const network = run.blockchain.network
      class B { }
      B.presets = { [network]: { n: 1, m: 0 } }
      class A extends B { }
      A.presets = { [network]: { n: 2 } }
      const CB = new Code(B)
      const CA = new Code(A)
      expect(CB.n).to.equal(1)
      expect(CB.m).to.equal(0)
      expect(CA.n).to.equal(2)
      expect(CA.m).to.equal(0)
      expect(Object.getOwnPropertyNames(CA).includes('n')).to.equal(true)
      expect(Object.getOwnPropertyNames(CA).includes('m')).to.equal(false)
    })
  })

  describe('prototype', () => {
    it('should set prototype constructor to code jig', () => {
      new Run() // eslint-disable-line
      class A { }
      const CA = new Code(A)
      expect(CA.prototype.constructor).to.equal(CA)
    })
  })

  describe('name', () => {
    it('returns class or function name', () => {
      new Run() // eslint-disable-line
      class A { }
      expect(new Code(A).name).to.equal('A')
      function f () { }
      expect(new Code(f).name).to.equal('f')
    })
  })

  describe('toString', () => {
    it('returns same string as original code', () => {
      new Run() // eslint-disable-line
      class A { }
      const CA = new Code(A)
      expect(CA.toString()).to.equal(A.toString())
      expect(A.toString().replace(/\s/g, '')).to.equal('classA{}')
    })

    it('returns same code as original code but with code parent', () => {
      new Run() // eslint-disable-line
      class B { }
      const CB = new Code(B)
      class A extends CB { }
      const CA = new Code(A)
      expect(CA.toString().replace(/\s/g, '')).to.equal('classAextendsB{}')
    })
  })
})

// ------------------------------------------------------------------------------------------------
