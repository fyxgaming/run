/**
 * local-purse.js
 *
 * Default implementation of the Purse API
 */

const { PrivateKey, Script } = require('bsv')
const { _bsvNetwork, _display } = require('../util/misc')
const { _outputType } = require('../util/opreturn')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Local Purse
// ------------------------------------------------------------------------------------------------

const TAG = 'LocalPurse'

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
   * @param {?number} options.splits Minimum number of UTXO splits. Default: 10.
   * @param {?feePerKb} options.feePerKb Transaction fee in satoshis per kilobyte. Default: 1000.
   */
  constructor (options = {}) {
    this.blockchain = parseBlockchain(options.blockchain)
    this._splits = parseSplits(options.splits)
    this._feePerKb = parseFeePerKb(options.feePerKb)
    this.bsvPrivateKey = new PrivateKey(options.privkey, _bsvNetwork(this.blockchain.network))
    this.privkey = this.bsvPrivateKey.toString()
    this.bsvAddress = this.bsvPrivateKey.toAddress()
    this.address = this.bsvAddress.toString()
    this.script = Script.fromAddress(this.bsvAddress)
  }

  get splits () { return this._splits }
  set splits (value) { this._splits = parseSplits(value) }

  get feePerKb () { return this._feePerKb }
  set feePerKb (value) { this._feePerKb = parseFeePerKb(value) }

  async pay (tx) {
    Log._info(TAG, 'Paying for', tx.hash)

    // Some of these UTXOs may not be purse outputs. We filter below.
    let utxos = await this.blockchain.utxos(this.script)

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
    const _feeFactor = this.feePerKb / 1000.0

    const baseSatoshisRequired = Math.max(500, tx._estimateFee() + tx._getOutputAmount())

    if (!baseSatoshisRequired) return tx

    if (!utxos.length) {
      // This isn't an error, because sometimes a transaction can be paid for
      // using BSV in backed jigs, and no purse outputs are needed.
      const suggestion = `Hint: Have you funded the purse address ${this.address}?`
      throw new Error(`Not enough funds\n\n${suggestion}`)
    }

    let satoshisRequired = baseSatoshisRequired
    let satoshisAddedInUtxos = 0
    const satoshisSpentBefore = tx._getInputAmount()
    const satoshisReceivedBefore = tx._getOutputAmount()
    let satoshisSpentTotal = tx._getInputAmount()
    let numUtxosSpent = 0
    let numOutputsToCreate = 0

    for (const utxo of utxos) {
      const prevTx = await this.blockchain.fetch(utxo.txid)
      if (_outputType(prevTx, utxo.vout) !== 'other') continue

      tx.from(utxo)
      satoshisAddedInUtxos += utxo.satoshis
      satoshisSpentTotal += utxo.satoshis
      numUtxosSpent += 1
      satoshisRequired += Math.floor(150 * _feeFactor) // 150 bytes per P2PKH input seems to be average

      const numOutputsToAdd = this.splits - utxos.length + numUtxosSpent - numOutputsToCreate
      for (let i = 0; i < numOutputsToAdd; i++) {
        satoshisRequired += Math.floor(40 * _feeFactor) // 40 bytes per P2PKH output seems to be average
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

    const spent = tx._getInputAmount() - satoshisSpentBefore
    const received = tx._getOutputAmount() - satoshisReceivedBefore
    const paid = spent - received
    Log._debug(TAG, 'Paid about', paid + 50, 'satoshis,', tx.getFee(), 'in fees')

    return tx
  }

  async balance () {
    return (await this.utxos()).reduce((sum, utxo) => sum + utxo.satoshis, 0)
  }

  async utxos () {
    const utxos = await this.blockchain.utxos(this.script)
    const txns = await Promise.all(utxos.map(o => this.blockchain.fetch(o.txid)))
    return utxos.filter((o, i) => _outputType(txns[i], o.vout) === 'other')
  }
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseSplits (splits) {
  switch (typeof splits) {
    case 'number':
      if (!Number.isInteger(splits)) throw new Error(`splits must be an integer: ${splits}`)
      if (splits <= 0) throw new Error(`splits must be at least 1: ${splits}`)
      return splits
    case 'undefined':
      // The defaults to 10 because with the mempool chain limit being 25,
      // and 10 splits to choose from, this creates a binomial distribution
      // where we would expect not to hit this limit 98.7% of the time after 120
      // transaction. This would support one transaction every 5 seconds on average.
      return 10
    default: throw new Error(`Invalid splits: ${splits}`)
  }
}

function parseFeePerKb (feePerKb) {
  switch (typeof feePerKb) {
    case 'number':
      if (!Number.isFinite(feePerKb)) throw new Error(`feePerKb must be finite: ${feePerKb}`)
      if (feePerKb < 0) throw new Error(`feePerKb must be non-negative: ${feePerKb}`)
      return feePerKb
    case 'undefined':
      // Current safe fees are 0.5 sat per byte, even though many miners are accepting 0.25
      return 500
    default: throw new Error(`Invalid feePerKb: ${feePerKb}`)
  }
}

function parseBlockchain (blockchain) {
  switch (typeof blockchain) {
    case 'undefined': throw new Error('blockchain is required')
    case 'object': if (blockchain && blockchain.network) return blockchain; break
  }
  throw new Error(`Invalid blockchain: ${_display(blockchain)}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalPurse
