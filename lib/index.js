/**
 * index.js
 *
 * Library export
 */

const bsv = require('bsv')
const Run = require('./run')
const BlockchainApi = require('./module/blockchain-api')
const LocalPurse = require('./module/local-purse')
const Mockchain = require('./module/mockchain')

// ------------------------------------------------------------------------------------------------
// Additional Exports
// ------------------------------------------------------------------------------------------------

Run.module = {}
Run.module.BlockchainApi = BlockchainApi
Run.module.LocalPurse = LocalPurse
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

// Create a LockedTransaction that assumes all inputs, outputs, and signatures are final.
// We use the LockedTransaction to cache the hash throughout the library. It shares the
// same API as bsv.Transaction.
function LockedTransaction (...args) { Object.assign(this, new bsv.Transaction(args[0])) }
LockedTransaction.prototype = Object.create(bsv.Transaction.prototype)

Object.defineProperty(LockedTransaction.prototype, 'hash', {
  configurable: false,
  enumerable: true,
  get: function () {
    if (this._hash) return this._hash
    this._hash = new bsv.encoding.BufferReader(this._getHash()).readReverse().toString('hex')
    return this._hash
  }
})

// Add a lock() method to convert a Transaction to a LockedTransaction
bsv.Transaction.prototype.lock = function () {
  return Object.setPrototypeOf(this, LockedTransaction.prototype)
}

// ------------------------------------------------------------------------------------------------

module.exports = Run
