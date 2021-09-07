/**
 * kernel.js
 *
 * RUN's core that loads jigs and creates transactions
 */

const bsv = require('bsv')
const { _assert, _bsvNetwork } = require('./misc')
const Editor = require('./editor')
const { _sha256Internal } = require('./bsv')
const { BlockchainWrapper, StateWrapper, CacheWrapper, OwnerWrapper, PurseWrapper } = require('./wrapper')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const EVENTS = ['load', 'sync', 'publish', 'update']

// ------------------------------------------------------------------------------------------------
// Kernel
// ------------------------------------------------------------------------------------------------

class Kernel {
  constructor () {
    // Blockchain API implementation
    this._blockchain = null

    // State API implementation
    this._state = null

    // Cache API implementation
    this._cache = null

    // Owner API implementation
    this._owner = null

    // Purse API implementation
    this._purse = null

    // App name string for transactions - not required
    this._app = null

    // Event listeners in the form { _event, _listener }
    this._listeners = []

    // Timeout for kernel actions
    this._timeout = 10000

    // Trusted code. Defaults to none. They are txids, and there are two special values, "*" and "cache".
    this._trustlist = new Set()

    // Whether to check that a transaction does not have any locally-detectable verification
    // errors before publishing. This does not check consensus but it may find RUN bugs. It will
    // slow down publishing however. We will keep this on until we are 100% confident in RUN.
    this._preverify = true

    // Client mode will only load jigs from the cache. This is a setting for browsers and apps to work reliably.
    this._client = false

    // Whether jigs should be rolled back to their last safe state if there is an error
    this._rollbacks = false
  }

  // --------------------------------------------------------------------------

  _blockchainWrapper () { return new BlockchainWrapper(this._blockchain, this._cacheWrapper(), this._client) }

  // --------------------------------------------------------------------------

  _stateWrapper () { return new StateWrapper(this._state, this._cacheWrapper()) }

  // --------------------------------------------------------------------------

  _cacheWrapper () { return new CacheWrapper(this._cache) }

  // --------------------------------------------------------------------------

  _ownerWrapper () { return new OwnerWrapper(this._owner) }

  // --------------------------------------------------------------------------

  _purseWrapper () { return new PurseWrapper(this._purse) }

  // --------------------------------------------------------------------------

  /**
   * Activates this kernel instance so its owner, blockchain, transaction queue and more are used.
   */
  _activate () {
    if (Kernel._instance === this) return
    if (Kernel._instance) Kernel._instance._deactivate()

    Kernel._instance = this
    bsv.Networks.defaultNetwork = bsv.Networks[_bsvNetwork(this._blockchainWrapper().network)]

    Editor._activate()
  }

  // --------------------------------------------------------------------------

  /**
   * Deactivates the current run instance, cleaning up anything in the process
   */
  _deactivate () {
    if (!Kernel._instance) return

    Editor._deactivate()
    Kernel._instance = null
  }

  // --------------------------------------------------------------------------

  _emit (event, data) {
    _assert(EVENTS.includes(event))

    this._listeners
      .filter(x => x._event === event)
      .forEach(x => x._listener(event, data))
  }

  // --------------------------------------------------------------------------

  // The trust list works off TXIDs because locations are not known when the code
  // is about to be executed during replay.
  async _trusted (txid, method) {
    return this._trustlist.has('*') ||
      this._trustlist.has(txid) ||
      (method === 'cache' && this._trustlist.has('cache')) ||
      await this._cacheWrapper().get(`trust://${txid}`)
  }
}

// ------------------------------------------------------------------------------------------------

// No kernel instance is active by default
Kernel._instance = null

// The sha256 function used by the kernel is our internal one
Kernel._sha256 = _sha256Internal

// ------------------------------------------------------------------------------------------------

Kernel._EVENTS = EVENTS

module.exports = Kernel
