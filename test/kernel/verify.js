/**
 * verify.js
 *
 * Tests for the verification aspect of transaction importing
 */

const { describe, it, afterEach } = require('mocha')
const { stub } = require('sinon')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const bsv = require('bsv')
const Run = require('../env/run')
const { payFor } = require('../env/misc')
const { Jig, Mockchain, LocalCache } = Run

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

    class MalleatingMockchain extends Mockchain {
      async broadcast (rawtx) {
        // Extract and modify the hash of one of the states
        const tx = new bsv.Transaction(rawtx)
        const payload = tx.outputs[0].script.chunks[5]
        const payloadJson = JSON.parse(payload.buf.toString('utf8'))
        payloadJson.out[0] = '0000000000000000000000000000000000000000000000000000000000000000'

        // Recreate a new payload
        const Buffer = bsv.deps.Buffer
        const prefix = Buffer.from('run', 'utf8')
        const protocol = Buffer.from([Run.protocol], 'hex')
        const app = Buffer.from('', 'utf8')
        const payload2 = Buffer.from(JSON.stringify(payloadJson), 'utf8')
        const script = bsv.Script.buildSafeDataOut([prefix, protocol, app, payload2])
        const payloadOutput = new bsv.Transaction.Output({ script, satoshis: 0 })

        const malleated = new bsv.Transaction()
        malleated.addOutput(payloadOutput)
        const paid = await payFor(malleated, run)

        const rawpaid = paid.toString('hex')
        const txid2 = await super.broadcast(rawpaid)
        return txid2
      }
    }

    run.blockchain = new MalleatingMockchain()
    const logger = { error: () => { } }
    stub(logger, 'error')
    run.logger = logger

    class A extends Jig { }
    const a = new A()
    await run.sync()

    run.cache = new LocalCache()
    await expect(run.load(a.location)).to.be.rejectedWith('Payload mismatch')

    const hasErrorMessage = x => logger.error.args.some(args => args.join().indexOf('State mismatch') !== -1)
    expect(hasErrorMessage('Expected payload')).to.equal(true)
    expect(hasErrorMessage('Actual payload')).to.equal(true)
    expect(hasErrorMessage('State mismatch')).to.equal(true)
  })

  // TODO: Pre-verify using import
  // TODO: Even better payload mismatch errors in pre-verify
  // TODO: New test for pre-verify
  // TODO: Document pre-verify is meant to catch run bugs, not consensus issues
  // TODO: Make pre-verify optional

  // ------------------------------------------------------------------------

  it.skip('payload key order does not matter', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
