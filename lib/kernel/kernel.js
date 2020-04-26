/**
 * kernel.js
 *
 * Run central kernel, that loads resources and creates transactions
 */

const bsv = require('bsv')
const Code = require('./code')
const Publisher = require('./publisher')
const Syncer = require('./syncer')
const Inventory = require('./inventory')
const Transaction = require('./transaction')
const { _bsvNetwork, _SerialTaskQueue } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// Kernel
// ------------------------------------------------------------------------------------------------

class Kernel {
  constructor () {
    this._blockchain = null
    this._purse = null
    this._state = null
    this._app = null
    this._owner = null
    this._sandbox = true
    this._code = null
    this._publisher = null
    this._syncer = null
    this._protocol = null
    this._transaction = null
    this._inventory = null
    this._loadQueue = new _SerialTaskQueue()
  }

  _setup () {
    if (!this._code) {
      if (Kernel._instance) {
        const sameSandbox = Kernel._instance._sandbox.toString() === this._sandbox.toString()
        if (sameSandbox) {
          this._code = Kernel._instance._code
        } else {
          Kernel._instance._code.deactivate()
          this._code = new Code(this)
        }
      } else {
        this._code = new Code(this)
      }
    }

    this._publisher = new Publisher(this)
    this._syncer = new Syncer(this)
    this._transaction = new Transaction(this)
    this._inventory = new Inventory(this)
  }

  _load (location, options) {
    return this._loadQueue.enqueue(() => {
      return this._transaction.load(location, options)
    })
  }

  _deploy (T) { this._code.deploy(T) }
  _transaction (callback) { this._transaction._transaction(callback) }

  async _sync () {
    // TODO: Parallelize
    await this._syncer.sync()
    await this._inventory.sync()
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
    bsv.Networks.defaultNetwork = bsv.Networks[_bsvNetwork(this._blockchain.network)]
    this._code.activate(this._blockchain.network)
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
