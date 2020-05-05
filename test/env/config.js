/**
 * config.js
 *
 * Provides the build of Run for testing and other settings.
 */

require('dotenv').config()
const path = require('path')
const { Transaction } = require('bsv')
const { setMangled, unmangle } = require('./unmangle')

// ------------------------------------------------------------------------------------------------
// Load test-specific environment variables
// ------------------------------------------------------------------------------------------------

const PERF = process.env.PERF ? JSON.parse(process.env.PERF) : false
const COVER = process.env.COVER ? process.env.COVER : false
const MANGLED = process.env.MANGLED ? process.env.MANGLED : false

// ------------------------------------------------------------------------------------------------
// Load Run
// ------------------------------------------------------------------------------------------------

const Run = process.env.LIB ? require(path.join(process.cwd(), process.env.LIB)) : require('target')

// ------------------------------------------------------------------------------------------------
// Configure Run
// ------------------------------------------------------------------------------------------------

// Prefer mocknet and no logs for testing
Run.defaults.network = 'mock'
Run.defaults.logger = null

// Read the local environment vars to configure Run for the tests

// We have to extract all values manually from process.env because of how the
// webpack.EnvironmentPlugin works. See: https://github.com/webpack/webpack/issues/5392

Run.configure({
  NETWORK: process.env.NETWORK,
  PURSE: process.env.PURSE,
  PURSE_MAIN: process.env.PURSE_MAIN,
  PURSE_TEST: process.env.PURSE_TEST,
  PURSE_STN: process.env.PURSE_STN,
  PURSE_MOCK: process.env.PURSE_MOCK,
  OWNER: process.env.OWNER,
  OWNER_MAIN: process.env.OWNER_MAIN,
  OWNER_TEST: process.env.OWNER_TEST,
  OWNER_STN: process.env.OWNER_STN,
  OWNER_MOCK: process.env.OWNER_MOCK,
  APP: process.env.APP,
  LOGGER: process.env.LOGGER,
  API: process.env.API,
  APIKEY: process.env.APIKEY,
  APIKEY_RUN: process.env.APIKEY_RUN,
  APIKEY_MATTERCLOUD: process.env.APIKEY_MATTERCLOUD,
  APIKEY_BITINDEX: process.env.APIKEY_BITINDEX,
  APIKEY_WHATSONCHAIN: process.env.APIKEY_WHATSONCHAIN
})

setMangled(MANGLED)

const util = unmangle(unmangle(Run)._util)

if (COVER) {
  Run.sandbox.excludes = [Run.Jig, Run.Berry, Run.Token, Run.expect, util._ResourceSet, util._ResourceMap,
    Run.StandardLock, Run.GroupLock]
}

// ------------------------------------------------------------------------------------------------
// payFor
// ------------------------------------------------------------------------------------------------

const { _populatePreviousOutputs } = util

async function payFor (tx, run) {
  const txhex = tx.toString('hex')
  const paidhex = await run.purse.pay(txhex)
  const paidtx = new Transaction(paidhex)
  await _populatePreviousOutputs(paidtx, run.blockchain)
  return paidtx
}

// ------------------------------------------------------------------------------------------------

module.exports = { Run, PERF, COVER, payFor }
