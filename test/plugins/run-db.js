/**
 * run-db.js
 *
 * Tests for lib/plugins/run-db.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { RunDB } = Run.plugins

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const HOST = 'http://localhost:8000'

// ------------------------------------------------------------------------------------------------
// RunDB
// ------------------------------------------------------------------------------------------------

describe.skip('RunDB', () => {
  it('load from cache', async () => {
    const rundb = new RunDB(HOST)
    const run = new Run({ cache: rundb, client: true, network: 'main', trust: 'cache' })
    await run.load('c07f9f41fc8a4d78be44a6c3e3d38d2ae58ae62f3ac6f33e567f4f4a653b5f20_o1')
  })

  // --------------------------------------------------------------------------

  it('load missing', async () => {
    const rundb = new RunDB(HOST)
    const run = new Run({ cache: rundb, client: true, network: 'main', trust: 'cache' })
    await expect(run.load('1111111111111111111111111111111111111111111111111111111111111111_o1')).to.be.rejected
  })

  // --------------------------------------------------------------------------

  it('sync and replay', async () => {
    const rundb = new RunDB(HOST)
    const run = new Run({ cache: rundb, client: true, network: 'main', trust: [] })
    const ShuaCoin = await run.load('ce8629aa37a1777d6aa64d0d33cd739fd4e231dc85cfe2f9368473ab09078b78_o1')
    await ShuaCoin.sync()
  })
})

// ------------------------------------------------------------------------------------------------
