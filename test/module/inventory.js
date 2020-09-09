/**
 * inventory.js
 *
 * Tests for lib/module/inventory.js
 */

const { describe, it, afterEach } = require('mocha')
const Run = require('../env/run')

// ------------------------------------------------------------------------------------------------
// Inventory
// ------------------------------------------------------------------------------------------------

describe('Inventory', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  it('test', () => {
    console.log('hello')
  })
})

// ------------------------------------------------------------------------------------------------
