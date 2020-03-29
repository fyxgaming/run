/**
 * kernel.js
 *
 * Run central kernel, that loads tokens and creates transactions
 */

const bsv = require('bsv')
const { _bsvNetwork, SerialTaskQueue } = require('../util')
const Code = require('./code')

// ------------------------------------------------------------------------------------------------
// Kernel
// ------------------------------------------------------------------------------------------------

class Kernel {
  constructor (logger = null) {
    this._blockchain = null
    this._purse = null
    this._logger = logger
    this._state = null
    this._app = null
    this._owner = null
    this._sandbox = true
    this._code = Kernel._instance ? Kernel._instance._code : new Code(this)

    // this.code = parseCode(options.code, parseSandbox(options.sandbox), this.logger)
    // this.syncer = new Syncer(this)
    // this.protocol = Run.instance ? Run.instance.protocol : new Protocol()
    // this.transaction = new Transaction(this)
    this._loadQueue = new SerialTaskQueue()
  }

  _deploy (T) {
    // return this._code._deploy(
    // T,
    // this._blockchain.network,
    // this._logger,
    // this._transaction)
  }

  async _sync () {
    // No-op
    return true
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
