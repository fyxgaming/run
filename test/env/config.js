/**
 * config.js
 *
 * Provides test settings
 */

require('dotenv').config()
const { setMangled } = require('./unmangle')

// ------------------------------------------------------------------------------------------------
// Configure the test environment
// ------------------------------------------------------------------------------------------------

const COVER = process.env.COVER ? JSON.parse(process.env.COVER) : false
const PERF = process.env.PERF ? JSON.parse(process.env.PERF) : false
const MANGLED = process.env.MANGLED ? process.env.MANGLED : false

setMangled(MANGLED)

// ------------------------------------------------------------------------------------------------

module.exports = { COVER, PERF }
