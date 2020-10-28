/**
 * creation.js
 *
 * Tests for lib/kernel/creation.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { expect } = require('chai')
const { Jig, Berry } = Run
const Creation = unmangle(Run)._Creation

// ------------------------------------------------------------------------------------------------
// Creation
// ------------------------------------------------------------------------------------------------

describe('Creation', () => {
  describe('hasInstance', () => {
    it('jig', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      expect(a instanceof Creation).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('code', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      expect(CA instanceof Creation).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('static class', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(CA instanceof Creation).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('static function', () => {
      const run = new Run()
      function f () { }
      const cf = run.deploy(f)
      expect(cf instanceof Creation).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('berry', async () => {
      new Run() // eslint-disable-line
      class B extends Berry { }
      const b = await B.load('abc')
      expect(b instanceof Creation).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('undeployed code', () => {
      class A { }
      class B extends Jig { }
      expect(A instanceof Creation).to.equal(false)
      expect(B instanceof Creation).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('non-jigs', () => {
      expect(1 instanceof Creation).to.equal(false)
      expect(undefined instanceof Creation).to.equal(false)
      expect(null instanceof Creation).to.equal(false)
      expect({} instanceof Creation).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
