/**
 * run.js
 *
 * The main Run class
 */

const Kernel = require('./kernel')
const Mockchain = require('./module/mockchain')
const LocalPurse = require('./module/local-purse')

// ------------------------------------------------------------------------------------------------
// Run
// ------------------------------------------------------------------------------------------------

/**
 * The Run class that the user creates.
 *
 * It sets up the kernel with users provided options or defaults and exposes an API to the user.
 */
class Run {
  constructor (options = {}) {
    options = Object.assign({}, Run.defaults, options)
    this.kernel = new Kernel()
    this.logger = options.logger
    this.kernel.blockchain = parseBlockchain(options)
    this.purse = options.purse

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
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseBlockchain (options) {
  if (options.network === 'mock') {
    return new Mockchain()
  } else {
    throw new Error(`Unknown network: ${options.network}`)
  }
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
// Defaults
// ------------------------------------------------------------------------------------------------

Run.defaults = {}
Run.defaults.network = 'mock'
Run.defaults.purse = undefined

// ------------------------------------------------------------------------------------------------

module.exports = Run
