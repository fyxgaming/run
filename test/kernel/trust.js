/**
 * trust.js
 *
 * Tests for loading trusted and untrusted code
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Trust
// ------------------------------------------------------------------------------------------------

describe('Trust', () => {
  it('code whitelist', async () => {
    const run = new Run()
    class A extends Jig { }
    run.deploy(A)
    await run.sync()

    const run2 = new Run({ codeWhitelist: [] })
    run2.cache = new LocalCache()
    await expect(run2.load(A.location)).to.be.rejectedWith('Transaction not whitelisted for code')
    run2.codeWhitelist = [A.location.slice(0, 64)]
    await run2.load(A.location)
  })

  // --------------------------------------------------------------------------
  // trustlist
  // --------------------------------------------------------------------------

  describe('trustlist', () => {
    it('should match *', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('should match location', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('should match txid', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('should warn if unknown', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Trusted Code
  // --------------------------------------------------------------------------

  describe('Trusted Code', () => {
    it('imports trusted', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('loads via import trusted', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('loads via cache trusted', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Trust all
  // --------------------------------------------------------------------------

  describe('Trust All Code', () => {
    it('imports when trust all', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('loads via import when trust all', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('loads via cache when trust all', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Untrusted
  // --------------------------------------------------------------------------

  describe('Untrusted Code', () => {
    it('throws if untrusted import', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if untrusted load via import', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if untrusted load via cache', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Misc
  // --------------------------------------------------------------------------

  describe('Misc', () => {
    it('load untrusted with trust option', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('import untrusted with trust option', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('deploy adds to trustlist', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('trustlist copies to new run instances', () => {
    // Exact object
    })
  })
})

// ------------------------------------------------------------------------------------------------
