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
const Code = Run._Code

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

describe('Code', () => {
  describe('new', () => {
    it('creates from class', () => {
      new Run() // eslint-disable-line
      class A { }
      const SA = new Code(A)
      expect(SA.toString()).to.equal(A.toString())
    })

    it('creates from function', () => {
      new Run() // eslint-disable-line
      function f () { }
      new Code(f) // eslint-disable-line
    })

    it('creates from anonymous class', () => {
      new Run() // eslint-disable-line
      new Code(class {}) // eslint-disable-line
    })

    it('creates from anonymous function', () => {
      new Run() // eslint-disable-line
      new Code(() => {}) // eslint-disable-line
    })

    it('creates with resource presets', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = {
        [network]: {
          location: 'abc_o1',
          origin: 'abc_o1',
          owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td'
        }
      }
      const SA = new Code(A)
      expect(SA.location).to.equal(A.presets[network].location)
      expect(SA.origin).to.equal(A.presets[network].origin)
      expect(SA.owner).to.equal(A.presets[network].owner)
      expect(typeof SA.presets).to.equal('undefined')
    })

    it('clones object presets', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { a: [], s: new Set() } }
      const SA = new Code(A)
      const SI = unmangle(Run.sandbox)._intrinsics
      expect(SA.a).not.to.equal(A.presets[network].a)
      expect(SA.s).not.to.equal(A.presets[network].s)
      expect(SA.a instanceof SI.Array).to.equal(true)
      expect(SA.s instanceof SI.Set).to.equal(true)
    })

    it('copies jigs in presets', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      class B extends Jig { }
      const b = new B()
      A.presets = { [network]: { b } }
      const SA = new Code(A)
      expect(SA.b).to.equal(b)
    })

    it('copies berries in presets', async () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      class B extends Berry { static pluck () { return new B() } }
      const b = await run.load('', B)
      A.presets = { [network]: { b } }
      const SA = new Code(A)
      expect(SA.b).to.equal(b)
    })

    it('installs code in presets', async () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      class B { }
      A.presets = { [network]: { B } }
      const SA = new Code(A)
      expect(SA.B).not.to.equal(B)
      expect(SA.B.toString()).to.equal(B.toString())
    })

    it('throws if not a valid type', () => {
      new Run() // eslint-disable-line
      expect(() => new Code()).to.throw('Cannot install')
      expect(() => new Code(0)).to.throw('Cannot install')
      expect(() => new Code({})).to.throw('Cannot install')
      expect(() => new Code('class A {}')).to.throw('Cannot install')
      expect(() => new Code(null)).to.throw('Cannot install')
    })

    it('throws if create built-in type', () => {
      new Run() // eslint-disable-line
      expect(() => new Code(Object)).to.throw('Cannot install Object')
      expect(() => new Code(Date)).to.throw('Cannot install Date')
      expect(() => new Code(Uint8Array)).to.throw('Cannot install')
      expect(() => new Code(Math.sin)).to.throw('Cannot install sin')
      expect(() => new Code(parseInt)).to.throw('Cannot install parseInt')
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
      A.presets = { [network]: { location: 'abc_o1' } }
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.presets = { [network]: { origin: 'abc_o1' } }
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.presets = { [network]: { owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td' } }
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.presets = {
        [network]: {
          location: '_o1',
          origin: 'abc_o1',
          owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td'
        }
      }
      expect(() => new Code(A)).to.throw()
      A.presets = {
        [network]: {
          location: 'abc_o1',
          origin: 'abc_o1',
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
          location: 'abc_o1',
          origin: 'abc_o1',
          owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td'
        }
      }
      class B { }
      Object.assign(B, A)
      const SA = new Code(A)
      const SB = new Code(B)
      expect(SA).to.equal(SB)
    })

    it('creates parents', () => {
      new Run() // eslint-disable-line
      class A { }
      class B extends A { }
      class C extends B { }
      const SC = new Code(C)
      const SB = new Code(B)
      const SA = new Code(A)
      expect(Object.getPrototypeOf(SC)).to.equal(SB)
      expect(Object.getPrototypeOf(SB)).to.equal(SA)
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
      const SA1 = new Code(A)
      const SA2 = new Code(A)
      expect(SA1).to.equal(SA2)
    })

    it('should set deps as globals', () => {
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
      const SA = new Code(A)
      expect(SA.n()).to.equal(1)
      expect(SA.o()).not.to.equal(A.deps.o)
      expect(SA.o()).to.deep.equal(A.deps.o)
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

    // parent deps not in children
    // parent presets don't go down

    // is deps available?

    /*
    it('should install Code in properties', () => {
    })

    it('should support circular dependencies', () => {

    })

    // Test loop of parents and children

    // Test for deps, and bad parent dep

    it('does not duplicate parents', () => {
      // Parent
    })

    // Test dependencies

    it('should not create if error creating dependent code', () => {
      const repo = unmangle(new Repository('mock'))
      class A { }
      A.Date = Date
      expect(() => repo._install(A)).to.throw('Cannot install Date')
      expect(repo._find(A)).to.equal(undefined)
      expect(repo._find(Date)).to.equal(undefined)
    })
    */
  })
})

// ------------------------------------------------------------------------------------------------
