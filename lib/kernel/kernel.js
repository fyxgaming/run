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
    this._cache = null
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
    // Check if we can reuse the code
    if (!this._code && Kernel._instance) {
      const sameSandbox = Kernel._instance._sandbox.toString() === this._sandbox.toString()
      const sameNetwork = Kernel._instance._blockchain.network === this._blockchain.network
      const useSameCode = sameSandbox && sameNetwork
      if (useSameCode) { this._code = Kernel._instance._code }
    }

    // Create a new Code instance if necessary
    if (!this._code) this._code = new Code(this._blockchain.network)
    /*
    if (!this._code) {
      this._code = new Code(this._blockchain.network)
      // Install the Jig and Berry as builtin types
      this._code.installNative(Jig)
      this._code.installNative(Berry)
    }
    */

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
