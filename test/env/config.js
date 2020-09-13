/**
 * config.js
 *
 * Provides test settings
 */

require('dotenv').config()
const unmangle = require('./unmangle')

// ------------------------------------------------------------------------------------------------
// Configure the test environment
// ------------------------------------------------------------------------------------------------

const COVER = process.env.COVER ? JSON.parse(process.env.COVER) : false
const STRESS = process.env.STRESS ? JSON.parse(process.env.STRESS) : false
const MANGLED = process.env.MANGLED ? process.env.MANGLED : false

unmangle.enable(MANGLED)

// ------------------------------------------------------------------------------------------------

module.exports = { COVER, STRESS }
