/**
 * config.js
 *
 * Provides the build of Run for testing and other settings.
 */

require('dotenv').config()
const path = require('path')
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

// Read the local environment vars to configure Run for the tests
Run.configure(process.env)

// Prefer mocknet and no logs for testing
Run.defaults.network = Run.defaults.network || 'mock'
Run.defaults.logger = Run.defaults.logger || null
console.log(Run.defaults)

setMangled(MANGLED)

if (COVER) {
  const util = unmangle(Run)._util
  Run.sandbox.excludes = [Run.Jig, Run.Berry, Run.Token, Run.expect, util.TokenSet, util.TokenMap,
    Run.StandardLock, Run.GroupLock]
}

// ------------------------------------------------------------------------------------------------

module.exports = { Run, PERF, COVER }
