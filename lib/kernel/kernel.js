/**
 * kernel.js
 *
 * Run's central manager that loads jigs and creates transactions
 */

const bsv = require('bsv')
const { _assert, _bsvNetwork } = require('../util/misc')
const Editor = require('./editor')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Kernel'

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

    // Trusted code. Defaults to none. They are txids, and there are two special values, "*" and "cache".
    this._trustlist = new Set()

    // Whether to check that a transaction does not have any locally-detectable verification
    // errors before publishing. This does not check consensus but it may find Run bugs. It will
    // slow down publishing however. We will keep this on until we are 100% confident in Run.
    this._preverify = true

    // Client mode will only load jigs from the cache. This is a setting for browsers and apps to work reliably.
    this._client = false

    // Whether jigs should be rolled back to their last safe state if there is an error
    this._rollbacks = false
  }

  // --------------------------------------------------------------------------

  /**
   * Wraps the blockchain object to log its usage
   */
  _blockchainAPI () {
    const blockchain = this._blockchain
    const kernel = this

    return {
      get network () {
        return blockchain.network
      },

      async broadcast (rawtx) {
        if (Log._infoOn) {
          const txid = new bsv.Transaction(rawtx).hash
          Log._info('Blockchain', 'Broadcast', txid)
        }

        const start = new Date()

        const txid = await blockchain.broadcast(rawtx)

        if (Log._debugOn) Log._debug('Blockchain', 'Broadcast (end): ' + (new Date() - start) + 'ms')

        await kernel._cache.set(`tx://${txid}`, rawtx)

        return txid
      },

      async fetch (txid) {
        if (Log._infoOn) Log._info('Blockchain', 'Fetch', txid)

        if (kernel._client) {
          const rawtx = await kernel._cache.get(`tx://${txid}`)
          if (!rawtx) {
            const hint = 'Only cached transactions may be fetched in client mode'
            throw new Error(`Not found: ${txid}\n\n${hint}`)
          }
          return rawtx
        }

        const start = new Date()

        const ret = await blockchain.fetch(txid)

        if (Log._debugOn) Log._debug('Blockchain', 'Fetch (end): ' + (new Date() - start) + 'ms')

        return ret
      },

      async utxos (script) {
        if (Log._infoOn) Log._info('Blockchain', 'Utxos', script)

        const start = new Date()

        const ret = await blockchain.utxos(script)

        if (Log._debugOn) Log._debug('Blockchain', 'Utxos (end): ' + (new Date() - start) + 'ms')

        return ret
      },

      async spends (txid, vout) {
        if (Log._infoOn) Log._info('Blockchain', `Spends ${txid}_o${vout}`)

        const start = new Date()

        const ret = await blockchain.spends(txid, vout)

        if (Log._debugOn) Log._debug('Blockchain', 'Spends (end): ' + (new Date() - start) + 'ms')

        return ret
      },

      async time (txid) {
        if (Log._infoOn) Log._info('Blockchain', 'Time', txid)

        const start = new Date()

        const ret = await blockchain.time(txid)

        if (Log._debugOn) Log._debug('Blockchain', 'Time (end): ' + (new Date() - start) + 'ms')

        return ret
      }
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Wraps the cache object to log its usage
   */
  _cacheAPI () {
    const cache = this._cache

    return {
      async get (key) {
        if (Log._infoOn) Log._info('Cache', 'Get', key)

        const start = new Date()

        const value = await cache.get(key)

        if (Log._debugOn) Log._debug('Cache', 'Get (end): ' + (new Date() - start) + 'ms')
        if (Log._debugOn) Log._debug('Cache', 'Value', JSON.stringify(value, 0, 3))

        return value
      },

      async set (key, value) {
        if (Log._infoOn) Log._info('Cache', 'Set', key)
        if (Log._debugOn) Log._debug('Cache', 'Value', JSON.stringify(value, 0, 3))

        const start = new Date()

        const ret = await cache.set(key, value)

        if (Log._debugOn) Log._debug('Cache', 'Set (end): ' + (new Date() - start) + 'ms')

        return ret
      }
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Wraps the owner object to log its usage
   */
  _ownerAPI () {
    const owner = this._owner

    return {
      async nextOwner () {
        if (Log._infoOn) Log._info('Owner', 'Next owner')
        const start = new Date()

        let ret = null
        if (typeof owner.owner === 'function') {
          Log._warn(TAG, 'Owner.prototype.owner() is deprecated. Please rename owner() to nextOwner().')
          ret = await owner.owner()
        } else {
          ret = await owner.nextOwner()
        }

        // TODO: Check that the owner is a valid lock
        // if (!(owner instanceof Lock))

        if (Log._debugOn) Log._debug('Owner', 'Next owner (end): ' + (new Date() - start) + 'ms')
        return ret
      },

      async sign (rawtx, parents, locks) {
        if (Log._infoOn) Log._info('Owner', 'Sign')
        const start = new Date()

        const ret = await owner.sign(rawtx, parents, locks)

        if (Log._debugOn) Log._debug('Owner', 'Sign (end): ' + (new Date() - start) + 'ms')
        return ret
      }
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Wraps the purse object to log its usage
   */
  _purseAPI () {
    const purse = this._purse

    return {
      async pay (rawtx, parents) {
        if (Log._infoOn) Log._info('Purse', 'Pay')

        const start = new Date()

        const ret = await purse.pay(rawtx, parents)

        if (Log._debugOn) Log._debug('Purse', 'Pay (end): ' + (new Date() - start) + 'ms')

        return ret
      },

      async broadcast (rawtx) {
        if (typeof purse.broadcast === 'function') {
          if (Log._infoOn) Log._info('Purse', 'Broadcast')

          const start = new Date()

          const ret = await purse.broadcast(rawtx)

          if (Log._debugOn) Log._debug('Purse', 'Broadcast (end): ' + (new Date() - start) + 'ms')

          return ret
        }
      }
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Activates this kernel instance so its owner, blockchain, transaction queue and more are used.
   */
  _activate () {
    if (Kernel._instance === this) return
    if (Kernel._instance) Kernel._instance._deactivate()

    Kernel._instance = this
    bsv.Networks.defaultNetwork = bsv.Networks[_bsvNetwork(this._blockchainAPI().network)]

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
  _checkTrusted (txid, method) {
    const trusted = this._trustlist.has('*') || this._trustlist.has(txid) ||
      (method === 'cache' && this._trustlist.has('cache'))

    if (!trusted) {
      const hint = 'Hint: Trust this txid using run.trust(txid) if you know it is safe'
      throw new Error(`Cannot load untrusted code via ${method}: ${txid}\n\n${hint}`)
    }
  }
}

// ------------------------------------------------------------------------------------------------

// No kernel instance is active by default
Kernel._instance = null

// ------------------------------------------------------------------------------------------------

Kernel._EVENTS = EVENTS

module.exports = Kernel
