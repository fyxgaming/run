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
   * @param {string} tx Transaction to broadcast in serialized hex format
   */
  async broadcast (rawtx) { throw new NotImplementedError() }

  /**
   * Queries the network for a transaction
   *
   * @param {string} txid Transaction ID hex string
   * @param {?boolean} force Whether to force-refresh and not use the cache. Default: false.
   * @returns {bsv.Transaction} Transaction with additional metadata if available:
   * - `time` {number} Time in milliseconds for acceptance into a block or mempool
   * - `outputs` {Array<{spentTxId, spentIndex}>} Output spend information`
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
   * @returns {Array<{txid: string, vout: number, script: bsv.Script, satoshis: number}>} UTXOs
   */
  async utxos (script) { throw new NotImplementedError() }

  /**
   * Gets the time that a transaction was confirmed or received by a node
   * @param {string} txid Transaction ID to check
   * @returns {string} Transaction time in milliseconds since the unix epoch
   */
  async time(txid) { throw new NotImplementedError() }

  /**
   * Gets the time that a transaction was confirmed or received by a node in unix time milliseconds
   * @param {string} txid Transaction ID to check
   * @returns {?string} Spending transaction ID or null if unspent
   */
  async spend(txid) { throw new NotImplementedError() }

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
   * Adds inputs and outputs to pay for a transaction, and then signs the tx.
   *
   * The partial transaction passed will likely not be acceptable to miners. It will not have
   * enough fees, and the unlocking scripts for jigs will be placeholders until the tx is signed.
   *
   * @param {string} rawtx Transaction to sign in serialized hex format
   * @param {Array<{satoshis: number, script: string}>} parents Array of spent UTXOs spent in this
   *    transaction mapped 1-1 with the inputs
   * @returns {string} Paid transaction in raw hex format
   */
  async pay (rawtx, parents) { throw new NotImplementedError() }

  /**
   * Notification when a tx paid by the purse is broadcasted
   * @param {string} rawtx Transaction to broadcast in serialized hex
   */
  async broadcast (rawtx) { throw new NotImplementedError() }

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
   * Signs the jig inputs of a transaction.
   *
   * The first two parameters are useful for reconstructing the transaction, and the third may
   * be used to determine which inputs to sign.
   *
   * @param {string} rawtx Transaction to sign in serialized hex format
   * @param {Array<?{satoshis: number, script: string}>} parents Array of UTXOs spent in this
   *    transaction mapped 1-1 with the inputs. If a UTXO is undefined, then Run doesn't know
   *    about this input and/or it is not relevant to the method.
   * @param {Array<?Lock>} locks Array of jig owners. Each jig input will have a lock in this
   *    array. Each lock is essentially a higher-level representation of the script.
   * @returns {string} Signed transaction in raw hex format
   */
  async sign (rawtx, parents, locks) { throw new NotImplementedError() }

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
  script () { throw new NotImplementedError() }

  /**
   * Gets an upper bound on the unlocking script size, for calculating purse fees.
   * @returns {number} Maximum unlocking script size in bytes
   */
  domain () { throw new NotImplementedError() }

  /**
   * @returns {boolean} Whether instance is a valid implementation of Lock
   */
  static [Symbol.hasInstance] (instance) {
    if (typeof instance !== 'object' || !instance) return false

    // Make sure script is a function
    if (typeof instance.constructor.prototype.script !== 'function') return false

    // Make sure the script is not otherwise defined on the object
    if (Object.getOwnPropertyNames(instance).includes('script')) return false

    // Make sure the script returned is a Uint8Array
    const script = instance.script()
    const SandboxUint8Array = Sandbox._instance._intrinsics.Uint8Array
    if (!(script instanceof Uint8Array || script instanceof SandboxUint8Array)) return false

    // Make sure domain is a function or undefined
    const domain = instance.constructor.prototype.domain
    if (typeof domain !== 'function') return false

    // Make sure domain is not otherwise defined on the object
    if (Object.getOwnPropertyNames(instance).includes('domain')) return false

    // Make sure domain returns a non-negative integer
    if (domain) {
      if (!Number.isSafeInteger(instance.domain())) return false
      if (instance.domain() < 0) return false
    }

    return true
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { Blockchain, Purse, Logger, State, Lock, Owner }
