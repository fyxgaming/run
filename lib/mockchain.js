/**
 * mockchain.js
 *
 * In-memory Blockchain implementation
 */

const bsv = require('bsv')
const { Address, PublicKey, Transaction, Script } = bsv
const sha256 = bsv.crypto.Hash.sha256
const { PubKeyScript } = require('./owner')

module.exports = class Mockchain {
  constructor (options = {}) {
    // The mockchain persists across instances of Run, just like testnet and mainnet
    if (options.lastBlockchain && options.lastBlockchain instanceof Mockchain) {
      return options.lastBlockchain
    }

    this.network = 'mock'
    this.transactions = new Map() // txid -> Transaction
    this.utxosByLocation = new Map() // Map<txid_oN, utxo>
    this.utxosByScriptHash = new Map() // scriptHash -> Set<location>
    this.mempool = new Set() // Set<Transaction>
    this.mempoolSpends = new Set() // Set<txid_oN>
    this.mempoolChainLimit = 25
    this.blockHeight = -1
  }

  async broadcast (tx) {
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

    // Memove spent outputs
    tx.inputs.forEach((input, vin) => {
      const prevTxId = input.prevTxId.toString('hex')
      const location = `${prevTxId}_o${input.outputIndex}`
      const prevTx = this.transactions.get(prevTxId)
      const script = prevTx.outputs[input.outputIndex].script
      const scriptHash = sha256(script.toBuffer()).toString('hex')
      this.utxosByLocation.delete(location)
      this.utxosByScriptHash.get(scriptHash).delete(location)
    })

    // Add the transaction to the mockchain
    tx.time = tx.time || Date.now()
    tx.blockHeight = -1
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
      const scriptHash = sha256(output.script.toBuffer()).toString('hex')
      const utxos = this.utxosByScriptHash.get(scriptHash) || new Set()
      utxos.add(location)
      this.utxosByScriptHash.set(scriptHash, utxos)
    })
  }

  async fetch (txid, refresh = false) {
    const tx = this.transactions.get(txid)
    if (!tx) throw new Error(`tx not found: ${txid}`)
    return tx
  }

  async utxos (query) {
    let scriptHash = query
    // See if query is an address
    try {
      const addr = new Address(query, 'testnet')
      const script = Script.fromAddress(addr)
      scriptHash = sha256(script.toBuffer()).toString('hex')
    } catch (e) {
      // See if query is a pubkey
      try {
        const pubkey = new PublicKey(query, { network: 'testnet' })
        const script = Buffer.from(new PubKeyScript(pubkey).toBuffer())
        scriptHash = sha256(script.toBuffer()).toString('hex')
      } catch (e) {
        // Check that it is a valid scripthash
        if (typeof query !== 'string' || !query.length || !/[0-9a-zA-Z]+/.test(query)) {
          throw new Error(`Bad query string: ${query}`)
        }
      }
    }

    const utxos = this.utxosByScriptHash.get(scriptHash)
    if (!utxos) return []
    return Array.from(utxos).map(location => this.utxosByLocation.get(location))
  }

  fund (address, satoshis) {
    const random = Math.random().toString()
    const tx = new Transaction().addData(random).to(new Address(address, 'testnet'), satoshis)
    tx.time = Date.now()
    tx.confirmations = 0
    tx.blockHeight = -1
    tx.unconfirmedHeight = 0
    this.transactions.set(tx.hash, tx)
    const output = tx.outputs[1]
    const utxo = { txid: tx.hash, vout: 1, script: output.script, satoshis: output.satoshis }
    const location = `${tx.hash}_o1`
    this.utxosByLocation.set(location, utxo)
    const script = Script.fromAddress(address)
    const scriptHash = sha256(script.toBuffer()).toString('hex')
    const utxos = this.utxosByScriptHash.get(scriptHash) || new Set()
    utxos.add(location)
    this.utxosByScriptHash.set(scriptHash, utxos)
  }

  block () {
    this.blockHeight += 1

    // Take all of the mempool transactions and mark them with a block
    for (const tx of this.mempool) {
      tx.blockHeight = this.blockHeight
      tx.unconfirmedHeight = 0
      for (const input of tx.inputs) {
        const txIn = this.transactions.get(input.prevTxId.toString('hex'))
        txIn.outputs[input.outputIndex].spentHeight = this.blockHeight
      }
    }

    this.mempool = new Set()
    this.mempoolSpends.clear()
  }
}
