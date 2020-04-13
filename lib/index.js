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
  const { Script, Transaction } = bsv
  const { Input } = Transaction
  const { Hash } = bsv.crypto
  const { BufferReader } = bsv.encoding

  // On Bitcoin SV, 0.5 sats/byte are normal now, but 1sat/byte is still safer
  Transaction.FEE_PER_KB = 1000

  // Modify sign() to skip isValidSignature(), which is slow and unnecessary
  const oldSign = Transaction.prototype.sign
  Transaction.prototype.sign = function (...args) {
    const oldIsValidSignature = Input.prototype.isValidSignature
    Input.prototype.isValidSignature = () => true
    const ret = oldSign.call(this, ...args)
    Input.prototype.isValidSignature = oldIsValidSignature
    return ret
  }

  // Create a LockedTransaction that assumes all inputs, outputs, and signatures are final.
  // We use the LockedTransaction to cache the hash throughout the library. It shares the
  // same API as Transaction.
  function LockedTransaction (...args) { Object.assign(this, new Transaction(args[0])) }
  LockedTransaction.prototype = Object.create(Transaction.prototype)

  Object.defineProperty(LockedTransaction.prototype, 'hash', {
    configurable: false,
    enumerable: true,
    get: function () {
      this._hash = this._hash || new BufferReader(this._getHash()).readReverse().toString('hex')
      return this._hash
    }
  })

  // Add a lock() method to convert a Transaction to a LockedTransaction
  Transaction.prototype.lock = function () {
    // The hash property may have already been set to an outdated value. Clear to lock.
    delete this._hash
    return Object.setPrototypeOf(this, LockedTransaction.prototype)
  }

  // Add a hash getter to Script that calculates and caches the script hash.
  Object.defineProperty(Script.prototype, 'hash', {
    configurable: false,
    enumerable: true,
    get: function () {
      this._hash = this._hash || Hash.sha256(this.toBuffer()).reverse().toString('hex')
      return this._hash
    }
  })

  // Disable signature errors, because we support custom scripts, and check custom scripts
  // using the bsv library's interpreter.
  Input.prototype.clearSignatures = () => {}
  Input.prototype.getSignatures = () => []
  Input.prototype.isFullySigned = function () {
    const interpreter = new Script.Interpreter()
    return interpreter.verify(this.script, this.output.script)
  }
  Input.prototype.isValidSignature = function () {
    const interpreter = new Script.Interpreter()
    return interpreter.verify(this.script, this.output.script)
  }
  Transaction.prototype.isFullySigned = function () {
    const _ = bsv.deps._
    return _.every(_.map(this.inputs, function (input) {
      return input.isFullySigned()
    }))
  }
  Transaction.prototype.isValidSignature = function (signature) {
    var self = this
    return this.inputs[signature.inputIndex].isValidSignature(self, signature)
  }

  // Add a signature(vin) helper to the Transaction class that returns a Bitcoin signature
  Transaction.prototype.signature = function (vin) {
    // Todo
  }
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

  if (typeof window !== 'undefined') {
    const userAgent = window.navigator.userAgent
    const ie = userAgent.indexOf('MSIE') !== -1 || userAgent.indexOf('Trident') !== -1
    if (ie) throw new Error('Run is not supported on Internet Explorer. Please upgrade to Edge.')
  }
}

checkEnvironment()

// ------------------------------------------------------------------------------------------------

global.Jig = Run.Jig
global.Berry = Run.Berry
global.Token = Run.Token

module.exports = Run
