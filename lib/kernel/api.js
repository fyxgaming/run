/**
 * api.js
 *
 * External APIs whose implementations may be plugged into the kernel.
 *
 * APIs should not implement consensus-critical logic. These are add-ons to the core.
 */

// ------------------------------------------------------------------------------------------------
// Blockchain
// ------------------------------------------------------------------------------------------------

/**
 * The API the kernel uses to interface with the blockchain
 */
class Blockchain {
  /**
   * Friendly network string.
   *
   * This is usually one of 'main', 'test', 'stn', or 'mock', however it may be custom.
   * If the network starts with 'main', the Run library will use mainnet settings in the
   * `bsv` library. For all other values, Run will use testnet settings.
   * @returns {string} Network value
   */
  get network () { throw new Error('Not implemented') }

  /**
   * Submits a transaction to the network
   *
   * @param {bsv.Transaction} tx Transaction to broadcast
   */
  async broadcast (tx) { throw new Error('Not implemented') }

  /**
   * Queries the network for a transaction
   *
   * @param {string} txid Transaction ID hex string
   * @param {?boolean} force Whether to force-refresh and not use the cache. Default: false.
   * @returns {bsv.Transaction} Transaction with additional metadata if available:
   * - `time` {number} Time in milliseconds for acceptance into a block or mempool
   * - `confirmations` {number} Number of confirmations, 0 for mempool
   * - `blockhash` {string} Hash of block this tx was included in
   * - `blockheight` {string} Height of block this tx was included in
   * - `blocktime` {number} Time in milliseconds the block was published
   * - `outputs` {Array<{spentTxId, spentIndex, spentHeight}>} Output spend information`
   */
  async fetch (txid, force) { throw new Error('Not implemented') }

  /**
   * Queries the utxos for a particular output script
   *
   * Often times, implementations will index UTXOs by the script's hash, rather than the
   * original script, especially after Genesis, because script hashes are fixed in length. The
   * script hash is calculated via `sha256(script.toBuffer()).reverse().toString('hex')`. Run
   * also provides this as script.hash.
   *
   * We don't pass in a script hash though to support partial compatibility. Blockchain APIs
   * that only support querying for addresses may still be used as we can filter scripts.
   * @param {bsv.Script} script Locking script to query
   * @returns {Array<{txid, vout, script, satoshis}>} UTXOs if any
   */
  async utxos (script) { throw new Error('Not implemented') }
}

Blockchain.isBlockchain = blockchain => {
  if (typeof blockchain !== 'object' || !blockchain) return false
  if (typeof blockchain.broadcast !== 'function') return false
  if (typeof blockchain.fetch !== 'function') return false
  if (typeof blockchain.utxos !== 'function') return false
  if (typeof blockchain.network !== 'string') return false
  return true
}

// ------------------------------------------------------------------------------------------------
// Purse
// ------------------------------------------------------------------------------------------------

/**
 * The API the kernel uses to pay for transactions
 */
class Purse {
  /**
   * Adds inputs and outputs to pay for a transaction
   * @param {bsv.Transaction} tx Transaction to pay for
   * @returns {bsv.Transaction} Paid transaction
   */
  async pay (tx) { throw new Error('Not implemented') }
}

// ------------------------------------------------------------------------------------------------
// Logger
// ------------------------------------------------------------------------------------------------

/**
 * The API the kernel uses to log internal messages.
 *
 * This is a subset of `console`, and wherever logger is used, console may be used instead.
 */
class Logger {
  info (...args) { /* no-op */ }
  debug (...args) { /* no-op */ }
  warn (...args) { /* no-op */ }
  error (...args) { /* no-op */ }
}

// ------------------------------------------------------------------------------------------------
// State
// ------------------------------------------------------------------------------------------------

/**
 * API to save and provide jig states quickly.
 *
 * Jig states come in a special format and should not be created by hand. They are deterministic
 * and will not change for a given location.
 */
class State {
  /**
   * Gets the state of a jig if it exists
   *
   * If this is an LRU cache, get should also bump the jig to the front.
   * @param {string} location Jig location string
   * @returns State object previously given with set, or undefined if it's not available
   */
  async get (location) { throw new Error('Not implemented') }

  /**
   * Saves the state of a jig
   * @param {string} location Jig location to save
   * @param {object} state Known state
   */
  async set (location, state) { throw new Error('Not implemented') }
}

// ------------------------------------------------------------------------------------------------
// Lock
// ------------------------------------------------------------------------------------------------

/**
 * Typed locking script to own jigs
 *
 * This is passed into jigs, so all properties must be serializable by Run. `script` must also
 * be able to run inside a sandbox environment. That means no `bsv` library objects may be stored
 * or used to return `script`. However, they may be used to product the constructor.
 */
class Lock {
  /**
   * Gets the locking script
   *
   * @returns {Uint8Array} Script bytes
   */
  get script () { throw new Error('Not implemented') }
}

// ------------------------------------------------------------------------------------------------
// Key
// ------------------------------------------------------------------------------------------------

/**
 * API used to sign transactions for a particular lock
 */
class Key {
  /**
   * Locks that this key unlocks in order of priority
   *
   * The first lock is the default lock used to own jigs.
   * @returns {Array<Lock>} Array of supported locks
   */
  get locks () { throw new Error('Not implemented') }

  /**
   *
   * @param {bsv.Transaction} tx Transaction to unlock
   * @param {Array<?Lock>} locks Locks for each input if they are known
   */
  async unlock (tx, locks) {
    // Sign the sighash
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { Blockchain, Purse, Logger, State, Lock, Key }
