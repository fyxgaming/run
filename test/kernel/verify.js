/**
 * verify.js
 *
 * Tests for the verification aspect of transaction importing
 */

const { describe, it, afterEach } = require('mocha')
const Run = require('../env/run')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Verify
// ------------------------------------------------------------------------------------------------

describe('Verify', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // ------------------------------------------------------------------------

  it.only('prints debugging information for payload mismatch', async () => {
    const run = new Run()
    class A extends Jig { }
    new A() // eslint-disable-line
    await run.sync()
  })

  // ------------------------------------------------------------------------

  it.skip('payload key order does not matter', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
