/**
 * config.js
 *
 * Provides the build of Run for testing and other settings.
 */

/*
require('dotenv').config()
const path = require('path')
const { Transaction } = require('bsv')
const { setMangled } = require('./unmangle')

// ------------------------------------------------------------------------------------------------
// Configure the test environment
// ------------------------------------------------------------------------------------------------

const COVER = process.env.COVER ? JSON.parse(process.env.COVER) : false
const PERF = process.env.PERF ? JSON.parse(process.env.PERF) : false
const MANGLED = process.env.MANGLED ? process.env.MANGLED : false

setMangled(MANGLED)

// ------------------------------------------------------------------------------------------------
// payFor
// ------------------------------------------------------------------------------------------------

async function payFor (tx, run) {
  const rawtx = tx.toString('hex')
  const prevtxids = tx.inputs.map(input => input.prevTxId.toString('hex'))
  const prevtxs = await Promise.all(prevtxids.map(txid => run.blockchain.fetch(txid)))
  const parents = tx.inputs.map((input, n) => prevtxs[n].outputs[input.outputIndex])
  const paidhex = await run.purse.pay(rawtx, parents)
  const paidtx = new Transaction(paidhex)
  return paidtx
}

// ------------------------------------------------------------------------------------------------

module.exports = { COVER, PERF, payFor }

*/
