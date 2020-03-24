/**
 * config.js
 *
 * Provides the test build and other settings for the tests.
 */

const path = require('path')

const Run = process.env.LIB ? require(path.join(process.cwd(), process.env.LIB)) : require('target')

const PERF = process.env.PERF ? JSON.parse(process.env.PERF) : false
const NETWORK = process.env.NETWORK ? process.env.NETWORK : 'mock'
const PURSE = process.env.PURSE ? process.env.PURSE : undefined
const API = process.env.API ? process.env.API : 'run'
const LOGGER = process.env.LOGGER ? process.env.LOGGER : 'run'

Run.defaults.logger = LOGGER ? console : undefined
Run.defaults.network = NETWORK
Run.defaults.api = API
Run.defaults.purse = PURSE

module.exports = { Run, PERF }
