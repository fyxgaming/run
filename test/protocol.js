/**
 * protocol.js
 *
 * Protocol tests against reference transactions
 */

/* global VARIANT */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const fs = require('fs-extra')
const Run = require('./env/run')
const { COVER } = require('./env/config')
const bsv = require('bsv')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const CAPTURE_MOCKCHAIN = false // Whether to capture all test transactions in a txns.json file
const CAPTURE_RELAY = false // Whether to capture relay transactions

if (CAPTURE_MOCKCHAIN) enableCaptureMode()

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
// runProtocolTest
// ------------------------------------------------------------------------------------------------

function runProtocolTest (name, file) {
  it(name, async () => {
    const data = require(file)
    const blockchain = new TestBlockchain(data)
    const run = new Run({ blockchain })

    for (let i = 0; i < data.tests.length; i++) {
      console.log(`${i + 1} of ${data.tests.length}`)
      const txid = data.tests[i]
      const rawtx = data.txns[txid]
      await run.import(rawtx)
    }
  }).timeout(300000)
}

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

  // If capturing relay transactions, just run a single test with that
  if (CAPTURE_RELAY) it.only('Capture Relay transactions', () => captureRelayTxns()).timeout(300000)

  // --------------------------------------------------------------------------

  runProtocolTest('Unit Tests', './data/unit.json')
  runProtocolTest('Relay', './data/relay.json')
})

// ------------------------------------------------------------------------------------------------
// Capture
// ------------------------------------------------------------------------------------------------

function enableCaptureMode () {
  // Browsers cannot save to disk
  if (typeof VARIANT !== 'undefined' && VARIANT === 'browser') throw new Error('Not supported')

  const txns = {}
  const txids = []

  class CaptureMockchain extends Run.Mockchain {
    async broadcast (rawtx) {
      const txid = await super.broadcast(rawtx)
      rawtx = new bsv.Transaction(rawtx).toString('hex')
      txns[txid] = rawtx
      txids.push(txid)
      return txid
    }
  }

  process.on('exit', async () => {
    const tests = []
    const run = new Run({ network: 'mock' })
    for (let i = 0; i < txids.length; i++) {
      const txid = txids[i]
      const rawtx = txns[txid]
      try {
        await run.import(rawtx)
        tests.push(txid)
      } catch (e) { }
    }

    const fs = require('fs-extra')
    const data = { tests, txns, network: 'mock' }
    const path = require.resolve('./data/unit.json')
    fs.writeFileSync(path, JSON.stringify(data, 0, 3))
  })

  Run.defaults.blockchain = new CaptureMockchain()
}

// ------------------------------------------------------------------------------------------------

async function captureRelayTxns () {
  const APP = 'relayx.io'
  const START_HEIGHT = 650000
  const LIMIT = 10000
  const PLANARIA_TOKEN = 'eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiIxSDRzUWtROWg4aGsxTks2S2diZnRKZ1hra3VrRmdwRGdZIiwiaXNzdWVyIjoiZ2VuZXJpYy1iaXRhdXRoIn0.SHo5Ry9kWFFrU0tiYTBjV0F2WmRuNFRYK3NUdXFRVWtXWVNsNkVEYWdZZEJPaTJNQUVrRDI1NThCRzFNdVZzdUc3MUxmYUVQeUdTODFOeVdxb1ZLVXBNPQ'

  const query = {
    q: {
      find: { 'out.s2': 'run', 'out.h3': '05', 'out.s4': APP, 'blk.i': { $gt: START_HEIGHT } },
      sort: { 'blk.i': 1 },
      project: { },
      limit: LIMIT
    }
  }

  const options = {
    method: 'post',
    headers: {
      'Content-type': 'application/json; charset=utf-8',
      token: PLANARIA_TOKEN
    },
    body: JSON.stringify(query)
  }

  const fetch = require('node-fetch')

  const txids = await new Promise((resolve, reject) => {
    let text = ''
    fetch('https://txo.bitbus.network/block', options)
      .then(res => {
        res.body.on('data', data => { text += data.toString('utf8') })

        res.body.on('end', () => {
          const lines = text.split('\n')
          const nonempty = lines.filter(x => x.length)
          const parsed = nonempty.map(x => JSON.parse(x).tx.h)
          resolve(parsed)
        })
      })
  })

  const run = new Run({ network: 'main' })
  const data = require('./data/relay.json')

  const oldFetch = run.blockchain.fetch
  run.blockchain.fetch = async (txid) => {
    const rawtx = await oldFetch.call(run.blockchain, txid)
    data.txns[txid] = rawtx
    return rawtx
  }

  for (let i = 0; i < txids.length; i++) {
    console.log(`${i + 1} of ${txids.length}`)
    const txid = txids[i]
    if (data.tests.includes(txid)) continue
    const rawtx = await run.blockchain.fetch(txid)
    await run.import(rawtx)
  }

  const path = require.resolve('./data/relay.json')
  fs.writeFileSync(path, JSON.stringify(data, 0, 3))
}

// ------------------------------------------------------------------------------------------------
