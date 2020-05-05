/**
 * api.js
 *
 * External APIs whose implementations may be plugged into the kernel.
 *
 * APIs should not implement consensus-critical logic. These are add-ons to the core.
 */

const Sandbox = require('../util/sandbox')
const { NotImplementedError } = require('../util/errors')

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
  get network () { throw new NotImplementedError() }

  /**
   * Submits a transaction to the network
   *
   * @param {bsv.Transaction} tx Transaction to broadcast
   */
  async broadcast (tx) { throw new NotImplementedError() }

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
  async fetch (txid, force) { throw new NotImplementedError() }

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
  async utxos (script) { throw new NotImplementedError() }

  /**
   * @returns {boolean} Whether instance is a valid implementation of Blockchain
   */
  static [Symbol.hasInstance] (instance) {
    if (typeof instance !== 'object' && typeof instance !== 'function') return false
    if (!instance) return false
    if (typeof instance.broadcast !== 'function') return false
    if (typeof instance.fetch !== 'function') return false
    if (typeof instance.utxos !== 'function') return false
    if (typeof instance.network !== 'string') return false
    return true
  }
}

// ------------------------------------------------------------------------------------------------
// Purse
// ------------------------------------------------------------------------------------------------

/**
 * The API the kernel uses to pay for transactions
 */
class Purse {
  /**
   * Adds inputs and outputs to pay for a transaction, and then signs the tx
   * @param {string} txhex Transaction to pay for in hex
   * @returns {string} Paid transaction in hex
   */
  async pay (txhex) { throw new NotImplementedError() }

  /**
   * Notification when a tx paid by the purse is broadcasted
   * @param {string} txhex Transaction to broadcast in hex
   */
  async broadcast (txhex) { throw new NotImplementedError() }

  /**
   * @returns {boolean} Whether instance is a valid implementation of Purse
   */
  static [Symbol.hasInstance] (instance) {
    if (typeof instance !== 'object' && typeof instance !== 'function') return false
    if (!instance) return false
    if (typeof instance.pay !== 'function') return false
    return true
  }
}

// ------------------------------------------------------------------------------------------------
// Owner
// ------------------------------------------------------------------------------------------------

/**
 * API used to sign transactions with particular locks
 */
class Owner {
  /**
   * Signs a transaction
   * @param {string} txhex Transaction to sign in hex
   * @param {Array<?Lock>} locks Locks for each input if they are resources
   * @returns {string} Signed transaction in hex
   */
  async sign (txhex, locks) { throw new NotImplementedError() }

  /**
   * Returns the owner value assigned to new resources.
   *
   * If an array, then the first owner will be used to create new resources.
   * @returns {string|Lock|Array<string|Lock>} Address, pubkey, or lock, or an array of them
   */
  owner () { throw new NotImplementedError() }

  /**
   * @returns {boolean} Whether instance is a valid implementation of Key
   */
  static [Symbol.hasInstance] (instance) {
    if (typeof instance !== 'object' && typeof instance !== 'function') return false
    if (!instance) return false
    if (typeof instance.sign !== 'function') return false
    if (typeof instance.owner !== 'function') return false
    return true
  }
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

  /**
   * @returns {boolean} Whether instance is a valid implementation of Logger
   */
  static [Symbol.hasInstance] (instance) {
    if (typeof instance !== 'object' && typeof instance !== 'function') return false
    if (!instance) return false
    return true
  }
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
  async get (location) { throw new NotImplementedError() }

  /**
   * Saves the state of a jig
   * @param {string} location Jig location to save
   * @param {object} state Known state
   */
  async set (location, state) { throw new NotImplementedError() }

  /**
   * @returns {boolean} Whether instance is a valid implementation of State
   */
  static [Symbol.hasInstance] (instance) {
    if (typeof instance !== 'object' && typeof instance !== 'function') return false
    if (!instance) return false
    if (typeof instance.get !== 'function') return false
    if (typeof instance.set !== 'function') return false
    return true
  }
}

// ------------------------------------------------------------------------------------------------
// Lock
// ------------------------------------------------------------------------------------------------

/**
 * An object that can be turned into a Bitcoin output script
 *
 * Locks may be assigned as owners on resources to give them non-standard ownership rules. They
 * may be created inside jigs, or passed as arguments to a method. For example:
 *
 *    token.send(new GroupLock(2, pubkeys))
 *
 * Therefore, locks must be serializable. That means no `bsv` library objects may be stored,
 * like bsv.Address, etc. Only simple types that you could save in a Jig.
 *
 * The script property should calculate the output script each time it is called from the
 * properties defined on the object. This lets other code depend on these properties and know
 * the output script is deterministically generated from them.
 */
class Lock {
  /**
   * Gets the locking script bytes
   * @returns {Uint8Array} Script bytes
   */
  get script () { throw new NotImplementedError() }

  /**
   * @returns {boolean} Whether instance is a valid implementation of Lock
   */
  static [Symbol.hasInstance] (instance) {
    if (typeof instance !== 'object' || !instance) return false

    // Make sure the script property is a getter
    const scriptDesc = Object.getOwnPropertyDescriptor(instance.constructor.prototype, 'script')
    if (!scriptDesc) return false
    if (typeof scriptDesc.get !== 'function') return false
    if (scriptDesc.set) return false

    // Make sure the script is not otherwise defined on the object
    if (Object.getOwnPropertyNames(instance).includes('script')) return false

    // Make sure the script returned is a Uint8Array
    const script = instance.script
    const SandboxUint8Array = Sandbox._instance._intrinsics.Uint8Array
    if (!(script instanceof Uint8Array || script instanceof SandboxUint8Array)) return false

    return true
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { Blockchain, Purse, Logger, State, Lock, Owner }
