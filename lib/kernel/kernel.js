/**
 * kernel.js
 *
 * Run central kernel, that loads resources and creates transactions
 */

const bsv = require('bsv')
const { _bsvNetwork } = require('../util/misc')
const Repository = require('./repository')
const Loader = require('./loader')

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
    this._sandbox = true // TODO what is this?
    this._loader = new Loader(this)
    this._listeners = []
    this._importLimit = Infinity
  }

  /**
   * Activates this kernel instance so its owner, blockchain, transaction queue and more are used.
   */
  _activate () {
    if (Kernel._instance === this) return
    if (Kernel._instance) Kernel._instance._deactivate()
    Kernel._instance = this
    bsv.Networks.defaultNetwork = bsv.Networks[_bsvNetwork(this._blockchain.network)]
    Repository._activate(this._blockchain.network)
  }

  /**
   * Deactivates the current run instance, cleaning up anything in the process
   */
  _deactivate () {
    if (!Kernel._instance) return
    Repository._deactivate(this._blockchain.network)
    Kernel._instance = null
  }

  _on (event, listener) {
    this._listeners.push({ event, listener })
  }

  _emit (event, data) {
    if (event === 'jig') Repository._notify(data)

    this._listeners
      .filter(x => x.event === event)
      .forEach(x => x.listener(event, data))
  }
}

// ------------------------------------------------------------------------------------------------

// No kernel instance is active by default
Kernel._instance = null

// ------------------------------------------------------------------------------------------------

module.exports = Kernel
