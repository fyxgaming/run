/**
 * config.js
 *
 * Provides the test build and other settings for the tests.
 */

const path = require('path')
const fs = require('fs')
const os = require('os')

const Run = process.env.LIB ? require(path.join(process.cwd(), process.env.LIB)) : require('target')

const PERF = process.env.PERF ? JSON.parse(process.env.PERF) : false
const LOGGER = process.env.LOGGER ? process.env.LOGGER : false
const NETWORK = process.env.NETWORK ? process.env.NETWORK : 'mock'
const API = process.env.API ? process.env.API : 'run'
const APIKEY = process.env.APIKEY ? process.env.APIKEY : undefined
const PURSE = process.env.PURSE ? process.env.PURSE : undefined

Run.defaults.logger = LOGGER ? console : undefined
Run.defaults.network = NETWORK
Run.defaults.api = API
Run.defaults.apiKey = APIKEY
Run.defaults.purse = PURSE

// Use the user's ~/.keys.json if some settings are left unspecified
const keysPath = path.join(os.homedir(), '.keys.json')
if (fs.existsSync(keysPath)) {
  const keys = JSON.parse(fs.readFileSync(keysPath)).toString('utf8')
  if (keys && keys.tests) {
    if (API === 'mattercloud' && !APIKEY) { Run.defaults.apiKey = keys.tests.matterCloudApiKey }
    if (!PURSE) { Run.defaults.purse = keys.tests[NETWORK] }
  }
}

module.exports = { Run, PERF }
