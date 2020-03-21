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
    this.blockchain = parseBlockchain(options)
    this.purse = options.purse
  }

  get logger () { return this.kernel.logger }
  set logger (logger) {

  }

  get blockchain () { return this.kernel.blockchain }
  set blockchain (blockchain) {
    this.kernel.blockchain = blockchain
  }

  get purse () { return this.kernel.purse }
  set purse (purse) {
    if (purse) {
      this.kernel.purse = new LocalPurse(purse)
    } else {
      this.kernel.purse = LocalPurse.makeRandom()
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
