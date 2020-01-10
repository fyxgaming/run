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
    this.bsvPrivateKey = new bsv.PrivateKey(options.privkey, bsvNetwork)
    this.privkey = this.bsvPrivateKey.toString()
    this.bsvAddress = this.bsvPrivateKey.toAddress()
    this.address = this.bsvAddress.toString()
    this.blockchain = options.blockchain
    this.logger = options.logger

    // splits defaults to 10 because with the mempool chain limit being 25,
    // and 10 splits to choose from, this creates a binomial distribution
    // where we would expect not to hit this limit 98.7% of the time after 120
    // transaction. This would support one transaction every 5 seconds on average.
    this.splits = typeof options.splits === 'undefined' ? 10 : options.splits

    // Current fees are 1 sat per byte, but miners are lowering to 0.5 sat/byte.
    // We should consider lowering this to 0.5 sat/byte soon.
    this.feePerKb = 1000
  }

  async pay (tx) {
    let utxos = await this.blockchain.utxos(this.address)

    if (!utxos.length) {
      const suggestion = `Hint: Have you funded the purse address ${this.address}?`
      if (this.logger) this.logger.warn(`No purse utxos\n\n${suggestion}`)
      return tx
    }

    function shuffle (a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }
    utxos = shuffle(utxos)

    // We're going to calculate how many inputs and outputs we need. This is tricky, because
    // every additional input and output affects the fees required. We also want to split our
    // UTXOs, and calculating the amount to split is tricky. To do this, we're going to start
    // with a base satoshi amount we need to add inputs for, the baseSatoshisRequired. If adding
    // inputs and outputs didn't change the fees, this is what we would pay. But from there, we're
    // going to walk through our UTXOS. For each one, first we'll fill out how many new UTXOS we
    // need, and then we'll add the necessary inputs. We are just planning at this point. After
    // we figure out how many inputs to add, we can calculate how big the outputs need to be, and
    // then add them all for real.
    const baseSatoshisRequired = Math.max(1000, tx._estimateFee() + tx._getOutputAmount())

    let satoshisRequired = baseSatoshisRequired
    let satoshisSpentUtxos = 0
    let satoshisSpentTotal = tx._getInputAmount()
    let numUtxosSpent = 0
    let numOutputsToCreate = 0

    for (const utxo of utxos) {
      tx.from(utxo)
      satoshisSpentUtxos += utxo.satoshis
      satoshisSpentTotal += utxo.satoshis
      numUtxosSpent += 1
      satoshisRequired += 150 // 150 bytes per P2PKH input seems to be average

      const numOutputsToAdd = this.splits - utxos.length + numUtxosSpent - numOutputsToCreate
      for (let i = 0; i < numOutputsToAdd; i++) {
        satoshisRequired += 40 // 40 bytes per P2PKH output seems to be average
        satoshisRequired += 546 // We also have to add the dust amounts
        numOutputsToCreate += 1
      }

      if (satoshisSpentTotal > satoshisRequired + 50) break // Add a 50 sat buffer
    }

    // Make sure we have enough utxos
    if (satoshisSpentTotal <= satoshisRequired + 50) throw new Error('Not enough funds')

    // Add all the outputs
    const satoshisRequiredForFees = satoshisRequired - numOutputsToCreate * 546
    const satoshisPerOutput = Math.floor((satoshisSpentUtxos - satoshisRequiredForFees) / numOutputsToCreate)
    for (let i = 0; i < numOutputsToCreate; i++) {
      if (i === numOutputsToCreate - 1) {
        tx.change(this.bsvAddress)
      } else {
        tx.to(this.bsvAddress, satoshisPerOutput)
      }
    }

    tx.sign(this.bsvPrivateKey)

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
