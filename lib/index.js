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
// _checkEnvironment
// ------------------------------------------------------------------------------------------------

function _checkEnvironment () {
  if (process && process.version) {
    const nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1])
    if (nodeVersion < 10) throw new Error('Run is supported only on Node v10 and above')
  }

  if (typeof window !== 'undefined') {
    // IE not supported
    const userAgent = window.navigator.userAgent
    const ie = userAgent.indexOf('MSIE') !== -1 || userAgent.indexOf('Trident') !== -1
    if (ie) throw new Error('Run is not supported on Internet Explorer. Please upgrade to Edge.')

    // iOS <= 12 not supported
    if (/iP(hone|od|ad)/.test(navigator.platform)) {
      var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/)
      const version = [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)]
      if (version[0] < 13) throw new Error('Run is not supported on this iOS version. Please upgrade to iOS 13 or above.')
    }
  }
}

_checkEnvironment()

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

global.Jig = Run.Jig
global.Berry = Run.Berry

// Preinstalled extras are defined with getters to facilitate code coverage
_defineGetter(global, 'Token', () => { return Run.Token })

// ------------------------------------------------------------------------------------------------
// Patch BSV
// ------------------------------------------------------------------------------------------------

_patchBsv(bsv)

// ------------------------------------------------------------------------------------------------

module.exports = Run
