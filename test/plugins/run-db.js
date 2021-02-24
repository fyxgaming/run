/**
 * run-db.js
 *
 * Tests for lib/plugins/run-db.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')
const { RunDB } = Run.plugins

// ------------------------------------------------------------------------------------------------
// RunDB
// ------------------------------------------------------------------------------------------------

describe('RunDB', () => {
  it.skip('tests get', async () => {
    const rundb = new RunDB('http://localhost:8000')
    const run = new Run({ cache: rundb, client: true, network: 'main' })
    const jig = await run.load('c07f9f41fc8a4d78be44a6c3e3d38d2ae58ae62f3ac6f33e567f4f4a653b5f20_o1')
    console.log(jig)
    // Not found
    await run.load('c07f9f41fc8a4d78be44a6c3e3d38d2ae58ae62f3ac6f33e567f4f4a653b5f21_o1')
  })
})

// ------------------------------------------------------------------------------------------------
