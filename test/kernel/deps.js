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
        static h () { A.deps.B = 3 }
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

    it('throws if set deps from outside', () => {
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
        static h () { A.deps.B.n = 3 }
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

    it('set inner intrinsic deps from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { return B.get(1) } // eslint-disable-line
        static g () { A.deps.B.set(1, 2) }
      }
      A.deps = { B: new Map() }

      const CA = run.deploy(A)
      await CA.sync()
      expect(CA.nonce).to.equal(1)

      CA.g()
      await CA.sync()
      expect(CA.f()).to.equal(2)
      expect(CA.deps.B.get(1)).to.equal(2)
      expect(CA.nonce).to.equal(2)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(2)
      expect(CA2.deps.B.get(1)).to.equal(2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(2)
      expect(CA3.deps.B.get(1)).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('throws if set inner deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      A.deps = { B: [0] }
      const CA = run.deploy(A)
      expect(() => { CA.deps.B[0] = 1 }).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('add deps from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { return B } // eslint-disable-line
        static g () { A.deps.B = 1 }
      }

      const CA = run.deploy(A)
      await CA.sync()
      expect(CA.nonce).to.equal(1)

      CA.g()
      await CA.sync()
      expect(CA.f()).to.equal(1)
      expect(CA.deps.B).to.equal(1)
      expect(CA.nonce).to.equal(2)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(1)
      expect(CA2.deps.B).to.equal(1)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(1)
      expect(CA3.deps.B).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('throws if add deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      expect(() => { CA.deps.B = 1 }).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('throws if add inner deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      A.deps = { B: { } }
      const CA = run.deploy(A)
      expect(() => { CA.deps.B.n = 1 }).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('delete deps from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static getB () { return typeof B !== 'undefined' ? B : undefined } // eslint-disable-line
        static getC () { return typeof C !== 'undefined' ? C : undefined } // eslint-disable-line
        static g () { delete A.deps.B } // eslint-disable-line
        static h () { delete A.deps.C } // eslint-disable-line
      }
      A.deps = { B: 1, C: 2 }

      const CA = run.deploy(A)
      expect(CA.getB()).to.equal(1)
      expect(CA.getC()).to.equal(2)
      await CA.sync()
      expect(CA.nonce).to.equal(1)

      CA.g()
      await CA.sync()
      expect(CA.getB()).to.equal(undefined)
      expect(CA.getC()).to.equal(2)
      expect(typeof CA.deps.B).to.equal('undefined')
      expect(CA.deps.C).to.equal(2)
      expect(CA.nonce).to.equal(2)

      CA.h()
      expect(CA.getB()).to.equal(undefined)
      expect(CA.getC()).to.equal(undefined)
      expect(typeof CA.deps.B).to.equal('undefined')
      expect(typeof CA.deps.C).to.equal('undefined')
      await CA.sync()
      expect(CA.nonce).to.equal(3)

      const CA2 = await run.load(CA.location)
      expect(CA2.getB()).to.equal(undefined)
      expect(CA2.getC()).to.equal(undefined)
      expect(typeof CA2.deps.B).to.equal('undefined')
      expect(typeof CA2.deps.C).to.equal('undefined')

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.getB()).to.equal(undefined)
      expect(CA3.getC()).to.equal(undefined)
      expect(typeof CA3.deps.B).to.equal('undefined')
      expect(typeof CA3.deps.C).to.equal('undefined')
    })

    // ------------------------------------------------------------------------

    it.skip('throws if delete deps from outside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('delete inner deps from inside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if delete inner deps from outside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('define deps from inside', () => {
    })

    // ------------------------------------------------------------------------

    it.skip('throws if define deps from outside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('define inner deps from inside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if define inner deps from outside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('set and delete caller dep', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('private deps available from inside', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('private deps unavailable from outside', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('throws if delete deps object', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('throws if set deps object', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('throws if define deps object', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('throws if set prototype of deps object', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('throws if define getter deps', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('throws if define non-configurable deps', () => {

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
