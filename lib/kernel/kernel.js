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

    // Cache API implementation - required
    this._cache = null

    // Owner API implementation - required
    this._owner = null

    // Purse API implementation - required
    this._purse = null

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

    // Client mode will only load jigs from the cache. This is a setting for browsers and apps to work reliably.
    this._client = false
  }

  /**
   * Wraps the blockchain object to log its usage
   */
  _blockchainAPI () {
    const blockchain = this._blockchain
    return {
      get network () { return blockchain.network },
      broadcast (rawtx) { return blockchain.broadcast(rawtx) },
      fetch (txid) { return blockchain.fetch(txid) },
      utxos (script) { return blockchain.utxos(script) },
      spends (txid, vout) { return blockchain.spends(txid, vout) },
      time (txid) { return blockchain.time(txid) }
    }
  }

  /**
   * Wraps the cache object to log its usage
   */
  _cacheAPI () {
    const cache = this._cache
    return {
      get (key) { return cache.get(key) },
      set (key, value) { return cache.set(key, value) }
    }
  }

  /**
   * Wraps the owner object to log its usage
   */
  _ownerAPI () {
    const owner = this._owner
    return {
      nextOwner () { return owner.nextOwner() },
      sign (rawtx, parents, locks) { return owner.sign(rawtx, parents, locks) }
    }
    /*
      if (commit._kernel._ownerAPI().owner) {
        Log._warn(TAG, 'Owner.prototype.owner() is deprecated. Please rename owner() to nextOwner().')
        owner = await commit._kernel._ownerAPI().owner()
      } else {
        owner = await commit._kernel._ownerAPI().nextOwner()
      }
      */
  }

  /**
   * Wraps the purse object to log its usage
   */
  _purseAPI () {
    const purse = this._purse
    return {
      pay (rawtx, parents) { return purse.pay(rawtx, parents) },
      broadcast (rawtx) { return purse.broadcast(rawtx) }
    }

    /*
  if (typeof commit._kernel._purseAPI().broadcast === 'function') {
    try {
      await commit._kernel._purseAPI().broadcast(tx.toString('hex'))
    } catch (e) {
      if (Log._errorOn) Log._error(TAG, e.toString())
    }
  }
  */
  }

  /**
   * Activates this kernel instance so its owner, blockchain, transaction queue and more are used.
   */
  _activate () {
    if (Kernel._instance === this) return
    if (Kernel._instance) Kernel._instance._deactivate()

    Kernel._instance = this
    bsv.Networks.defaultNetwork = bsv.Networks[_bsvNetwork(this._blockchainAPI().network)]

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
