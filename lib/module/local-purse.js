/**
 * local-purse.js
 *
 * Default implementation of the Purse API
 */

const { PrivateKey } = require('bsv')
const { bsvNetwork } = require('../util')

// ------------------------------------------------------------------------------------------------
// Local Purse
// ------------------------------------------------------------------------------------------------

/**
 * Local wallet that implements the Purse API
 *
 * It will automatically split UTXOs to avoid the mempool chain limit. However, by design, it will
 * not consolidate UTXOs back together to lower the number of splits. That has to be done outside
 * of the purse. 'splits' should be thought of as minimum splits.
 */
class LocalPurse {
  /**
     * Creates a new LocalPurse
     * @param {object} options Purse configuration
     * @param {Blockchain} options.blockchain Blockchain API (required)
     * @param {string} options.privkey Private key string
     * @param {?Logger} options.logger Logger API. Default: null
     * @param {?number} options.splits Minimum number of UTXO splits. Default: 10.
     * @param {?feePerKb} options.feePerKb Transaction fee in satoshis per kilobyte. Default: 1000.
     */
  constructor (options = {}) {
    this.blockchain = options.blockchain
    this.logger = typeof options.logger !== 'undefined' ? options.logger : null
    this.splits = typeof options.splits !== 'undefined' ? options.splits : 10
    this.feePerKb = typeof options.feePerKb !== 'undefined' ? options.feePerKb : 1000
    this.bsvPrivateKey = new PrivateKey(options.privkey, bsvNetwork(this.blockchain.network))
    this.privkey = this.bsvPrivateKey.toString()
    this.address = this.bsvPrivateKey.toAddress().toString()
  }

  async pay (tx) {
    throw new Error('Not implemented')
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalPurse
