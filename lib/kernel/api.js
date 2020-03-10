/**
 * api.js
 *
 * External APIs whose implementations may be plugged into the kernel.
 *
 * APIs should not implement consensus-critical logic. They are add-ons to the core.
 */

// ------------------------------------------------------------------------------------------------
// Blockchain
// ------------------------------------------------------------------------------------------------

/**
 * The API the kernel uses to interface with the blockchain
 */
class Blockchain {
  /**
   * @returns {string} Network string, one of 'main', 'test', 'stn', or 'mock'
   */
  get network () {
    throw new Error('Not implemented')
  }

  /**
   * Submits a transaction to the network
   *
   * @param {bsv.Transaction} tx Transaction to broadcast
   */
  async broadcast (tx) {
    throw new Error('Not implemented')
  }

  /**
   * Queries the network for a transaction
   *
   * @param {string} txid Transaction ID hex string
   * @param {?boolean} force Whether to force-refresh and never use the cache. Default is false.
   *
   * @returns {bsv.Transaction} Transaction with the additional metadata if available:
   * - `time` {number} Time in milliseconds for acceptance into a block or mempool
   * - `confirmations` {number} Number of confirmations, 0 for mempool
   * - `blockhash` {string} Hash of block this tx was included in
   * - `blockheight` {string} Height of block this tx was included in
   * - `blocktime` {number} Time in milliseconds the block was published
   * - `outputs` {Array<{spentTxId, spentIndex, spentHeight}>} Output spend information`
   */
  async fetch (txid, force) {
    throw new Error('Not implemented')
  }

  /**
   * Queries the utxos for a particular output script
   *
   * @param {string} scriptHash Script hash in hex
   *
   * @returns {Array<{txid, vout, script, satoshis}>} UTXOs if any
   */
  async utxos (scriptHash) {
    throw new Error('Not implemented')
  }
}

// ------------------------------------------------------------------------------------------------
// Evaluator
// ------------------------------------------------------------------------------------------------

/**
 * The API the kernel uses to evaluate code.
 *
 * An evaluator takes a source code string and a set of dependencies and executes the code. This
 * usually producing a live object that may be used. Think eval() but with dependencies. The
 * built-in intrinsics should be the same across evaluations.
 */
class Evaluator {
  /**
   * Executes the code in the given environment.
   *
   * The properties in environment should be in scope for the code. The last statement's value
   * should also be returned to the user. This method is like Node's vm.evaluate().
   *
   * @param {string} code Source code string
   * @param {?object} environment Objects in scope
   *
   * @returns {{result, globals}} The final statement's result and a configurable globals object
   */
  evaluate (code, environment = {}) {
    throw new Error('Not implemented')
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
   * Adds signed inputs and additional outputs to pay for a transaction
   *
   * @param {bsv.Transaction} tx Transaction to pay for
   *
   * @returns {bsv.Transaction} Paid transaction
   */
  async pay (tx) {
    throw new Error('Not implemented')
  }
}

// ------------------------------------------------------------------------------------------------
// Owner
// ------------------------------------------------------------------------------------------------

/**
 * The API the kernel uses to identify and sign pickups
 */
class Owner {
  /**
   * Returns the hash of the owner script.
   *
   * This is used to create new pickups and identify existing ones
   *
   * @returns {string} Script hash in hex
   */
  getScriptHash () {
    throw new Error('Not implemented')
  }

  /**
   * Signs pickup inputs of a run transaction
   *
   * On a server, this method might load the tx and see what being signed.
   *
   * @param {bsv.Transaction} tx Transaction to sign
   *
   * @returns {bsv.Transaction} Signed transaction
   */
  async sign (tx) {
    throw new Error('Not implemented')
  }
}

// ------------------------------------------------------------------------------------------------
// State
// ------------------------------------------------------------------------------------------------

/**
 * The API the kernel uses to save and load the state of pickups instantly.
 *
 * Pickup states are specially formatted by the kernel and should not be created by hand. They are,
 * however, deterministic and will not change for a given location. All types of pickups may
 * be stored using the state API.
 */
class State {
  /**
   * Gets the known state of a pickup if it exists
   *
   * @param {string} location Pickup location string
   *
   * @returns {?object} The pickup state or undefined if unavailable
   */
  async get (location) {
    throw new Error('Not implemented')
  }

  /**
   * Saves the known state of a pickup
   *
   * @param {string} location Pickup location
   * @param {object} state Pickup state at the location
   */
  async set (location, state) {
    throw new Error('Not implemented')
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { Blockchain, Evaluator, Purse, Owner, State }
