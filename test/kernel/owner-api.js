/**
 * owner-api.js
 *
 * Tests for the Owner plugin
 */

const { describe, it, afterEach } = require('mocha')
const Run = require('../env/run')

// ------------------------------------------------------------------------------------------------
// Owner API
// ------------------------------------------------------------------------------------------------

describe('Owner API', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // sign
  // --------------------------------------------------------------------------

  describe('sign', () => {
    it.skip('throws if sign returns invalid tx', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if sign returns different tx', () => {
      // TODO
    })

    // TODO - Add tests
  })

  // --------------------------------------------------------------------------
  // nextOwner
  // --------------------------------------------------------------------------

  describe('nextOwner', () => {
    // TODO - Add tests
  })
})

// ------------------------------------------------------------------------------------------------
