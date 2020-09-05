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
    it.only('jigs are universals', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      expect(a instanceof Universal).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('code are universals', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('static code are universals', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('code are universals', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('berries are universals', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('non-jig objects are not universals', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('non-jig functions are not universals', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('primitives are not universals', () => {
      // TODO
    })

    // TODO: Check Jig, Berry, and Code itself are not universals
  })
})

// ------------------------------------------------------------------------------------------------
