/**
 * mockchain.js
 *
 * In-memory Blockchain implementation
 */

const bsv = require('bsv')
const { Address, Transaction, Script } = bsv
const { sha256 } = bsv.crypto.Hash

// ------------------------------------------------------------------------------------------------
// Mockchain
// ------------------------------------------------------------------------------------------------

/**
 * An in-memory blockchain implementation.
 *
 * It simulates the mempool and blocks, keeps a UTXO index, checks the mempool chain limit, and
 * generally attempts to create errors that are similar to a real network node or service.
 */
class Mockchain {
  constructor () {
    this.network = 'mock'
    this.transactions = new Map() // txid -> Transaction
    this.utxosByLocation = new Map() // Map<txid_oN, utxo>
    this.utxosByScriptHash = new Map() // scriptHash -> Set<location>
    this.mempool = new Set() // Set<Transaction>
    this.mempoolSpends = new Set() // Set<txid_oN>
    this.mempoolChainLimit = 25
    this.height = -1
  }

  async broadcast (tx) {
    // Lock the tx both to improve performance and because caching assumes it doesn't change
    tx.lock()

    // Basic transaction checks
    if (tx.inputs.length === 0) throw new Error('tx has no inputs')
    if (tx.outputs.length === 0) throw new Error('tx has no outputs')
    if (tx.getFee() < tx.toBuffer().length * Transaction.FEE_PER_KB / 1000) throw new Error('tx fee too low')
    if (tx.verify() !== true) throw new Error(tx.verify())
    if (tx.isFullySigned() !== true) throw new Error('tx not fully signed')

    // Check that each input exists and is not spent
    const spentLocations = new Set()
    tx.inputs.forEach((input, vin) => {
      const location = `${input.prevTxId.toString('hex')}_o${input.outputIndex}`
      if (!this.utxosByLocation.has(location)) {
        throw new Error(this.mempoolSpends.has(location) ? 'txn-mempool-conflict' : 'Missing inputs')
      }
      if (spentLocations.has(location)) throw new Error(`already spent input ${vin}`)
      spentLocations.add(location)
    })

    // Check that the mempool chain is < the mempool chain limit
    tx.unconfirmedHeight = Math.max(...tx.inputs.map(input => {
      const txIn = this.transactions.get(input.prevTxId.toString('hex'))
      return txIn.unconfirmedHeight + 1
    }))
    if (tx.unconfirmedHeight > this.mempoolChainLimit) {
      const suggestion = 'Hint: Use run.blockchain.block() to produce blocks on the mockchain.'
      throw new Error(`too-long-mempool-chain\n\n${suggestion}`)
    }

    // Remove spent outputs
    tx.inputs.forEach((input, vin) => {
      const prevTxId = input.prevTxId.toString('hex')
      const location = `${prevTxId}_o${input.outputIndex}`
      const prevTx = this.transactions.get(prevTxId)
      const script = prevTx.outputs[input.outputIndex].script
      const scriptHash = sha256(script.toBuffer()).reverse().toString('hex')
      this.utxosByLocation.delete(location)
      this.utxosByScriptHash.get(scriptHash).delete(location)
    })

    // Add the transaction to the mockchain
    tx.time = tx.time || Date.now()
    tx.blockheight = -1
    tx.confirmations = 0
    this.transactions.set(tx.hash, tx)
    this.mempool.add(tx)

    // Update the spentTxId of this tx and spent outputs
    tx.outputs.forEach(o => { o.spentTxId = null; o.spentIndex = null; o.spentHeight = null })
    tx.inputs.forEach((i, vin) => {
      const output = this.transactions.get(i.prevTxId.toString('hex')).outputs[i.outputIndex]
      output.spentTxId = tx.hash
      output.spentIndex = vin
      output.spentHeight = -1
      this.mempoolSpends.add(`${i.prevTxId.toString('hex')}_o${i.outputIndex}`)
    })

    // Add each output to our utxo set
    tx.outputs.forEach((output, vout) => {
      const utxo = { txid: tx.hash, vout, script: output.script, satoshis: output.satoshis }
      const location = `${tx.hash}_o${vout}`
      this.utxosByLocation.set(location, utxo)
      const scriptHash = sha256(output.script.toBuffer()).reverse().toString('hex')
      const utxos = this.utxosByScriptHash.get(scriptHash) || new Set()
      utxos.add(location)
      this.utxosByScriptHash.set(scriptHash, utxos)
    })
  }

  async fetch (txid) {
    const tx = this.transactions.get(txid)
    if (!tx) throw new Error(`tx not found: ${txid}`)
    return tx
  }

  async utxos (scriptOrAddress) {
    const script = scriptOrAddress instanceof Script ? scriptOrAddress : Script.fromAddress(scriptOrAddress)
    script.hash = script.hash || sha256(script.toBuffer()).reverse().toString('hex')
    const utxos = this.utxosByScriptHash.get(script.hash)
    if (!utxos) return []
    return Array.from(utxos).map(location => this.utxosByLocation.get(location))
  }

  /**
   * Directly provides satoshis to an address
   *
   * @param {string} address Address string
   * @param {number} satoshis Amount of satoshis
   */
  fund (address, satoshis) {
    // Create a unique tx
    const random = Math.random().toString()
    const tx = new Transaction().addData(random).to(new Address(address, 'testnet'), satoshis).lock()
    tx.time = Date.now()
    tx.confirmations = 0
    tx.blockheight = -1
    tx.unconfirmedHeight = 0

    // Index the tx and utxo
    this.transactions.set(tx.hash, tx)
    this.mempool.add(tx)

    const output = tx.outputs[1]
    const utxo = { txid: tx.hash, vout: 1, script: output.script, satoshis: output.satoshis }
    const location = `${tx.hash}_o1`
    this.utxosByLocation.set(location, utxo)

    const script = Script.fromAddress(address)
    const scriptHash = sha256(script.toBuffer()).reverse().toString('hex')
    const utxos = this.utxosByScriptHash.get(scriptHash) || new Set()
    utxos.add(location)
    this.utxosByScriptHash.set(scriptHash, utxos)
  }

  block () {
    this.height += 1

    // Take all of the mempool transactions and mark them with a block
    for (const tx of this.mempool) {
      tx.blockheight = this.height
      tx.unconfirmedHeight = 0
      for (const input of tx.inputs) {
        const txIn = this.transactions.get(input.prevTxId.toString('hex'))
        txIn.outputs[input.outputIndex].spentHeight = this.height
      }
    }

    this.mempool = new Set()
    this.mempoolSpends.clear()
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Mockchain
