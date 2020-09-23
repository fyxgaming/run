/**
 * kernel.js
 *
 * Run central kernel, that loads resources and creates transactions
 */

const bsv = require('bsv')
const { _assert, _bsvNetwork } = require('../util/misc')
const Code = require('./code')

// ------------------------------------------------------------------------------------------------
// Events
// ------------------------------------------------------------------------------------------------

const EVENTS = ['load', 'sync', 'publish', 'update']

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
    this._listeners = []

    // Timeout for kernel actions
    this._timeout = 10000

    // Trusted code. Defaults to none.
    this._trusts = new Set()

    // Whether to automatically update jigs when they are used together
    this._autounify = false

    // Whether to check that a transaction does not have any locally-detectable verification
    // errors before publishing. This does not check consensus but it may find Run bugs. It will
    // slow down publishing however. We will keep this on until we are 100% confident in Run.
    this._preverify = true
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
    _assert(EVENTS.includes(event))

    // Set local bindings for ease of learning Run
    if (event === 'publish' && data instanceof Code) {
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

Kernel._EVENTS = EVENTS

module.exports = Kernel
