/**
 * run.js
 *
 * The main Run class
 */

const Kernel = require('./kernel')
const Mockchain = require('./module/mockchain')

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

    if (options.network === 'mock') {
      this.blockchain = new Mockchain()
    } else {
      throw new Error(`Unknown network: ${options.network}`)
    }

    this.kernel = new Kernel(this.blockchain)
  }
}

// ------------------------------------------------------------------------------------------------
// Defaults
// ------------------------------------------------------------------------------------------------

Run.defaults = {}
Run.defaults.network = 'mock'

// ------------------------------------------------------------------------------------------------

module.exports = Run
