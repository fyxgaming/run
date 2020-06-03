/**
 * code.js
 *
 * Tests for lib/kernel/code.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../../env/config')
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

    it('dedups code', () => {
      new Run() // eslint-disable-line
      class A { }
      const SA1 = new Code(A)
      const SA2 = new Code(A)
      expect(SA1).to.equal(SA2)
    })

    it('throws if parent dependency mismatch', () => {
      new Run() // eslint-disable-line
      class A { }
      class C { }
      class B extends A { }
      B.deps = { A: C }
      expect(() => new Code(B)).to.throw('Parent dependency mismatch')
    })

    /*
    it('should install Code in properties', () => {
    })

    it('should apply deps as globals', () => {
      const repo = unmangle(new Repository('mock'))
      class A { }
      function f () { return A }
      f.deps = { A }
      repo._install(f)
    })

    it('should support circular dependencies', () => {

    })

    it('installs and sandboxes type with jig presets', () => {
      const repo = unmangle(new Repository('mock'))
      class A { }
      A.presets = {
        mock: {
          location: 'abc_o1',
          origin: 'abc_o1',
          owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td'
        }
      }
      const desc = unmangle(repo._install(A))
      expect(desc._T).to.equal(A)
      expect(desc._S).not.to.equal(A)
      expect(desc._S.toString()).to.equal(A.toString())
      expect(desc._locals.size).to.equal(1)
      expect(desc._deploying).to.equal(false)
      expect(desc._deployed).to.equal(true)
      expect(desc._native).to.equal(false)
      expect(desc._S.location).to.equal(A.presets.mock.location)
      expect(desc._S.origin).to.equal(A.presets.mock.origin)
      expect(desc._S.owner).to.equal(A.presets.mock.owner)
    })

    it('installs type having resource presets on another network', () => {
      const repo = unmangle(new Repository('mock'))
      class A { }
      A.presets = {
        test: {
          location: 'abc_o1',
          origin: 'abc_o1',
          owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td'
        }
      }
      const desc = unmangle(repo._install(A))
      expect(desc._T).to.equal(A)
      expect(desc._S).not.to.equal(A)
      expect(desc._S.toString()).to.equal(A.toString())
      expect(desc._locals.size).to.equal(1)
      expect(desc._deploying).to.equal(false)
      expect(desc._deployed).to.equal(false)
      expect(desc._native).to.equal(false)
      expect(desc._S.location).to.equal(undefined)
      expect(desc._S.origin).to.equal(undefined)
      expect(desc._S.owner).to.equal(undefined)
    })

    it('applies normal presets to sandbox', () => {
      const repo = unmangle(new Repository('mock'))
      class A { }
      A.NUM = 2
      A.OBJ = { m: 2 }
      A.ARR = [2]
      A.presets = {
        mock: {
          NUM: 1,
          OBJ: { n: 1, o: {} },
          ARR: [1]
        }
      }
      const desc = unmangle(repo._install(A))
      expect(desc._S.NUM).to.equal(1)
      expect(desc._S.OBJ).to.deep.equal({ n: 1, o: {} })
      expect(desc._S.ARR).to.deep.equal([1])
    })

    it('installs parents before children', () => {
      const repo = unmangle(new Repository('mock'))
      class A { }
      class B extends A { }
      class C extends B { }
      repo._install(C)
      const desc = unmangle(repo._find(A))
      expect(desc._T).to.equal(A)
      expect(desc._S).not.to.equal(A)
      expect(desc._deployed).to.equal(false)
    })

    // Test loop of parents and children

    // Test for deps, and bad parent dep

    it('returns descriptor if already installed', () => {
      const repo = unmangle(new Repository('mock'))
      class A { }
      const desc = repo._install(A)
      expect(repo._install(A)).to.equal(desc)
    })

    it('does not duplicate parents', () => {
      // Parent
    })

    // Test dependencies

    it('returns existing descriptor of a preset copy', () => {
      const repo = unmangle(new Repository('mock'))
      class A { }
      A.presets = {
        mock: {
          location: 'abc_o1',
          origin: 'abc_o1',
          owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td'
        }
      }
      class B { }
      Object.assign(B, A)
      const desc = repo._install(A)
      const desc2 = repo._install(B)
      expect(desc).to.equal(desc2)
      expect(unmangle(desc)._T).to.equal(A)
      expect(unmangle(desc)._locals.size).to.equal(2)
      expect(unmangle(desc)._deployed).to.equal(true)
    })

    it('throws if not a valid type', () => {
      const repo = unmangle(new Repository('mock'))
      expect(() => repo._install()).to.throw('Cannot install')
      expect(() => repo._install(0)).to.throw('Cannot install')
      expect(() => repo._install({})).to.throw('Cannot install')
      expect(() => repo._install('class A {}')).to.throw('Cannot install')
      expect(() => repo._install(null)).to.throw('Cannot install')
    })

    it('throws if deps are invalid', () => {
      const repo = unmangle(new Repository('mock'))
      class A { }
      A.deps = null
      expect(() => repo._install(A)).to.throw('Cannot install A')
      A.deps = '123'
      expect(() => repo._install(A)).to.throw('Cannot install A')
      A.deps = true
      expect(() => repo._install(A)).to.throw('Cannot install A')
    })

    it('throws if presets are invalid', () => {
      const repo = unmangle(new Repository('mock'))
      class A { }
      A.presets = null
      expect(() => repo._install(A)).to.throw('Cannot install A')
      A.presets = { mock: null }
      expect(() => repo._install(A)).to.throw('Cannot install A')
      A.presets = { mock: { location: 'abc_o1' } }
      expect(() => repo._install(A)).to.throw('Cannot install A')
      A.presets = { mock: { origin: 'abc_o1' } }
      expect(() => repo._install(A)).to.throw('Cannot install A')
      A.presets = { mock: { owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td' } }
      expect(() => repo._install(A)).to.throw('Cannot install A')
      A.presets = {
        mock: {
          location: '_o1',
          origin: 'abc_o1',
          owner: '1MS5QUfk9DJAJE5WQxikME1tkMCeabw6Td'
        }
      }
      expect(() => repo._install(A)).to.throw()
    })

    it('throws if there is prototype inheritance', () => {
      const repo = unmangle(new Repository('mock'))
      function A () { }
      function B () { }
      B.prototype = Object.create(A.prototype)
      expect(() => repo._install(B)).to.throw('Cannot install B')
    })

    it('throws if install built-in type', () => {
      const repo = unmangle(new Repository('mock'))
      expect(() => repo._install(Object)).to.throw('Cannot install Object')
      expect(() => repo._install(Date)).to.throw('Cannot install Date')
      expect(() => repo._install(Uint8Array)).to.throw('Cannot install')
      expect(() => repo._install(Math.sin)).to.throw('Cannot install sin')
      expect(() => repo._install(parseInt)).to.throw('Cannot install parseInt')
    })

    it('should not install if error', () => {
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
