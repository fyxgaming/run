/**
 * deps.js
 *
 * Tests for changing code deps dynamically
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, LocalCache } = Run

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
    it('set deps from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { return B } // eslint-disable-line
        static g () { B = 2 } // eslint-disable-line
        static h () { A.deps.B = 3 } // eslint-disable-line
      }
      A.deps = { B: 1 }

      const CA = run.deploy(A)
      expect(CA.f()).to.equal(1)
      await CA.sync()
      expect(CA.nonce).to.equal(1)

      CA.g()
      await CA.sync()
      expect(CA.f()).to.equal(2)
      expect(CA.deps.B).to.equal(2)
      expect(CA.nonce).to.equal(2)

      CA.h()
      expect(CA.f()).to.equal(3)
      expect(CA.deps.B).to.equal(3)
      await CA.sync()
      expect(CA.nonce).to.equal(3)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(3)
      expect(CA2.deps.B).to.equal(3)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(3)
      expect(CA3.deps.B).to.equal(3)
    })

    // ------------------------------------------------------------------------

    it('set deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      A.deps = { B: 1 }
      const CA = run.deploy(A)
      expect(() => { CA.deps.B = 1 }).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('set inner deps from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { return B.n } // eslint-disable-line
        static g () { B.n = 2 } // eslint-disable-line
        static h () { A.deps.B.n = 3 } // eslint-disable-line
      }
      A.deps = { B: { n: 1 } }

      const CA = run.deploy(A)
      expect(CA.f()).to.equal(1)
      await CA.sync()
      expect(CA.nonce).to.equal(1)

      CA.g()
      await CA.sync()
      expect(CA.f()).to.equal(2)
      expect(CA.deps.B.n).to.equal(2)
      expect(CA.nonce).to.equal(2)

      CA.h()
      expect(CA.f()).to.equal(3)
      expect(CA.deps.B.n).to.equal(3)
      await CA.sync()
      expect(CA.nonce).to.equal(3)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(3)
      expect(CA2.deps.B.n).to.equal(3)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(3)
      expect(CA3.deps.B.n).to.equal(3)
    })

    // ------------------------------------------------------------------------

    it('set inner deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      A.deps = { B: [0] }
      const CA = run.deploy(A)
      expect(() => { CA.deps.B[0] = 1 }).to.throw('Updates must be performed in the jig\'s methods')
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
