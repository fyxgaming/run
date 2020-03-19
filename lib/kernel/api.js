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
   * This is usually one of 'main', 'test', 'stn', or 'mock', however it may be other values as
   * well. If the network starts with 'main', the Run library will use mainnet settings in the
   * `bsv` library. For all other network values, Run will use testnet settings.
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
   * @param {?boolean} force Whether to force-refresh and never use the cache. Default is false.
   * @returns {bsv.Transaction} Transaction with this additional metadata if available:
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
   * @param {string} scriptHash Script hash in hex
   * @returns {Array<{txid, vout, script, satoshis}>} UTXOs if any
   */
  async utxos (scriptHash) { throw new Error('Not implemented') }
}

// ------------------------------------------------------------------------------------------------

module.exports = { Blockchain }
