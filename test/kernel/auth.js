/**
 * auth.js
 *
 * Tests for auth functionality
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { expectTx } = require('../env/misc')
const unmangle = require('../env/unmangle')
const { stub } = require('sinon')
const { Code, LocalCache } = unmangle(Run)

// ------------------------------------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------------------------------------

describe('Auth', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // Code
  // --------------------------------------------------------------------------

  describe('Code', () => {
    it('spends code', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      function test (CA) {
        expect(CA.origin).not.to.equal(CA.location)
      }

      expectTx({
        nin: 1,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'AUTH',
            data: { $jig: 0 }
          }
        ]
      })

      expect(CA.auth()).to.equal(CA)
      await CA.sync()
      test(CA)

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // --------------------------------------------------------------------------

    it('cannot auth non-code children', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      class B extends CA { }
      expect(() => Code.prototype.auth.apply(B)).to.throw('auth unavailable')
    })

    // --------------------------------------------------------------------------

    it('throws if auth jig destroyed in another transaction', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      CA.destroy()
      await CA.sync()

      expect(() => CA.auth()).to.throw('Cannot auth destroyed jig')
    })

    // --------------------------------------------------------------------------

    it('auth jig not synced', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CA.auth()
      await CA.sync()
    })

    // ------------------------------------------------------------------------

    it.skip('auth in a static method', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('auth code in a jig method', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('auth multiple in a batch', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('create and auth in same transaction', () => {

    })
  })

  // --------------------------------------------------------------------------
  // Jig
  // --------------------------------------------------------------------------

  describe('Jig', () => {
    it.skip('auths jig', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Errors
  // --------------------------------------------------------------------------

  describe('errors', () => {
    it('cannot auth non-code', () => {
      const error = 'auth unavailable'
      expect(() => Code.prototype.auth.call({})).to.throw(error)
      expect(() => Code.prototype.auth.call(class A { })).to.throw(error)
      expect(() => Code.prototype.auth.call(null)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('rollback if error', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      await CA.sync()
      stub(run.blockchain, 'broadcast').throwsException()
      CA.auth()
      await expect(CA.sync()).to.be.rejected
      expect(CA.location).to.equal(CA.origin)
      expect(CA.nonce).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it.skip('throws if auth jig destroyed in same transaction', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('throws if auth new jig', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('throws if auth transferred jig', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('cannot auth undeployed berry class', () => {
    // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
