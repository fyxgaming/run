/**
 * local-purse.js
 *
 * Default implementation of the Purse API
 */

const bsv = require('bsv')
const { PrivateKey, Script, Transaction } = bsv
const { _bsvNetwork } = require('../util/misc')
const { _text } = require('../util/type')
const { _outputType } = require('../util/opreturn')
const Log = require('../util/log')
const { _generateSignature } = require('../util/bsv')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------

// Script: PUSH + SIG + PUSH + PUBKEY
const P2PKH_SIGSCRIPT_SIZE = 1 + 73 + 1 + 33

// Output: Satoshis + Varint + Script
// Script: OP_DUP + OP_HASH16 + PUSH + HASH + OP_EQUAL + OP_CHECKSIG
const P2PKH_OUTPUT_SIZE = 8 + 1 + 1 + 1 + 1 + 20 + 1 + 1

// Input: Outpoint + Push + Signature + Sequence
const P2PKH_INPUT_SIZE = 36 + 1 + P2PKH_SIGSCRIPT_SIZE + 4

// A default sigscript size when we don't know. Allows up to 3-3 multisig.
const DEFAULT_UNLOCK_SCRIPT_SIZE = 500

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
    this.bsvAddress = this.bsvPrivateKey.toAddress()
    this.bsvScript = Script.fromAddress(this.bsvAddress)

    this.privkey = this.bsvPrivateKey.toString()
    this.address = this.bsvAddress.toString()
    this.script = this.bsvScript.toHex()
  }

  get splits () { return this._splits }
  set splits (value) { this._splits = parseSplits(value) }

  get feePerKb () { return this._feePerKb }
  set feePerKb (value) { this._feePerKb = parseFeePerKb(value) }

  async pay (rawtx, parents) {
    const tx = new Transaction(rawtx)

    Log._info(TAG, 'Pay')

    // Set fees to our custom fee level
    tx.feePerKb(this.feePerKb)
    const _feeFactor = this.feePerKb / 1000.0

    // Populate previous outputs
    parents.forEach((parent, n) => {
      if (!parent) return

      tx.inputs[n].output = new Transaction.Output({
        satoshis: parent.satoshis,
        script: new Script(parent.script)
      })
    })

    // Populate placeholder unlock scripts
    tx.inputs.forEach(input => {
      if (!input.script.toBuffer().length) {
        input.setScript(bsv.deps.Buffer.alloc(DEFAULT_UNLOCK_SCRIPT_SIZE))
      }
    })

    // Get starting input and output amounts
    const inputAmountBefore = tx._getInputAmount()
    const outputAmountBefore = tx._getOutputAmount()

    // Check if we need to pay for anything. Sometimes, there's backed jigs.
    if (inputAmountBefore - outputAmountBefore >= tx.toBuffer().length * _feeFactor) {
      Log._debug(TAG, 'Transaction already paid for. Skipping.')

      // Collect change if leftover after fees is bigger than the tx fee + P2PKH_OUTPUT_SIZE
      const fee = Math.ceil((P2PKH_OUTPUT_SIZE + tx.toBuffer().length) * _feeFactor)
      if (inputAmountBefore - outputAmountBefore > 546 + fee) {
        tx._fee = fee // Fee estimation is not right inside change
        tx.change(this.bsvAddress)
      }

      return tx.toString('hex')
    }

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

    // We check UTXOs after we check if we need to even pay anything
    if (!utxos.length) {
      const suggestion = `Hint: Have you funded the purse address ${this.address}?`
      throw new Error(`Not enough funds\n\n${suggestion}`)
    }

    // Track how many inputs existed before, so we know which ones to sign
    const numInputsBefore = tx.inputs.length

    // Calculate fee required
    let feeRequired = tx.toBuffer().length * _feeFactor

    // The satoshisRequired is an amount that is updated for each UTXO added that
    // estimates an upper bound on the amount of satoshis we have left to add. As soon
    // as this goes to zero or negative, we are done.
    let satoshisRequired = feeRequired + outputAmountBefore - inputAmountBefore

    // The number of UTXOs we've added as inputs. This reduces our splits.
    let numUtxosSpent = 0

    // The number of outputs we will create after adding all UTXOs.
    // We always need at least one change output
    let numOutputsToCreate = 1
    feeRequired += P2PKH_OUTPUT_SIZE * _feeFactor
    satoshisRequired += P2PKH_OUTPUT_SIZE * _feeFactor
    satoshisRequired += 546 // There is a minimum dust required in each output

    // Walk through each UTXO and stop when we have enough
    for (const utxo of utxos) {
      // Check that our UTXO is not a jig output
      const prevTx = await this.blockchain.fetch(utxo.txid)
      if (_outputType(prevTx, utxo.vout) !== 'other') continue

      // Note: As soon as we call tx.from(), the placeholder signatures are cleared,
      // and tx._estimateFee() is no longer accurate.
      tx.from(utxo)
      satoshisRequired -= utxo.satoshis
      numUtxosSpent++
      feeRequired += P2PKH_INPUT_SIZE * _feeFactor
      satoshisRequired += P2PKH_INPUT_SIZE * _feeFactor

      const numOutputsToAdd = this.splits - utxos.length + numUtxosSpent - numOutputsToCreate
      for (let i = 0; i < numOutputsToAdd; i++) {
        feeRequired += P2PKH_OUTPUT_SIZE * _feeFactor
        satoshisRequired += P2PKH_OUTPUT_SIZE * _feeFactor
        satoshisRequired += 546 // There is a minimum dust required in each output
        numOutputsToCreate++
      }

      // As soon as we have enough satoshis, we're done. We can add the real outputs.
      if (satoshisRequired < 0) break
    }
    feeRequired = Math.ceil(feeRequired)
    satoshisRequired = Math.ceil(satoshisRequired)

    // Check that we didn't run out of UTXOs
    if (satoshisRequired > 0) {
      const info = `Required ${satoshisRequired} more satoshis`
      throw new Error(`Not enough funds\n\n${info}`)
    }

    // Calculate how much satoshis we have to distribute among out change and split outputs
    // We subtract 546 for each output, because that dust was added as a minimum above, and
    // isn't the real amount that goes into each output.
    const satoshisLeftover = -satoshisRequired - numOutputsToCreate * 546
    const satoshisPerOutput = Math.ceil(satoshisLeftover / numOutputsToCreate)
    for (let i = 0; i < numOutputsToCreate; i++) {
      if (i === numOutputsToCreate - 1) {
        tx._fee = feeRequired
        tx.change(this.bsvAddress)
      } else {
        tx.to(this.bsvAddress, satoshisPerOutput)
      }
    }

    // Sign the new inputs
    for (let i = numInputsBefore; i < tx.inputs.length; i++) {
      const prevout = tx.inputs[i].output
      const sig = _generateSignature(tx, i, prevout.script, prevout.satoshis, this.bsvPrivateKey)
      const pubkey = this.bsvPrivateKey.publicKey.toString()
      const script = Script.fromASM(`${sig} ${pubkey}`)
      tx.inputs[i].setScript(script)
    }

    // Log what we paid
    const spent = tx._getInputAmount() - inputAmountBefore
    const received = tx._getOutputAmount() - outputAmountBefore
    const paid = spent - received
    Log._debug(TAG, 'Paid about', paid, 'satoshis')

    return tx.toString('hex')
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
  throw new Error(`Invalid blockchain: ${_text(blockchain)}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalPurse
