/**
 * api.js
 *
 * External APIs whose implementations may be plugged into the kernel.
 *
 * APIs should not implement consensus-critical logic. These are add-ons to the core.
 */

const { UnimplementedError } = require('../util/errors')

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
   * This is usually one of 'main', 'test', 'stn', or 'mock', however it may be any value.
   * If the network starts with 'main', the Run library will use mainnet settings whenever it
   * matters. For all other networks, Run will use testnet settings.
   *
   * @returns {string} Network string
   */
  get network () { throw new UnimplementedError() }

  /**
   * Submits a transaction to the network
   *
   * @param {string} rawtx Transaction in hex format
   * @returns {string} Transaction ID in hex format
   */
  async broadcast (rawtx) { throw new UnimplementedError() }

  /**
   * Queries the network for a transaction
   *
   * @param {string} txid Transaction ID
   * @returns {string} Transaction in hex format
   */
  async fetch (txid) { throw new UnimplementedError() }

  /**
   * Queries the utxos for a particular output script
   *
   * Often times, implementations will index UTXOs by the script's hash, rather than the
   * original script, especially after Genesis, because script hashes are fixed in length. The
   * script hash is calculated via
   *
   *    sha256(new Script(script).toBuffer()).reverse().toString('hex')
   *
   * We don't pass in a script hash though to support partial compatibility. Blockchain APIs
   * that only support querying for addresses may still be used when we can parse the script.
   *
   * @param {string} script Locking script to query in hex
   * @returns {Array<{txid: string, vout: number, script: string, satoshis: number}>} UTXOs
   */
  async utxos (script) { throw new UnimplementedError() }

  /**
   * Gets the time that a transaction was confirmed or received by a node
   *
   * @param {string} txid Transaction ID to check
   * @returns {number} Transaction time in milliseconds since the unix epoch
   */
  async time (txid) { throw new UnimplementedError() }

  /**
   * Gets the transaction that spends the output passed
   *
   * @param {string} txid Transaction ID
   * @param {number} vout Output index
   * @returns {?string} Spending transaction ID, or null if unspent
   */
  async spends (txid, vout) { throw new UnimplementedError() }

  /**
   * @returns {boolean} Whether instance is a valid implementation of Blockchain
   */
  static [Symbol.hasInstance] (instance) {
    if (typeof instance !== 'object' && typeof instance !== 'function') return false
    if (!instance) return false
    if (typeof instance.network !== 'string') return false
    if (typeof instance.broadcast !== 'function') return false
    if (typeof instance.fetch !== 'function') return false
    if (typeof instance.utxos !== 'function') return false
    if (typeof instance.time !== 'function') return false
    if (typeof instance.spends !== 'function') return false
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
  async pay (rawtx, parents) { throw new UnimplementedError() }

  /**
   * Notification when a tx paid by the purse is broadcasted
   * @param {string} rawtx Transaction to broadcast in serialized hex
   */
  async broadcast (rawtx) { throw new UnimplementedError() }

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
  async sign (rawtx, parents, locks) { throw new UnimplementedError() }

  /**
   * Returns the next owner value assigned to new jigs.
   *
   * If an array, then the first owner will be used to create new jigs.
   * @returns {string|Lock|Array<string|Lock>} Address, pubkey, or lock, or an array of them
   */
  async nextOwner () { throw new UnimplementedError() }

  /**
   * @returns {boolean} Whether instance is a valid implementation of Key
   */
  static [Symbol.hasInstance] (instance) {
    if (typeof instance !== 'object' && typeof instance !== 'function') return false
    if (!instance) return false
    if (typeof instance.sign !== 'function') return false
    // owner() is deprecated but we still support it in 0.6
    if (typeof instance.nextOwner !== 'function' &&
      typeof instance.owner !== 'function') return false
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
// Cache
// ------------------------------------------------------------------------------------------------

/**
 * API to save jig state, transactions, and other data.
 *
 * A given value should not change once written. This cache is for immutable data only.
 *
 * Keys are specially formatted with a prefix:
 *
 *      tx://<txid>               transaction
 *      time://<txid>             transaction time
 *      spend://<location>        spending transaction id
 *      jig://<location>          jig state at a particular location
 *
 * All values are JSON-serializable. However, they should not be modified or created by hand.
 */
class Cache {
  /**
   * Gets an entry from the cache
   *
   * If this is an LRU cache, get() should also bump the key to the front.
   *
   * @param {string} key Key string
   * @returns JSON-serializable value, or undefined if it does not exist
   */
  async get (key) { throw new UnimplementedError() }

  /**
   * Saves an entry into the cache
   *
   * @param {string} key Jig location to save
   * @param {object} value JSON-serializable value
   */
  async set (key, value) { throw new UnimplementedError() }

  /**
   * @returns {boolean} Whether instance is a valid implementation of Cache
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
 * Locks may be assigned as owners on jigs to give them non-standard ownership rules. They
 * may be created inside jigs, or passed as arguments to a method. For example:
 *
 *    token.send(new Group(2, pubkeys))
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
   * Gets the locking script hex
   * @returns {string} Script hex
   */
  script () { throw new UnimplementedError() }

  /**
   * Gets an upper bound on the unlocking script size, for calculating purse fees.
   * @returns {number} Maximum unlocking script size in bytes
   */
  domain () { throw new UnimplementedError() }

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
    const Hex = require('../extra/hex')
    try { Hex.stringToBytes(script) } catch (e) { return false }

    // Make sure domain is a function or undefined
    const domain = instance.constructor.prototype.domain
    if (typeof domain !== 'function') return false

    // Make sure domain is not otherwise defined on the object
    if (Object.getOwnPropertyNames(instance).includes('domain')) return false

    // Make sure domain returns a non-negative integer
    if (!Number.isSafeInteger(instance.domain())) return false
    if (instance.domain() < 0) return false

    return true
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { Blockchain, Purse, Logger, Cache, Lock, Owner }
