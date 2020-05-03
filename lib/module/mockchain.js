/**
 * mockchain.js
 *
 * In-memory Blockchain implementation
 */

const bsv = require('bsv')
const { Address, Transaction, Script } = bsv
const Log = require('../util/log')
const { _populatePreviousOutputs, _scriptHash } = require('../util/bsv')
const { sha256 } = bsv.crypto.Hash

// ------------------------------------------------------------------------------------------------
// Mockchain
// ------------------------------------------------------------------------------------------------

const TAG = 'Mockchain'

/**
 * An in-memory blockchain implementation.
 *
 * It simulates the mempool and blocks, keeps a UTXO index, checks the mempool chain limit, and
 * generally attempts to create errors that are similar to a real network node or service.
 */
class Mockchain {
  constructor () {
    this.network = 'mock'
    this._height = -1
    this._transactions = new Map() // txid -> Transaction
    this._utxosByLocation = new Map() // Map<txid_oN, utxo>
    this._utxosByScriptHash = new Map() // scriptHash -> Set<location>
    this._mempool = new Set() // Set<Transaction>
    this._mempoolSpends = new Set() // Set<txid_oN>
    this._mempoolChainLimit = 25
  }

  async broadcast (tx) {
    Log._debug(TAG, 'Broadcast', tx.hash)

    // Populate previous outputs. We need this for script verification.
    await _populatePreviousOutputs(tx, this)

    // Lock the tx both to improve performance and because caching assumes it doesn't change
    if (tx.lock) tx.lock()

    // Basic transaction checks
    if (tx.inputs.length === 0) throw new Error('tx has no inputs')
    if (tx.outputs.length === 0) throw new Error('tx has no outputs')
    if (tx.getFee() < tx.toBuffer().length * Transaction.FEE_PER_KB / 1000) throw new Error('tx fee too low')
    if (tx.verify() !== true) throw new Error(tx.verify())

    // Check that each input exists and is not spent
    const _spentLocations = new Set()
    tx.inputs.forEach((input, vin) => {
      const location = `${input.prevTxId.toString('hex')}_o${input.outputIndex}`
      if (!this._utxosByLocation.has(location)) {
        throw new Error(this._mempoolSpends.has(location) ? 'txn-mempool-conflict' : 'Missing inputs')
      }
      if (_spentLocations.has(location)) throw new Error(`already spent input ${vin}`)
      _spentLocations.add(location)
    })

    // Check signatures
    if (tx.isFullySigned() !== true) throw new Error('tx not fully signed')
    if (tx.inputs.some((_, n) => !tx.isValidSignature({ inputIndex: n }))) throw new Error('tx signature not valid')

    // Check that the mempool chain is < the mempool chain limit
    tx._unconfirmedHeight = Math.max(...tx.inputs.map(input => {
      const txIn = this._transactions.get(input.prevTxId.toString('hex'))
      return txIn._unconfirmedHeight + 1
    }))
    if (tx._unconfirmedHeight > this._mempoolChainLimit) {
      const suggestion = 'Hint: Use run.blockchain.block() to produce blocks on the mockchain.'
      throw new Error(`too-long-mempool-chain\n\n${suggestion}`)
    }

    // Remove spent outputs
    tx.inputs.forEach((input, vin) => {
      const prevTxId = input.prevTxId.toString('hex')
      const location = `${prevTxId}_o${input.outputIndex}`
      const prevTx = this._transactions.get(prevTxId)
      const script = prevTx.outputs[input.outputIndex].script
      const scriptHash = sha256(script.toBuffer()).reverse().toString('hex')
      this._utxosByLocation.delete(location)
      this._utxosByScriptHash.get(scriptHash).delete(location)
    })

    // Add the transaction to the mockchain
    tx.time = tx.time || Date.now()
    tx.blockheight = -1
    tx.confirmations = 0
    this._transactions.set(tx.hash, tx)
    this._mempool.add(tx)

    // Update the spentTxId of this tx and spent outputs
    tx.outputs.forEach(o => { o.spentTxId = null; o.spentIndex = null; o.spentHeight = null })
    tx.inputs.forEach((i, vin) => {
      const output = this._transactions.get(i.prevTxId.toString('hex')).outputs[i.outputIndex]
      output.spentTxId = tx.hash
      output.spentIndex = vin
      output.spentHeight = -1
      this._mempoolSpends.add(`${i.prevTxId.toString('hex')}_o${i.outputIndex}`)
    })

    // Add each output to our utxo set
    tx.outputs.forEach((output, vout) => {
      const utxo = { txid: tx.hash, vout, script: output.script, satoshis: output.satoshis }
      const location = `${tx.hash}_o${vout}`
      this._utxosByLocation.set(location, utxo)
      const scriptHash = sha256(output.script.toBuffer()).reverse().toString('hex')
      const utxos = this._utxosByScriptHash.get(scriptHash) || new Set()
      utxos.add(location)
      this._utxosByScriptHash.set(scriptHash, utxos)
    })
  }

  async fetch (txid) {
    Log._debug(TAG, 'Fetch', txid)

    const tx = this._transactions.get(txid)
    if (!tx) throw new Error(`tx not found: ${txid}`)
    return tx
  }

  async utxos (scriptOrAddress) {
    Log._debug(TAG, 'Utxos', scriptOrAddress.toString())

    const script = scriptOrAddress instanceof Script ? scriptOrAddress : Script.fromAddress(scriptOrAddress)
    const utxos = this._utxosByScriptHash.get(_scriptHash(script))
    if (!utxos) return []
    return Array.from(utxos).map(location => this._utxosByLocation.get(location))
  }

  /**
   * Directly provides satoshis to an address
   *
   * @param {string} address Address string
   * @param {number} satoshis Amount of satoshis
   * @returns {string} Transaction hash
   */
  fund (address, satoshis) {
    // Create a unique tx
    const random = Math.random().toString()
    const tx = new Transaction().addData(random).to(new Address(address, 'testnet'), satoshis).lock()
    tx.time = Date.now()
    tx.confirmations = 0
    tx.blockheight = -1
    tx._unconfirmedHeight = 0

    // Index the tx and utxo
    this._transactions.set(tx.hash, tx)
    this._mempool.add(tx)

    const output = tx.outputs[1]
    const utxo = { txid: tx.hash, vout: 1, script: output.script, satoshis: output.satoshis }
    const location = `${tx.hash}_o1`
    this._utxosByLocation.set(location, utxo)

    const script = Script.fromAddress(address)
    const scriptHash = sha256(script.toBuffer()).reverse().toString('hex')
    const utxos = this._utxosByScriptHash.get(scriptHash) || new Set()
    utxos.add(location)
    this._utxosByScriptHash.set(scriptHash, utxos)

    return tx.hash
  }

  block () {
    this._height += 1

    // Take all of the mempool transactions and mark them with a block
    for (const tx of this._mempool) {
      tx.blockheight = this._height
      tx._unconfirmedHeight = 0
      for (const input of tx.inputs) {
        const txIn = this._transactions.get(input.prevTxId.toString('hex'))
        txIn.outputs[input.outputIndex].spentHeight = this._height
      }
    }

    this._mempool = new Set()
    this._mempoolSpends.clear()
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Mockchain
