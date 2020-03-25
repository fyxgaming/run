/**
 * kernel.js
 *
 * Run central kernel, that loads tokens and creates transactions
 */

const bsv = require('bsv')
const { _bsvNetwork } = require('../util')

// ------------------------------------------------------------------------------------------------
// Kernel
// ------------------------------------------------------------------------------------------------

class Kernel {
  constructor () {
    this.blockchain = null
    this.purse = null
    this.logger = null
  }

  /**
   * Activates this kernel instance so its owner, blockchain, transaction queue and more are used.
   */
  activate () {
    if (Kernel._instance === this) return
    if (Kernel._instance) Kernel._instance.deactivate()
    Kernel._instance = this
    bsv.Networks.defaultNetwork = _bsvNetwork(this.blockchain.network)
    // TODO: Activate code
    // this.code.activate(this.blockchain.network)
  }

  /**
   * Deactivates the current run instance, cleaning up anything in the process
   */
  deactivate () {
    if (!Kernel._instance) return
    Kernel._instance = null
  }
}

// ------------------------------------------------------------------------------------------------

// No kernel instance is active by default
Kernel._instance = null

// ------------------------------------------------------------------------------------------------

module.exports = Kernel
