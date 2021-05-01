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

  it('sync from origin', async () => {
    const rundb = new RunDB(HOST)
    const run = new Run({ cache: rundb, client: true, network: 'main', trust: [] })
    const ShuaCoin = await run.load('ce8629aa37a1777d6aa64d0d33cd739fd4e231dc85cfe2f9368473ab09078b78_o1')
    await ShuaCoin.sync()
  })

  // --------------------------------------------------------------------------

  it('gets unspent from inventory', async () => {
    const rundb = new RunDB(HOST)
    const run = new Run({ cache: rundb, client: true, network: 'main', trust: [] })
    run.owner = '1NERTLQqq1MwJSq31DW2MQXEtJsb6TyX3y'
    await run.inventory.sync()
    expect(run.inventory.jigs.length > 0).to.equal(true)
    expect(run.inventory.code.length > 0).to.equal(true)
  })

  // --------------------------------------------------------------------------

  it.skip('handles duplicate requests cached', async () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it.skip('handles duplicate requests uncached', async () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
