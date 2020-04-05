/**
 * config.js
 *
 * Provides the build of Run for testing and other settings.
 */

const path = require('path')
const { addUserKeystoEnvironment } = require('./env/keys')

addUserKeystoEnvironment()

const coverSandbox = /^(?!Jig|Berry|Token|expect|TokenSet|TokenMap|AddressScript|PubKeyScript).*$/

const PERF = process.env.PERF ? JSON.parse(process.env.PERF) : false
const LOGGER = process.env.LOGGER ? process.env.LOGGER : false
const NETWORK = process.env.NETWORK ? process.env.NETWORK : 'mock'
const API = process.env.API ? process.env.API : 'run'
const APIKEY = process.env.APIKEY ? process.env.APIKEY : undefined
const PURSE = process.env.PURSE ? process.env.PURSE : undefined
const COVER = process.env.COVER ? process.env.COVER : false

const Run = process.env.LIB ? require(path.join(process.cwd(), process.env.LIB)) : require('target')

Run.defaults.logger = LOGGER ? console : {}
Run.defaults.network = NETWORK
Run.defaults.api = API
Run.defaults.apiKey = APIKEY
Run.defaults.purse = PURSE
Run.defaults.sandbox = COVER ? coverSandbox : undefined

module.exports = { Run, PERF }
