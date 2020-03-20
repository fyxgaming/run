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
      this.blockchain = UserBlockchain(new Mockchain())
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
// User-facing Blockchain
// ------------------------------------------------------------------------------------------------

class UserBlockchain {
  constructor (blockchain) { this.blockchain = blockchain }
  get network () { return this.blockchain.network }
  broadcast (tx) { return this.blockchain.broadcast(tx) }
  fetch (txid, force) { return this.blockchain.fetch(txid, force) }
  utxos (script) { return this.blockchain.utxos(script) }
}

// ------------------------------------------------------------------------------------------------

module.exports = Run
