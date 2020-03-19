/**
 * config.js
 *
 * Provides the test build and other settings for the tests.
 */

const path = require('path')

const lib = process.env.LIB ? require(path.join(process.cwd(), process.env.LIB)) : require('target')
const perf = process.env.PERF ? JSON.parse(process.env.PERF) : false

module.exports = { lib, perf }
