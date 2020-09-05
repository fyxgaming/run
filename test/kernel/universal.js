/**
 * universal.js
 *
 * Tests for lib/kernel/universal.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { expect } = require('chai')
const { Jig } = Run
const Universal = unmangle(Run)._Universal

// ------------------------------------------------------------------------------------------------
// Universal
// ------------------------------------------------------------------------------------------------

describe('Universal', () => {
  describe('hasInstance', () => {
    it('jig', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      expect(a instanceof Universal).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('code', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      expect(CA instanceof Universal).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('static class', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(CA instanceof Universal).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('static function', () => {
      const run = new Run()
      function f () { }
      const cf = run.deploy(f)
      expect(cf instanceof Universal).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it.skip('berry', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('undeployed code', () => {
      class A { }
      class B extends Jig { }
      expect(A instanceof Universal).to.equal(false)
      expect(B instanceof Universal).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('non-jigs', () => {
      expect(1 instanceof Universal).to.equal(false)
      expect(undefined instanceof Universal).to.equal(false)
      expect(null instanceof Universal).to.equal(false)
      expect({} instanceof Universal).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
