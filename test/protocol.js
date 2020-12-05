/**
 * protocol.js
 *
 * Protocol tests against reference transactions
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const Run = require('./env/run')
const { COVER } = require('./env/config')
const { CAPTURE_UNITS } = require('./data/capture')

// ------------------------------------------------------------------------------------------------
// Protocol
// ------------------------------------------------------------------------------------------------

describe('Protocol', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // Coverage does not support all transactions. We'll get cover from our other tests.
  if (COVER) return
  if (CAPTURE_UNITS) return

  // --------------------------------------------------------------------------

  it.skip('Unit', () => runProtocolTest(require('./data/unit.json'))).timeout(1000000)
  it('Relay', () => runProtocolTest(require('./data/relay.json'))).timeout(1000000)
  it.only('Zhell', () => runProtocolTest(require('./data/zhell.json'))).timeout(1000000)
  it.skip('Kronoverse', () => runProtocolTest(require('./data/kronoverse.json'))).timeout(1000000)
})

// ------------------------------------------------------------------------------------------------
// runProtocolTest
// ------------------------------------------------------------------------------------------------

async function runProtocolTest (data) {
  const blockchain = new TestBlockchain(data)
  const run = new Run({ blockchain })

  for (let i = 0; i < data.tests.length; i++) {
    console.log(`${i + 1} of ${data.tests.length}`)
    const txid = data.tests[i]
    const rawtx = data.txns[txid]
    await run.import(rawtx)
  }
}

// ------------------------------------------------------------------------------------------------
// TestBlockchain
// ------------------------------------------------------------------------------------------------

class TestBlockchain {
  constructor (data) { this.data = data }
  get network () { return this.data.network }
  async broadcast (rawtx) { throw new Error('broadcast disabled') }
  async fetch (txid) { return this.data.txns[txid] }
  async utxos (script) { throw new Error('utxos disabled') }
  async spends (txid, vout) { throw new Error('spends disabled') }
  async time (txid) { throw new Error('time disabled') }
}

// ------------------------------------------------------------------------------------------------
