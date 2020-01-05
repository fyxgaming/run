/**
 * mockchain.js
 *
 * In-memory Blockchain implementation
 */

const { Address, Transaction } = require('bsv')

module.exports = class Mockchain {
  constructor () {
    this.network = 'mock'
    this.transactions = new Map()
    this.unspentOutputs = []
    this.blockHeight = -1
  }

  async broadcast (tx) {
    // basic transaction checks
    if (tx.inputs.length === 0) throw new Error('tx has no inputs')
    if (tx.outputs.length === 0) throw new Error('tx has no outputs')
    if (tx.getFee() < tx.toBuffer().length) throw new Error('tx fee too low')
    if (tx.verify() !== true) throw new Error(tx.verify())
    if (tx.isFullySigned() !== true) throw new Error('tx not fully signed')

    // check that each input exists and is not spent
    let utxos = this.unspentOutputs.slice(0)
    const spent = (i) => { return utxo => utxo.txid === i.prevTxId.toString('hex') && utxo.vout === i.outputIndex }
    tx.inputs.forEach((i, ni) => {
      if (!utxos.some(spent(i))) throw new Error(`tx input ${ni} missing or spent`)
      utxos = utxos.filter(o => !spent(i)(o))
    })

    // check that the mempool chain is < 25
    tx.unconfirmedHeight = Math.max(...tx.inputs.map(input => {
      const txIn = this.transactions.get(input.prevTxId.toString('hex'))
      return txIn.unconfirmedHeight + 1
    }))
    if (tx.unconfirmedHeight > 25) {
      const suggestion = 'Hint: Use run.blockchain.block() to produce blocks on the mockchain.'
      throw new Error(`too-long-mempool-chain\n\n${suggestion}`)
    }

    // remove spent outputs
    this.unspentOutputs = this.unspentOutputs.filter(o => !tx.inputs.some(i => spent(i)(o)))

    // add the transaction to the mockchain
    tx.time = tx.time || Date.now()
    tx.blockHeight = -1
    tx.confirmations = 0
    this.transactions.set(tx.hash, tx)

    // update the spentTxId of this tx and spent outputs
    tx.outputs.forEach(o => { o.spentTxId = null; o.spentIndex = null; o.spentHeight = null })
    tx.inputs.forEach((i, vin) => {
      const output = this.transactions.get(i.prevTxId.toString('hex')).outputs[i.outputIndex]
      output.spentTxId = tx.hash
      output.spentIndex = vin
      output.spentHeight = -1
    })

    // add each output to our utxo set
    tx.outputs.forEach((o, vout) => this.unspentOutputs.push(
      { txid: tx.hash, vout, script: o.script, satoshis: o.satoshis }))
  }

  async fetch (txid, refresh = false) {
    const tx = this.transactions.get(txid)
    if (tx) { return tx } else { throw new Error(`tx not found: ${txid}`) }
  }

  async utxos (address) {
    const addr = new Address(address, 'testnet').toString()
    return this.unspentOutputs.filter(o => o.script.toAddress('testnet').toString() === addr)
  }

  fund (address, satoshis) {
    const random = Math.random().toString()
    const tx = new Transaction().addData(random).to(new Address(address, 'testnet'), satoshis)
    tx.time = Date.now()
    tx.confirmations = 0
    tx.blockHeight = -1
    tx.unconfirmedHeight = 0
    this.transactions.set(tx.hash, tx)
    const o = tx.outputs[1]
    this.unspentOutputs.push({ txid: tx.hash, vout: 1, script: o.script, satoshis: o.satoshis })
  }

  block () {
    this.blockHeight += 1
    // take all of the mempool transactions and mark them with a block
    for (const tx of this.transactions.values()) {
      if (tx.blockHeight === -1) {
        tx.blockHeight = this.blockHeight
        tx.unconfirmedHeight = 0
        for (const input of tx.inputs) {
          const txIn = this.transactions.get(input.prevTxId.toString('hex'))
          txIn.outputs[input.outputIndex].spentHeight = this.blockHeight
        }
      }
    }
  }
}
