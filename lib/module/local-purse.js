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
    this.bsvAddress = this.bsvPrivateKey.toAddress()
    this.address = this.bsvAddress.toString()
  }

  async pay (tx) {
    let utxos = await this.blockchain.utxos(this.address)

    if (!utxos.length) {
      // This isn't an error, because sometimes a transaction can be paid for
      // using BSV in backed jigs, and no purse outputs are needed.
      const suggestion = `Hint: Have you funded the purse address ${this.address}?`
      if (this.logger) this.logger.warn(`No purse utxos\n\n${suggestion}`)
    }

    // Shuffle the UTXOs so that when we start to add them, we don't always start in
    // the same order. This often reduces mempool chain limit errors.

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
    // inputs and outputs didn't change the fees, this is what we would pay. From there, we're
    // going to walk through our UTXOS. For each one, first we'll record out how many new outputs we
    // need, and then we'll add the necessary inputs. After we figure out how many inputs to add,
    // and how many outputs we'll have, we can calculate how big the outputs need to be, and
    // then add the outputs for real to the transaction.

    tx.feePerKb(this.feePerKb)

    const baseSatoshisRequired = Math.max(1000, tx._estimateFee() + tx._getOutputAmount())

    if (!baseSatoshisRequired) return tx

    let satoshisRequired = baseSatoshisRequired
    let satoshisAddedInUtxos = 0
    let satoshisSpentTotal = tx._getInputAmount()
    let numUtxosSpent = 0
    let numOutputsToCreate = 0

    for (const utxo of utxos) {
      tx.from(utxo)
      satoshisAddedInUtxos += utxo.satoshis
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
    if (satoshisSpentTotal <= satoshisRequired + 50) {
      const info = `Required ${satoshisRequired + 50} satoshis, ${satoshisSpentTotal} available in ${this.address}`
      throw new Error(`Not enough funds\n\n${info}`)
    }

    // The the number of splits is less than our current utxos, then we still need a change
    if (numOutputsToCreate < 1) numOutputsToCreate = 1

    // Add all the outputs
    const satoshisRequiredForFees = satoshisRequired - numOutputsToCreate * 546
    const satoshisPerOutput = Math.floor((satoshisAddedInUtxos - satoshisRequiredForFees) / numOutputsToCreate)
    for (let i = 0; i < numOutputsToCreate; i++) {
      if (i === numOutputsToCreate - 1) {
        tx.change(this.bsvAddress)
      } else {
        tx.to(this.bsvAddress, satoshisPerOutput)
      }
    }

    // TODO: Sign just the inputs we care about?
    tx.sign(this.bsvPrivateKey)

    return tx
  }

  async balance () {
    return (await this.utxos()).reduce((sum, utxo) => sum + utxo.satoshis, 0)
  }

  async utxos () {
    // TODO
    // const utxos = await this.blockchain.utxos(this.address)
    // const txns = await Promise.all(utxos.map(o => this.blockchain.fetch(o.txid)))
    // return utxos.filter((o, i) => util.outputType(txns[i], o.vout) === 'other')
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalPurse
