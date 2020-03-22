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
    this.blockchain = parseBlockchain(options)
    this.purse = options.purse

    // If using the mockchain, automatically fund the purse with some money
    if (this.blockchain instanceof Mockchain) this.blockchain.fund(this.purse.address, 100000000)
  }

  get logger () { return this.kernel.logger }
  set logger (logger) {
    // When no logger is provided, we log warnings and errors by default
    switch (typeof logger) {
      case 'object': logger = Object.assign({}, logger || {}); break
      case 'undefined': logger = { warn: console.warn, error: console.error }; break
      default: throw new Error(`Option 'logger' must be an object. Received: ${logger}`)
    }

    // Fill this.logger with all supported methods
    const methods = ['info', 'debug', 'warn', 'error']
    methods.forEach(method => { logger[method] = logger[method] || (() => {}) })

    this.kernel.logger = logger
  }

  get blockchain () { return this.kernel.blockchain }
  set blockchain (blockchain) {
    this.kernel.blockchain = blockchain
  }

  get purse () { return this.kernel.purse }
  set purse (purse) {
    if (typeof purse === 'object') {
      this.kernel.purse = purse
    } else {
      this.kernel.purse = new LocalPurse({ privkey: purse, blockchain: this.blockchain })
    }
  }
}

function parseBlockchain (options) {
  if (options.network === 'mock') {
    return new Mockchain()
  } else {
    throw new Error(`Unknown network: ${options.network}`)
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
