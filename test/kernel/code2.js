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
    it('installs and sandboxes new type', () => {
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

    it('returns descriptor if already installed', () => {
      const code = unmangle(new Code('mock'))
      class A { }
      const desc = code._install(A)
      expect(code._install(A)).to.equal(desc)
    })

    it('returns existing descriptor of a preset copy', () => {

    })

    it('throws if not a valid type', () => {

    })
  })
})

// ------------------------------------------------------------------------------------------------
