/**
 * static.js
 *
 * Tests for static code
 */

const { describe, afterEach } = require('mocha')
const Run = require('../env/run')

// ------------------------------------------------------------------------------------------------
// Static
// ------------------------------------------------------------------------------------------------

describe('Static', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // TODO
})

// ------------------------------------------------------------------------------------------------
