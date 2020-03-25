/**
 * index.js
 *
 * Primary library export and Run class
 */

const bsv = require('bsv')
const Kernel = require('./kernel')
const BlockchainApi = require('./module/blockchain-api')
const LocalPurse = require('./module/local-purse')
const Mockchain = require('./module/mockchain')

// ------------------------------------------------------------------------------------------------
// Run
// ------------------------------------------------------------------------------------------------

/**
 * The Run class that the user creates.
 *
 * It is essentially a wrapper around the kernel.
 * It sets up the kernel with users provided options or defaults and exposes an API to the user.
 */
class Run {
  constructor (options = {}) {
    options = Object.assign({}, Run.defaults, options)

    this.kernel = new Kernel()
    this.kernel.logger = parseLogger(options.logger)
    this.kernel.blockchain = parseBlockchain(options, this.logger)
    this.kernel.purse = parsePurse(options.purse, this)
    this.kernel.activate()

    // If using the mockchain and local purse, automatically fund the purse with some money
    if (this.blockchain instanceof Mockchain && this.purse instanceof LocalPurse) {
      this.blockchain.fund(this.purse.bsvAddress, 100000000)
    }
  }

  get logger () { return this.kernel.logger }
  get blockchain () { return this.kernel.blockchain }
  get purse () { return this.kernel.purse }

  set logger (logger) { this.kernel.logger = parseLogger(logger) }
  set purse (purse) { this.kernel.purse = parsePurse(purse, this) }

  activate () { this.kernel.activate(); return this }
  deactivate () { this.kernel.deactivate(); return this }
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseBlockchain (options, logger) {
  const blockchain = options.blockchain

  const lastBlockchain = Kernel._instance && Kernel._instance.blockchain

  // If no blockchain is passed, create one
  if (typeof blockchain === 'undefined') {
    switch (options.network) {
      case 'mock':
        return lastBlockchain instanceof Mockchain ? lastBlockchain : new Mockchain()

      case 'main':
      case 'test':
        return new BlockchainApi({
          api: options.api,
          apiKey: options.apiKey,
          network: options.network,
          timeout: options.timeout,
          logger,
          lastBlockchain
        })

      default: throw new Error(`Unsupported network: ${options.network}`)
    }
  }

  // If we received an object, see if it's a blockchain
  if (typeof blockchain === 'object' && blockchain && blockchain.network) {
    return blockchain
  }

  throw new Error(`Invalid blockchain: ${blockchain}`)
}

function parseLogger (logger) {
  // When no logger is provided, we log warnings and errors by default
  switch (typeof logger) {
    case 'object': logger = Object.assign({}, logger || {}); break
    case 'undefined': logger = { warn: console.warn, error: console.error }; break
    default: throw new Error(`Option 'logger' must be an object. Received: ${logger}`)
  }

  // Fill this.logger with all supported methods
  const methods = ['info', 'debug', 'warn', 'error']
  methods.forEach(method => { logger[method] = logger[method] || (() => {}) })
  return logger
}

function parsePurse (purse, run) {
  if (typeof purse === 'object' && typeof purse.pay === 'function') {
    return purse
  } else {
    return new LocalPurse({ privkey: purse, blockchain: run.blockchain })
  }
}

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
// Defaults
// ------------------------------------------------------------------------------------------------

Run.defaults = {}
Run.defaults.logger = undefined
Run.defaults.network = 'mock'
Run.defaults.api = 'run'
Run.defaults.purse = undefined

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

module.exports = Run
