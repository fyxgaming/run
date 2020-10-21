/**
 * capture.js
 *
 * Captures reference transactions
 */

/* global VARIANT */

const { describe, it, beforeEach, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const fs = (typeof VARIANT === 'undefined' || VARIANT === 'node') && require('fs-extra')
const bsv = require('bsv')
const Run = require('../env/run')
const { COVER } = require('../env/config')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// Whether to capture all test transactions in a unit.json file
const CAPTURE_UNITS = false

// Enable/disable capture mode based on the above global var
if (CAPTURE_UNITS) enableUnitCaptureMode()

// Unit transactions that are captured and will be exported
const CAPTURE_TXNS = { }
const CAPTURE_TXIDS = []

// ------------------------------------------------------------------------------------------------
// Capture
// ------------------------------------------------------------------------------------------------

describe('Capture', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // Coverage does not support all transactions. We'll get cover from our other tests.
  if (COVER) return

  // --------------------------------------------------------------------------

  it.skip('Capture Relay', () => captureAppTxns('relayx.io', './relay.json')).timeout(1000000)
  it.skip('Capture Zhell', () => captureAppTxns('b1b605103e', './zhell.json')).timeout(1000000)
})

// ------------------------------------------------------------------------------------------------
// Capture Units
// ------------------------------------------------------------------------------------------------

function enableUnitCaptureMode () {
  // Browsers cannot save to disk
  if (typeof VARIANT !== 'undefined' && VARIANT === 'browser') throw new Error('Not supported')

  process.on('exit', async () => {
    const tests = []
    const run = new Run({ blockchain: new CaptureMockchain() })
    for (let i = 0; i < CAPTURE_TXIDS.length; i++) {
      const txid = CAPTURE_TXIDS[i]
      const rawtx = CAPTURE_TXNS[txid]
      try {
        await run.import(rawtx)
        tests.push(txid)
      } catch (e) { }
    }

    const fs = require('fs-extra')
    const data = { tests, txns: CAPTURE_TXNS, network: 'mock' }
    const path = require.resolve('./unit.json')
    fs.writeFileSync(path, JSON.stringify(data, 0, 3))
  })

  beforeEach(() => { Run.defaults.blockchain = new CaptureMockchain() })
}

// ------------------------------------------------------------------------------------------------
// CaptureMockchain
// ------------------------------------------------------------------------------------------------

class CaptureMockchain extends Run.Mockchain {
  async broadcast (rawtx) {
    const txid = await super.broadcast(rawtx)
    rawtx = new bsv.Transaction(rawtx).toString('hex')
    CAPTURE_TXNS[txid] = rawtx
    CAPTURE_TXIDS.push(txid)
    return txid
  }

  async fetch (txid) {
    if (CAPTURE_TXNS[txid]) return CAPTURE_TXNS[txid]
    return await super.fetch(txid)
  }
}

// ------------------------------------------------------------------------------------------------
// Capture App Txns
// ------------------------------------------------------------------------------------------------

async function captureAppTxns (app, path) {
  const START_HEIGHT = 650000
  const LIMIT = 10000
  const PLANARIA_TOKEN = 'eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiIxSDRzUWtROWg4aGsxTks2S2diZnRKZ1hra3VrRmdwRGdZIiwiaXNzdWVyIjoiZ2VuZXJpYy1iaXRhdXRoIn0.SHo5Ry9kWFFrU0tiYTBjV0F2WmRuNFRYK3NUdXFRVWtXWVNsNkVEYWdZZEJPaTJNQUVrRDI1NThCRzFNdVZzdUc3MUxmYUVQeUdTODFOeVdxb1ZLVXBNPQ'

  const query = {
    q: {
      find: { 'out.s2': 'run', 'out.h3': '05', 'out.s4': app, 'blk.i': { $gt: START_HEIGHT } },
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

  const run = new Run({ network: 'main', networkTimeout: 30000 })
  const data = require(path)
  const fullPath = require.resolve(path)

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
    data.tests.push(txid)
    fs.writeFileSync(fullPath, JSON.stringify(data, 0, 3))
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { CAPTURE_UNITS, CaptureMockchain }
