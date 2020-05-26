/**
 * code.js
 *
 * Tests for lib/kernel/code.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const Code = unmangle(Run)._Code

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

describe('Code', () => {
  describe('_install', () => {
    it('installs basic class', () => {
      const code = unmangle(new Code('mock'))
      class A { }
      const desc = code._install(A)
      expect(desc._T).to.equal(A)
      expect(desc._S).not.to.equal(A)
      expect(desc._S.toString()).to.equal(A.toString())
      expect(desc._locals.size).to.equal(1)
      expect(desc._deploying).to.equal(false)
      expect(desc._deployed).to.equal(false)
      expect(desc._native).to.equal(false)
    })

    it('installs function', () => {
      const code = unmangle(new Code('mock'))
      function f () { }
      const desc = code._install(f)
      expect(desc._T).to.equal(f)
    })

    it('installs anonymous class', () => {
      const code = unmangle(new Code('mock'))
      const desc = code._install(class { })
      expect(desc._T.toString()).to.equal(desc._S.toString())
    })

    it('installs anonymous function', () => {
      const code = unmangle(new Code('mock'))
      const desc = code._install(() => {})
      expect(desc._locals.size).to.equal(1)
    })

    it('installs and sandboxes type with resource presets', () => {
      const code = unmangle(new Code('mock'))
      class A { }
      A.presets = {
        mock: {
          location: '..',
          origin: '..',
          owner: '..'
        }
      }
      const desc = code._install(A)
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
      const code = unmangle(new Code('mock'))
      class A { }
      A.presets = {
        test: {
          location: '..',
          origin: '..',
          owner: '..'
        }
      }
      const desc = code._install(A)
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
      const code = unmangle(new Code('mock'))
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
      const desc = code._install(A)
      expect(desc._S.NUM).to.equal(1)
      expect(desc._S.OBJ).to.deep.equal({ n: 1, o: {} })
      expect(desc._S.ARR).to.deep.equal([1])
    })

    it('installs parents before children', () => {
      const code = unmangle(new Code('mock'))
      class A { }
      class B extends A { }
      class C extends B { }
      code._install(C)
      const desc = code._find(A)
      expect(desc._T).to.equal(A)
      expect(desc._S).not.to.equal(A)
      expect(desc._deployed).to.equal(false)
    })

    // Test loop of parents and children

    // Test for deps, and bad parent dep

    it('returns descriptor if already installed', () => {
      const code = unmangle(new Code('mock'))
      class A { }
      const desc = code._install(A)
      expect(code._install(A)).to.equal(desc)
    })

    it('does not duplicate parents', () => {
      // Parent
    })

    // Test dependencies

    it('returns existing descriptor of a preset copy', () => {
      const code = unmangle(new Code('mock'))
      class A { }
      A.presets = {
        mock: {
          location: '..',
          origin: '..',
          owner: '..'
        }
      }
      class B { }
      Object.assign(B, A)
      const desc = code._install(A)
      const desc2 = code._install(B)
      expect(desc).to.equal(desc2)
      expect(desc._T).to.equal(A)
      expect(desc._locals.size).to.equal(2)
      expect(desc._deployed).to.equal(true)
    })

    it('throws if not a valid type', () => {

    })

    it('throws if presets are invalid', () => {

    })

    it('throws if there is prototype inheritance', () => {
      const code = unmangle(new Code('mock'))
      function A () { }
      function B () { }
      B.prototype = Object.create(A.prototype)
      expect(() => code._install(B)).to.throw('Cannot install B')
    })
  })
})

// ------------------------------------------------------------------------------------------------
