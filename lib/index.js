/**
 * index.js
 *
 * Primary library export, environment checks, and global sets
 */

const bsv = require('bsv')
const Run = require('./run')
const { _patchBsv } = require('./util/bsv')
const { _defineGetter } = require('./util/misc')

// ------------------------------------------------------------------------------------------------
// Check environment
// ------------------------------------------------------------------------------------------------

Run._checkEnvironment()

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

global.Jig = Run.Jig
global.Berry = Run.Berry

// Preinstalled extras are defined with getters to facilitate code coverage
_defineGetter(global, 'Token', () => { return Run.extra.Token })

// ------------------------------------------------------------------------------------------------
// Patch BSV
// ------------------------------------------------------------------------------------------------

_patchBsv(bsv)

// ------------------------------------------------------------------------------------------------

module.exports = Run
