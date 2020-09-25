/**
 * protocol.js
 *
 * Protocol tests against reference transactions
 */

/* global VARIANT */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const Run = require('./env/run')
const { COVER } = require('./env/config')
const unmangle = require('./env/unmangle')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const CAPTURE_MOCKCHAIN = false // Where to capture all test transactions in a txns.json file
const CAPTURE_RELAY = false // Where to capture relay transactions ids

if (CAPTURE_MOCKCHAIN) enableCaptureMode()

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
  if (CAPTURE_RELAY) it.only('Capture Relay Txids', () => captureRelayTxids())

  // --------------------------------------------------------------------------

  it('v5 reference transactions', async () => {
    const run = new Run()
    unmangle(run.blockchain)._allowFundingBroadcasts = true

    const txns = require('./data/v5-txns.json')
    const len = txns.length

    for (let i = 0; i < len; i++) {
      console.log(i + ' of ' + txns.length)
      const rawtx = txns[i]
      await run.blockchain.broadcast(rawtx)
    }

    let nrun = 0
    for (let i = 0; i < len; i++) {
      const rawtx = txns[i]

      try {
        run.payload(rawtx)
        nrun++
        console.log(nrun + ' of ' + (i + 1))
        await run.import(rawtx)
      } catch (e) {
        if (e.message.startsWith('Not a run transaction')) {
          continue
        } else {
          throw e
        }
      }
    }
  }).timeout(60000)

  // --------------------------------------------------------------------------

  it('RelayX', async () => {
    const run = new Run({ network: 'main' })

    const txids = require('./data/relay-txids.json')

    for (let i = 0; i < txids.length; i++) {
      console.log(`${i + 1} of ${txids.length}`)
      const txid = txids[i]
      const rawtx = await run.blockchain.fetch(txid)
      // console.log(JSON.stringify(run.payload(rawtx)))
      await run.import(rawtx)
    }
  }).timeout(300000)
})

// ------------------------------------------------------------------------------------------------
// Capture
// ------------------------------------------------------------------------------------------------

function enableCaptureMode () {
  // Browsers cannot save to disk
  if (typeof VARIANT !== 'undefined' && VARIANT === 'browser') throw new Error('Not supported')

  const txns = []

  class CaptureMockchain extends Run.Mockchain {
    async broadcast (rawtx) {
      const txid = await super.broadcast(rawtx)
      txns.push(rawtx)
      return txid
    }
  }

  process.on('exit', () => {
    const txns = Array.from(unmangle(Run.defaults.blockchain)._transactions.values())
    const fs = require('fs-extra')
    fs.writeFileSync('./txns.json', JSON.stringify(txns))
  })

  Run.defaults.blockchain = new CaptureMockchain()
}

// ------------------------------------------------------------------------------------------------

async function captureRelayTxids () {
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

  console.log('Num transactions:', txids.length)

  const fs = require('fs-extra')
  fs.writeFileSync('./test/data/relay-txids.json', JSON.stringify(txids))
}

// ------------------------------------------------------------------------------------------------
