/**
 * local-purse.js
 *
 * Default implementation of the Purse API
 */

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
  constructor (options = {}) {
    this.logger = options.logger
    /*
    this.blockchain = parseBlockchain(options.blockchain)
    this._splits = parseSplits(options.splits)
    this._feePerKb = parseFeePerKb(options.feePerKb)

    const bsvNetwork = util.bsvNetwork(this.blockchain.network)
    this.bsvPrivateKey = new bsv.PrivateKey(options.privkey, bsvNetwork)
    this.privkey = this.bsvPrivateKey.toString()
    this.bsvAddress = this.bsvPrivateKey.toAddress()
    this.address = this.bsvAddress.toString()
    */
  }

  static makeRandom () {
    return new LocalPurse()
  }

  async pay (tx) {
    throw new Error('Not implemented')
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalPurse
