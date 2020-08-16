/**
 * sync.js
 *
 * Tests for sync functionality
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { Transaction } = require('bsv')
const Run = require('../env/run')
const { payFor } = require('../env/misc')

// ------------------------------------------------------------------------------------------------
// Sync
// ------------------------------------------------------------------------------------------------

describe.skip('Sync', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // Only waits for current record
  // TODO: Check records
  // TODO: Sync a destroyed jig
  // TODO: Sync a jig that failed to deploy to deploy it again

  it('deploys a class and syncs it', async () => {
    const run = new Run()
    class A {}
    run.deploy(A)
    await run.sync()
    const A2 = await run.load(A.location)
    expect(A2.toString()).to.equal(A.toString())
    expect(A2.origin).to.equal(A.origin)
    expect(A2.location).to.equal(A.location)
  })

  // --------------------------------------------------------------------------

  it('publishes after dependent transaction', async () => {
    const run = new Run()

    class A { }
    class B extends A { }
    A.B = B

    run.deploy(A)
    await run.sync()

    await run.load(A.location)

    const B2 = await run.load(B.location)

    class C extends B2 { }
    run.deploy(C)
    await run.sync()
  })

  // --------------------------------------------------------------------------

  it('should sync with warning when UTXO is incorrectly spent', async () => {
    const run = new Run()

    class A { }
    const C = run.deploy(A)

    await C.sync()
    const location = C.location

    const utxos = await run.blockchain.utxos(run.owner.address)
    const tx = new Transaction().from(utxos)
    const paid = await payFor(tx, run)
    const signed = paid.sign(run.owner.privkey)
    await run.blockchain.broadcast(signed.toString('hex'))

    await C.sync()
    expect(C.location).to.equal(location)
  })
})

// ------------------------------------------------------------------------------------------------
