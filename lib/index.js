/**
 * index.js
 *
 * Primary library export
 */

const bsv = require('bsv')
const Run = require('./run')

// ------------------------------------------------------------------------------------------------
// BSV library setup
// ------------------------------------------------------------------------------------------------

function setupBsvLibrary () {
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
      this._hash = this._hash || new bsv.encoding.BufferReader(
        this._getHash()).readReverse().toString('hex')
      return this._hash
    }
  })

  // Add a lock() method to convert a Transaction to a LockedTransaction
  bsv.Transaction.prototype.lock = function () {
    // The hash property may have already been set to an outdated value. Clear to lock.
    delete this._hash
    return Object.setPrototypeOf(this, LockedTransaction.prototype)
  }

  // Add a hash getter to Script that calculates and caches the script hash.
  Object.defineProperty(bsv.Script.prototype, 'hash', {
    configurable: false,
    enumerable: true,
    get: function () {
      this._hash = this._hash || bsv.crypto.Hash.sha256(this.toBuffer()).reverse().toString('hex')
      return this._hash
    }
  })
}

setupBsvLibrary()

// ------------------------------------------------------------------------------------------------
// Check environment
// ------------------------------------------------------------------------------------------------

function checkEnvironment () {
  if (process && process.version) {
    const nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1])
    if (nodeVersion < 10) throw new Error('Run is supported only on Node v10 and above')
  }
}

checkEnvironment()

// ------------------------------------------------------------------------------------------------

global.Jig = Run.Jig
global.Berry = Run.Berry
global.Token = Run.Token

module.exports = Run
