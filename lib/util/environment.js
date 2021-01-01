/**
 * environment.js
 *
 * Checks that the environment is valid for Run
 */

const bsv = require('bsv')

// ------------------------------------------------------------------------------------------------
// _check
// ------------------------------------------------------------------------------------------------

function _check () {
  _checkBsvLibrary()
  _checkNode()
  _checkBrowser()
}

// ------------------------------------------------------------------------------------------------
// _checkBsvLibrary
// ------------------------------------------------------------------------------------------------

function _checkBsvLibrary () {
  if (typeof bsv.version !== 'string' || !bsv.version.startsWith('v1.')) {
    const hint = 'Hint: Please install bsv version 1.5.4 or install Run from NPM'
    throw new Error(`Run requires version 1.x of the bsv library\n\n${hint}`)
  }
}

// ------------------------------------------------------------------------------------------------
// _checkNode
// ------------------------------------------------------------------------------------------------

function _checkNode () {
  if (process && process.version) {
    const nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1])
    if (nodeVersion < 10) throw new Error('Run is supported only on Node v10 and above')
    if (nodeVersion >= 15) throw new Error('Run is not yet supported on Node 15 and above')
  }
}

// ------------------------------------------------------------------------------------------------
// _checkBrowser
// ------------------------------------------------------------------------------------------------

function _checkBrowser () {
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

// ------------------------------------------------------------------------------------------------

module.exports = { _check, _checkBsvLibrary, _checkNode, _checkBrowser }
