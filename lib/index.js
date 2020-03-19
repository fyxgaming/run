/**
 * index.js
 *
 * Library export
 */

const bsv = require('bsv')
const Run = require('./run')
const Mockchain = require('./module/mockchain')

// ------------------------------------------------------------------------------------------------
// Additional Exports
// ------------------------------------------------------------------------------------------------

Run.module = {}
Run.module.Mockchain = Mockchain

/* global VERSION */
Run.version = (typeof VERSION !== 'undefined' && VERSION) || require('../package').version

// ------------------------------------------------------------------------------------------------
// BSV library setup
// ------------------------------------------------------------------------------------------------

// On Bitcoin SV, 0.5 sats/byte are normal now, but 1sat/byte is still safer
bsv.Transaction.FEE_PER_KB = 1000

// Modify sign() to skip isValidSignature(), which is slow and unnecessary
const oldSign = bsv.Transaction.prototype.sign
bsv.Transaction.prototype.sign = function (...args) {
  const oldIsValidSignature = bsv.Transaction.Input.prototype.isValidSignature
  bsv.Transaction.Input.prototype.isValidSignature = () => true
  const ret = oldSign.call(this, ...args)
  bsv.Transaction.Input.prototype.isValidSignature = oldIsValidSignature
  return ret
}

// ------------------------------------------------------------------------------------------------

module.exports = Run
