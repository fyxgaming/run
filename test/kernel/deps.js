/**
 * deps.js
 *
 * Tests for changing code deps dynamically
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Deps
// ------------------------------------------------------------------------------------------------

describe('Deps', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // Code
  // --------------------------------------------------------------------------

  describe('Code', () => {
    it('set deps from inside', () => {
      const run = new Run()
      class A extends Jig {
        static f () { return B } // eslint-disable-line
        static g () { B = 2 } // eslint-disable-line
        static h () { A.deps.B = 3 } // eslint-disable-line
      }
      A.deps = { B: 1 }
      const CA = run.deploy(A)
      expect(CA.f()).to.equal(1)
      CA.g()
      expect(CA.f()).to.equal(2)
      expect(CA.deps.B).to.equal(2)
      CA.h()
      expect(CA.f()).to.equal(3)
      expect(CA.deps.B).to.equal(3)
    })

    // ------------------------------------------------------------------------

    it('set deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      A.deps = { B: 1 }
      const CA = run.deploy(A)
      expect(() => { CA.deps.B = 2 }).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it.skip('set inner deps from inside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('set inner deps from outside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('add deps from inside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('add deps from outside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('add inner deps from inside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('add inner deps from outside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('delete deps from inside', () => {
    })

    // ------------------------------------------------------------------------

    it.skip('delete deps from outside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('delete inner deps from inside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('delete inner deps from outside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('define deps from inside', () => {
    })

    // ------------------------------------------------------------------------

    it.skip('define deps from outside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('define inner deps from inside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('define inner deps from outside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('private deps available from inside', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('private deps unavailable from outside', () => {

    })
  })

  // --------------------------------------------------------------------------
  // Static code
  // --------------------------------------------------------------------------

  describe('Static code', () => {
    // Cannot be changed
  })

  // ------
  // TODO after upgrade
  // Syncs
  // Unifies
})

// ------------------------------------------------------------------------------------------------
