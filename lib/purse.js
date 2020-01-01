/**
 * purse.js
 *
 * Generic Pay API and default Purse implementation to pay for transactions
 */

const bsv = require('bsv')
const util = require('./util')

/**
 * API to pay for transactions
 */
class Pay {
  /**
   * Adds inputs and outputs to pay for a transaction
   * @param {bsv.Transaction} tx Transaction to pay for
   * @returns {bsv.Transaction} Paid transaction
   */
  async pay (tx) {
    throw new Error('not implemented')
  }
}

/**
 * Local wallet that implements the Pay API
 */
class Purse {
  constructor (options = {}) {
    if (typeof options.blockchain === 'undefined') throw new Error('purse blockchain option must be defined')

    const bsvNetwork = util.bsvNetwork(options.blockchain.network)
    this.privkey = new bsv.PrivateKey(options.privkey, bsvNetwork)
    this.address = this.privkey.toAddress()
    this.blockchain = options.blockchain
    this.logger = options.logger

    // splits defaults to 10 because with the mempool chain limit being 25,
    // and 10 splits to choose from, this creates a binomial distribution
    // where we would expect not to hit this limit 98.7% of the time after 120
    // transaction. This would support one transaction every 5 seconds on average.
    this.splits = typeof options.splits === 'undefined' ? 10 : options.splits
  }

  async pay (tx) {
    let utxos = await this.blockchain.utxos(this.address)

    if (!utxos.length) {
      const suggestion = `Hint: Have you funded the purse address ${this.address}?`
      if (this.logger) this.logger.warn(`No purse utxos\n\n${suggestion}`)
      return tx
    }

    // split the utxos if necessary
    if (utxos.length < this.splits) {
      if (this.logger) this.logger.info(`Splitting purse utxos into ${this.splits} pieces`)

      const balance = utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)
      const tx = new bsv.Transaction().from(utxos)
      for (let i = 0; i < this.splits - 1; i++) {
        tx.to(this.address, Math.floor(balance / this.splits))
      }
      tx.change(this.address)
      tx.sign(this.privkey)
      await this.blockchain.broadcast(tx)
      utxos = await this.blockchain.utxos(this.address)
    }

    // randomly order utxos for the purse
    function shuffle (a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }
    utxos = shuffle(utxos)

    const satoshisRequired = () => {
      if (tx.isFullySigned()) return tx.toBuffer().length
      return Math.max(1000, tx._estimateFee() + tx._getOutputAmount())
    }

    // gather utxos to pay for the transaction
    for (const utxo of utxos) {
      if (tx._getInputAmount() >= satoshisRequired()) break
      const txIn = await this.blockchain.fetch(utxo.txid)
      if (util.outputType(txIn, utxo.vout) !== 'other') {
        // TODO: Log warning about purse containing jigs
        continue
      }
      tx.from(utxo)
    }

    // make sure we actually have enough inputs
    if (tx._getInputAmount() < satoshisRequired()) throw new Error('not enough funds')

    // return change to the purse and sign
    tx.change(this.address)
    tx.sign(this.privkey)

    return tx
  }

  async balance () {
    return (await this.utxos()).reduce((sum, utxo) => sum + utxo.satoshis, 0)
  }

  async utxos () {
    const utxos = await this.blockchain.utxos(this.address)
    const txns = await Promise.all(utxos.map(o => this.blockchain.fetch(o.txid)))
    return utxos.filter((o, i) => util.outputType(txns[i], o.vout) === 'other')
  }
}

module.exports = { Pay, Purse }
