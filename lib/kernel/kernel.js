/**
 * kernel.js
 *
 * Run central kernel, that loads resources and creates transactions
 */

const bsv = require('bsv')
const { _bsvNetwork } = require('../util/misc')
const Code = require('./code')

// ------------------------------------------------------------------------------------------------
// Kernel
// ------------------------------------------------------------------------------------------------

class Kernel {
  constructor () {
    // Blockchain API implementation - required
    this._blockchain = null

    // Purse API implementation - required
    this._purse = null

    // Cache API implementation - required
    this._cache = null

    // Owner API implementation - required
    this._owner = null

    // App name string for transactions - not required
    this._app = null

    // Event listeners in the form { _event, _listener }
    // Events: 'jig'
    this._listeners = []

    // Timeout for kernel actions
    this._timeout = 2000

    // Trusted code. Defaults to none.
    this._trusts = new Set()
  }

  /**
   * Activates this kernel instance so its owner, blockchain, transaction queue and more are used.
   */
  _activate () {
    if (Kernel._instance === this) return
    if (Kernel._instance) Kernel._instance._deactivate()

    Kernel._instance = this
    bsv.Networks.defaultNetwork = bsv.Networks[_bsvNetwork(this._blockchain.network)]

    Code._activate()
  }

  /**
   * Deactivates the current run instance, cleaning up anything in the process
   */
  _deactivate () {
    if (!Kernel._instance) return

    Code._deactivate()
    Kernel._instance = null
  }

  _emit (event, data) {
    // Set local bindings for ease of learning Run
    if (event === 'jig' && data instanceof Code) {
      Code._editor(data)._copyBindingsToLocalType()
    }

    this._listeners
      .filter(x => x._event === event)
      .forEach(x => x._listener(event, data))
  }
}

// ------------------------------------------------------------------------------------------------

// No kernel instance is active by default
Kernel._instance = null

// ------------------------------------------------------------------------------------------------

module.exports = Kernel
