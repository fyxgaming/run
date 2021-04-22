/**
 * build.js
 *
 * Tests that check properties of the transactions RUN builds
 */

const { describe, it } = require('mocha')

// ------------------------------------------------------------------------------------------------
// Build
// ------------------------------------------------------------------------------------------------

describe('Build', () => {
  // --------------------------------------------------------------------------
  // scripts
  // --------------------------------------------------------------------------

  describe('output scripts', () => {
    it.skip('output scripts are correct for address owners', () => {
    // TODO - jig and code
    })

    // ------------------------------------------------------------------------

    it.skip('output scripts are correct for pubkey owners', () => {
    // TODO - jig
    })

    // ------------------------------------------------------------------------

    it.skip('output scripts are correct for custom locks', () => {
    // TODO - jig
    })
  })

  // --------------------------------------------------------------------------
  // satoshis
  // --------------------------------------------------------------------------

  describe('satoshis', () => {
    it.skip('output satoshis are correct for 0', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('output satoshis are correct for below dust', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('output satoshis are correct for above dust', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // custom base
  // --------------------------------------------------------------------------

  describe('custom base', () => {
    it.skip('output scripts are correct for custom base', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('output satoshis are correct for custom base', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // app name
  // --------------------------------------------------------------------------

  describe('app name', () => {
    it.skip('utf8 app name is correctly set', () => {
      // TODO
      /*
      const run = hookRun(new Run({ app: 'biz' }))
      class A extends Jig { }
      await run.deploy(A)
      expect(tx.outputs[0].script.chunks[4].buf.toString('utf8')).to.equal('biz')
      */
    })

    // ------------------------------------------------------------------------

    it.skip('empty app name is correctly set', () => {
      // TODO
      /*
      const run = hookRun(new Run({ app: 'biz' }))
      class A extends Jig { }
      await run.deploy(A)
      expect(tx.outputs[0].script.chunks[4].buf.toString('utf8')).to.equal('biz')
      */
    })
  })

  // --------------------------------------------------------------------------
  // prefix
  // --------------------------------------------------------------------------

  describe('prefix', () => {
    it.skip('has run tag', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('has version', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // metadata
  // --------------------------------------------------------------------------

  describe('metadata', () => {
    it.skip('deploy', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('instantiate from ref', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('call method with berry ref', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('destroy code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('auth jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('multiple actions', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
