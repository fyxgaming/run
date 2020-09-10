/**
 * inventory.js
 *
 * Tests for lib/module/inventory.js
 */

const { describe, it, afterEach } = require('mocha')
const Run = require('../env/run')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Inventory
// ------------------------------------------------------------------------------------------------

describe('Inventory', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  it('test', async () => {
    const run = new Run()
    class A extends Jig { send (to) { this.owner = to } }
    const a = new A()
    a.send('mymNoVDJNnh1SRQrMBPkwK1FmKX6HXZbfF')
    await a.sync()
    await run.inventory.sync()
    console.log(run.inventory.jigs)
    console.log(run.inventory.code)
  })
})

// ------------------------------------------------------------------------------------------------
