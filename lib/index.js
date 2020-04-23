/**
 * index.js
 *
 * Primary library export, environment checks, and global sets
 */

const bsv = require('bsv')
const patchBsv = require('./util/patch-bsv')
const Run = require('./run')

// ------------------------------------------------------------------------------------------------
// checkEnvironment
// ------------------------------------------------------------------------------------------------

function checkEnvironment () {
  if (process && process.version) {
    const nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1])
    if (nodeVersion < 10) throw new Error('Run is supported only on Node v10 and above')
  }

  if (typeof window !== 'undefined') {
    const userAgent = window.navigator.userAgent
    const ie = userAgent.indexOf('MSIE') !== -1 || userAgent.indexOf('Trident') !== -1
    if (ie) throw new Error('Run is not supported on Internet Explorer. Please upgrade to Edge.')
  }
}

checkEnvironment()

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

global.Jig = Run.Jig
global.Berry = Run.Berry
global.Token = Run.Token

// ------------------------------------------------------------------------------------------------
// Patch BSV
// ------------------------------------------------------------------------------------------------

patchBsv(bsv)

// ------------------------------------------------------------------------------------------------

module.exports = Run
