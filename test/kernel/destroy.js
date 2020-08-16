/**
 * destroy.js
 *
 * Tests for destroy functionality
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
// Destroy
// ------------------------------------------------------------------------------------------------

describe('Destroy', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // Code
  // --------------------------------------------------------------------------

  describe('Code', () => {
    it('destroys code', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      function test (CA) {
        expect(CA.location.endsWith('_d0')).to.equal(true)
        expect(CA.owner).to.equal(null)
        expect(CA.satoshis).to.equal(0)
      }

      expectTx({
        nin: 1,
        nref: 0,
        nout: 0,
        ndel: 1,
        ncre: 0,
        exec: [
          {
            op: 'DESTROY',
            data: { $jig: 0 }
          }
        ]
      })

      expect(CA.destroy()).to.equal(CA)
      expect(CA.owner).to.equal(null)
      expect(CA.satoshis).to.equal(0)

      await CA.sync()
      test(CA)

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('destroy twice', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      CA.destroy()
      await CA.sync()
      const lastLocation = CA.location

      expect(CA.destroy()).to.equal(CA)
      await CA.sync()
      expect(CA.location).to.equal(lastLocation)
    })

    // ------------------------------------------------------------------------

    it.skip('destroy in a static method', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('destroy code in a jig method', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('destroy multiple in a batch', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('create and destroy in same transaction', () => {

    })
  })

  // --------------------------------------------------------------------------
  // Jig
  // --------------------------------------------------------------------------

  describe('Jig', () => {
    it.skip('destroys jig', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Errors
  // --------------------------------------------------------------------------

  describe('errors', () => {
    it('cannot destroy non-code', () => {
      const error = 'Destroy unavailable'
      expect(() => Code.prototype.destroy.call({})).to.throw(error)
      expect(() => Code.prototype.destroy.call(class A { })).to.throw(error)
      expect(() => Code.prototype.destroy.call(null)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('cannot destroy non-code children', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      class B extends CA { }
      expect(() => B.destroy()).to.throw('Destroy unavailable')
    })

    // ------------------------------------------------------------------------

    it('rollback if error', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      await CA.sync()
      stub(run.blockchain, 'broadcast').throwsException()
      CA.destroy()
      await expect(CA.sync()).to.be.rejected
      expect(CA.location.endsWith('_d0')).to.equal(false)
      expect(CA.nonce).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it.skip('cannot auth undeployed berry class', () => {
    // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
