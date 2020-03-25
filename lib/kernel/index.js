/**
 * kernel.js
 *
 * Run central kernel, that loads tokens and creates transactions
 */

const bsv = require('bsv')
const Code = require('./code')
const { _bsvNetwork } = require('../util')

// ------------------------------------------------------------------------------------------------
// Kernel
// ------------------------------------------------------------------------------------------------

class Kernel {
  constructor () {
    this._blockchain = null
    this._purse = null
    this._logger = null

    // Code is shared across all Run instances, because the JavaScript runtime is shared
    this._code = Kernel._instance ? Kernel._instance._code : new Code()
  }

  /**
   * Activates this kernel instance so its owner, blockchain, transaction queue and more are used.
   *
   * TODO: Activating also changes code presets
   */
  _activate () {
    if (Kernel._instance === this) return
    if (Kernel._instance) Kernel._instance._deactivate()
    Kernel._instance = this
    bsv.Networks.defaultNetwork = _bsvNetwork(this._blockchain.network)
    // TODO: Activate code
    // this.code.activate(this.blockchain.network)
  }

  /**
   * Deactivates the current run instance, cleaning up anything in the process
   */
  _deactivate () {
    if (!Kernel._instance) return
    Kernel._instance = null
  }
}

// ------------------------------------------------------------------------------------------------

// No kernel instance is active by default
Kernel._instance = null

// ------------------------------------------------------------------------------------------------

module.exports = Kernel
