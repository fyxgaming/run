/**
 * config.js
 *
 * Provides the build of Run for testing and other settings.
 */

const path = require('path')
const addUserKeystoEnvironment = require('./keys')
const { setMangled, unmangle } = require('./unmangle')

// ------------------------------------------------------------------------------------------------
// Load environment variables
// ------------------------------------------------------------------------------------------------

addUserKeystoEnvironment()

const PERF = process.env.PERF ? JSON.parse(process.env.PERF) : false
const LOGGER = process.env.LOGGER ? process.env.LOGGER : false
const NETWORK = process.env.NETWORK ? process.env.NETWORK : 'mock'
const API = process.env.API ? process.env.API : 'run'
const APIKEY = process.env.APIKEY ? process.env.APIKEY : undefined
const PURSE = process.env.PURSE ? process.env.PURSE : undefined
const COVER = process.env.COVER ? process.env.COVER : false
const MANGLED = process.env.MANGLED ? process.env.MANGLED : false

// ------------------------------------------------------------------------------------------------
// Load Run
// ------------------------------------------------------------------------------------------------

const Run = process.env.LIB ? require(path.join(process.cwd(), process.env.LIB)) : require('target')

// ------------------------------------------------------------------------------------------------
// Configure Run
// ------------------------------------------------------------------------------------------------

setMangled(MANGLED)

const util = unmangle(Run)._util

Run.defaults.logger = unmangle(util.Log)._logger = LOGGER ? console : {}
Run.defaults.network = NETWORK
Run.defaults.api = API
Run.defaults.apiKey = APIKEY
Run.defaults.purse = PURSE

if (COVER) {
  Run.sandbox.excludes = [Run.Jig, Run.Berry, Run.Token, Run.expect, util.TokenSet, util.TokenMap,
    Run.StandardLock, Run.GroupLock]
}

// ------------------------------------------------------------------------------------------------

module.exports = { Run, PERF, COVER, NETWORK }
