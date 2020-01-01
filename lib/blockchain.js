/**
 * blockchain.js
 *
 * Generic Blockchain API that runs uses to talk to the network
 */

/**
 * Standard API to interact with the Bitcoin network
 */
module.exports = class Blockchain {
  /**
   * Creates a blockchain API for a given network
   * @param {string} network 'main', 'test', 'stn', or 'mock'
   */
  constructor (network) {
    if (network !== 'main' && network !== 'test' && network !== 'stn' && network !== 'mock') {
      throw new Error(`Unknown network: ${network}`)
    }
    this.network = network
  }

  /**
   * Submits a transaction to the network
   * @param {bsv.Transaction} tx Transaction to broadcast
   */
  async broadcast (tx) {
    throw new Error('not implemented')
  }

  /**
   * Returns the transaction for a given txid.
   *
   * Additional metadata set on the transaction when available:
   * - `time` {number} Time in milliseconds for acceptance into a block or mempool
   * - `confirmations` {number} Number of confirmations, 0 for mempool
   * - `blockhash` {string} Hash of block this tx was included in
   * - `blockheight` {string} Height of block this tx was included in
   * - `blocktime` {number} Time in milliseconds the block was published
   * - `vout` {Array<{spentTxId, spentIndex, spentHeight}>} Output spend information`
   * @param {string} txid Id of transaction to fetch
   * @param {boolean} refresh Whether to force-refresh the transaction, and never use the cache.
   * @returns {bsv.Transaction} bsv.Transaction with additional metadata
   */
  async fetch (txid, refresh) {
    throw new Error('not implemented')
  }

  /**
   * Returns the utxos for an address
   * @param {Address|string} address
   * @returns {Array<{txid, vout, script, satoshis}>}
   */
  async utxos (address) {
    throw new Error('not implemented')
  }
}
