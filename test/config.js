/**
 * config.js
 *
 * Provides the build of Run for testing and other settings.
 */

const path = require('path')
const { addUserKeystoEnvironment } = require('./env/keys')

addUserKeystoEnvironment()

const PERF = process.env.PERF ? JSON.parse(process.env.PERF) : false
const LOGGER = process.env.LOGGER ? process.env.LOGGER : false
const NETWORK = process.env.NETWORK ? process.env.NETWORK : 'mock'
const API = process.env.API ? process.env.API : 'run'
const APIKEY = process.env.APIKEY ? process.env.APIKEY : undefined
const PURSE = process.env.PURSE ? process.env.PURSE : undefined

const Run = process.env.LIB ? require(path.join(process.cwd(), process.env.LIB)) : require('target')

Run.defaults.logger = LOGGER ? console : {}
Run.defaults.network = NETWORK
Run.defaults.api = API
Run.defaults.apiKey = APIKEY
Run.defaults.purse = PURSE
// TODO: Only if cover
Run.defaults.sandbox = /^(?!Jig|Berry|Token|expect|FriendlySet|FriendlyMap|AddressScript|PubKeyScript|getIntrinsics).*$/

module.exports = { Run, PERF }
