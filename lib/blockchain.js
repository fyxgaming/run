/**
 * blockchain.js
 *
 * Blockchain API and its default REST implementation
 */

const { Address, Script, Transaction } = require('bsv')
const axios = require('axios')
const util = require('./util')

// ------------------------------------------------------------------------------------------------
// Blockchain API
// ------------------------------------------------------------------------------------------------

/**
 * Generic Blockchain API that Run uses to interface with the blockchain
 */
class Blockchain {
  /**
   * @returns {string} Network string, one of 'main', 'test', 'stn', or 'mock'
   */
  get network () { throw new Error('Not implemented') }

  /**
   * Submits a transaction to the network
   * @param {bsv.Transaction} tx Transaction to broadcast
   */
  async broadcast (tx) { throw new Error('not implemented') }

  /**
   * Queries the network for a transaction
   * @param {string} txid Transaction id hex string
   * @param {boolean} force Whether to force-refresh the transaction, and never use the cache
   * @returns {bsv.Transaction} Transaction with additional metadata including:
   * - `time` {number} Time in milliseconds for acceptance into a block or mempool
   * - `confirmations` {number} Number of confirmations, 0 for mempool
   * - `blockhash` {string} Hash of block this tx was included in
   * - `blockheight` {string} Height of block this tx was included in
   * - `blocktime` {number} Time in milliseconds the block was published
   * - `vout` {Array<{spentTxId, spentIndex, spentHeight}>} Output spend information`
   */
  async fetch (txid, force) { throw new Error('not implemented') }

  /**
   * Queries the utxos for an address
   * @param {string} address Address string
   * @returns {Array<{txid, vout, script, satoshis}>}
   */
  async utxos (address) { throw new Error('not implemented') }
}

// ------------------------------------------------------------------------------------------------
// BlockchainServer
// ------------------------------------------------------------------------------------------------

/**
 * Implements the Blockchain API using a network service
 */
class BlockchainServer {
  constructor (options = {}) {
    this.network = parseNetwork(options.network)
    this.logger = parseLogger(options.logger)
    this.api = parseApi(options.api)
    this.cache = parseCache(options.cache)
    this.axios = axios.create({ timeout: parseTimeout(options.timeout) })
    this.bsvNetwork = util.bsvNetwork(this.network)
    this.requests = new Map() // txid|address -> Array<Function>
  }

  async broadcast (tx) {
    // Verify the tx locally. It is faster to find problems here than to wait for a server response.
    if (tx.inputs.length === 0) throw new Error('tx has no inputs')
    if (tx.outputs.length === 0) throw new Error('tx has no outputs')
    if (tx.getFee() < tx.toBuffer().length) throw new Error('tx fee too low')
    if (tx.verify() !== true) throw new Error(tx.verify())
    if (tx.isFullySigned() !== true) throw new Error('tx not fully signed')

    // Set properties on the tx that run expects
    tx.time = Date.now()
    tx.confirmations = 0
    tx.outputs.forEach(o => { o.spentTxId = null; o.spentIndex = null; o.spentHeight = null })

    // Broadcast the transaction
    await this._post(this.api.broadcastUrl(this.network), this.api.broadcastData(tx))

    // Cache the transaction for later fetches and also put in our sent list so that
    // we can correct UTXOs returned for the server.
    this.cache.broadcasted(tx)
  }

  async fetch (txid, force = false) {
    // Check the cache for this transaction if we are not force-refreshing the transaction
    const cached = this.cache.get(txid)
    if (!force && cached) return cached

    // If we already are fetching this transaction, then piggy-back on the response
    const prior = this.requests.get(txid)
    if (prior) return new Promise((resolve, reject) => prior.push({ resolve, reject }))

    // Otherwise, create a new promise list for this request
    this.requests.set(txid, [])

    try {
      // Fetch the transaction by its txid
      const data = (await this._get(this.api.fetchUrl(this.network, txid))).data
      const tx = this.api.fetchResp(data)

      // If we have a local cached copy, make sure the spent data is up-to-date
      if (cached) {
        for (let vout = 0; vout < tx.outputs.length; vout++) {
          tx.outputs[vout].spentTxId = tx.outputs[vout].spentTxId || cached.outputs[vout].spentTxId
          tx.outputs[vout].spentIndex = tx.outputs[vout].spentIndex || cached.outputs[vout].spentIndex
          tx.outputs[vout].spentHeight = tx.outputs[vout].spentHeight || cached.outputs[vout].spentHeight
        }
      }

      // Cache it
      this.cache.fetched(tx)

      // If there is other code waiting for this result, resolve their promises now
      this.requests.get(txid).forEach(promise => promise.resolve(tx))

      return tx
    } catch (e) {
      // If the request fails, notify all other code that is waiting for this request
      this.requests.get(txid).forEach(promise => promise.reject(e))

      throw e
    } finally {
      // Whether fetch succeeds or fails, remove all callbacks for this request
      this.requests.delete(txid)
    }
  }

  async utxos (address) {
    // Whether we are passed a bsv.Address or a string, convert it to a string
    address = new Address(address, this.bsvNetwork).toString()

    // If we are already querying the utxos for this address, piggy-back on that request
    const prior = this.requests.get(address)
    if (prior) return new Promise((resolve, reject) => prior.push({ resolve, reject }))

    // Create a new promise list for other code to piggy-back on
    this.requests.set(address, [])

    try {
      // Query the utxos
      const data = (await this._get(this.api.utxosUrl(this.network, address))).data
      const utxos = this.api.utxosResp(data, address)

      // In case the utxos from the server have any duplicates, dedup them
      const dedupedUtxos = this._dedupUtxos(utxos)

      // The server may not index utxos right away. update the utxos with our own broadcasted txns
      const correctedUtxos = this.cache.correctForServerUtxoIndexingDelay(dedupedUtxos, address)

      // Notify all other code that was also waiting for this request
      this.requests.get(address).forEach(o => o.resolve(correctedUtxos))

      return correctedUtxos
    } catch (e) {
      // Notify all other code that this request failed
      this.requests.get(address).forEach(o => o.reject(e))

      throw e
    } finally {
      // Whether we succeeded or failed, remove the promises for this request
      this.requests.delete(address)
    }
  }

  _dedupUtxos (utxos) {
    // In case the server has a bug, run must be able to handle duplicate utxos returned. If we
    // don't dedup, then later we will create a transaction with more than one of the same input.
    const locations = new Set()
    return utxos.filter(utxo => {
      const location = `${utxo.txid}_o${utxo.vout}`
      if (!locations.has(location)) {
        locations.add(location)
        return true
      } else {
        if (this.logger) this.logger.warn(`Duplicate utxo returned from server: ${location}`)
        return false
      }
    })
  }

  async _post (url, data) {
    if (this.logger) this.logger.info(`POST ${url}`)
    return call(this.axios.post(url, data))
  }

  async _get (url) {
    if (this.logger) this.logger.info(`GET ${url}`)
    return call(this.axios.get(url))
  }
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseNetwork (network) {
  if (network === 'main' || network === 'test' || network === 'stn') return network
  switch (typeof network) {
    case 'string': throw new Error(`Unknown network: ${network}`)
    case 'undefined': return 'main'
    default: throw new Error(`Invalid network: ${network}`)
  }
}

function parseLogger (logger) {
  switch (typeof logger) {
    case 'object': return logger
    case 'undefined': return null
    default: throw new Error(`Invalid logger: ${logger}`)
  }
}

function parseTimeout (timeout) {
  switch (typeof timeout) {
    case 'number':
      if (Number.isNaN(timeout) || timeout < 0) throw new Error(`Invalid timeout: ${timeout}`)
      return timeout
    case 'undefined': return 10000
    default: throw new Error(`Invalid timeout: ${timeout}`)
  }
}

function parseApi (api) {
  switch (typeof api) {
    case 'string':
      switch (api) {
        case 'bitindex': return bitIndexApi
        case 'whatsonchain': return whatsOnChainApi
        case 'star': return starApi
        default: throw new Error(`Unknown blockchain API: ${api}`)
      }
    case 'object':
      if (!api) throw new Error(`Invalid blockchain API: ${api}`)
      return api
    case 'undefined': return starApi
    default: throw new Error(`Invalid blockchain API: ${api}`)
  }
}

function parseCache (cache) {
  return cache && cache instanceof BlockchainServerCache ? cache : new BlockchainServerCache()
}

// ------------------------------------------------------------------------------------------------
// BlockchainServerCache
// ------------------------------------------------------------------------------------------------

class BlockchainServerCache {
  constructor () {
    this.transactions = new Map() // txid -> tx
    this.broadcasts = [] // Array<Transaction>
    this.size = 10000
    this.expiration = 10 * 60 * 1000
    this.indexingDelay = 10 * 1000
  }

  get (txid) {
    const tx = this.transactions.get(txid)
    if (!tx) return

    // If the transaction is expired, remove it
    const expired = Date.now() - tx.fetchedTime > this.expiration
    if (expired) {
      this.transactions.delete(txid)
      return
    }

    // Bump the transaction to the top and return it
    this.transactions.delete(txid)
    this.transactions.set(txid, tx)
    return tx
  }

  fetched (tx) {
    tx.fetchedTime = Date.now()

    this.transactions.set(tx.hash, tx)

    // If the cache is full, remove the oldest transaction
    if (this.transactions.size > this.size) {
      const oldest = this.transactions.keys().next().value
      this.transactions.delete(oldest)
    }
  }

  broadcasted (tx) {
    this.fetched(tx)

    // Remove all transactions from our broadcast past the indexing delay
    const now = Date.now()
    this.broadcasts = this.broadcasts.filter(tx => now - tx.time < this.indexingDelay)

    this.broadcasts.push(tx)

    // Update our known transactions with spent info
    tx.inputs.forEach((input, vin) => {
      const spent = this.transactions.get(input.prevTxId.toString('hex'))
      if (spent) {
        spent.outputs[input.outputIndex].spentTxId = tx.hash
        spent.outputs[input.outputIndex].spentIndex = vin
        spent.outputs[input.outputIndex].spentHeight = -1
      }
    })
  }

  correctForServerUtxoIndexingDelay (utxos, address) {
    // First remove all expired txns from our broadcast cache
    const now = Date.now()
    this.broadcasts = this.broadcasts.filter(tx => now - tx.time < this.indexingDelay)

    // Add all utxos from our broadcast cache for this address that aren't already there
    this.broadcasts.forEach(tx => {
      tx.outputs.forEach((output, vout) => {
        if (output.script.toAddress(this.bsvNetwork).toString() === address &&
              !utxos.some(utxo => utxo.txid === tx.hash && utxo.vout === vout)) {
          utxos.push({ txid: tx.hash, vout, script: output.script, satoshis: output.satoshis })
        }
      })
    })

    // Remove all utxos that we know are spent because they are in our broadcast cache
    this.broadcasts.forEach(tx => {
      const inputSpendsUtxo = (input, utxo) =>
        input.prevTxId.toString('hex') === utxo.txid &&
        input.outputIndex === utxo.vout

      utxos = utxos.filter(utxo => !tx.inputs.some(input => inputSpendsUtxo(input, utxo)))
    })

    return utxos
  }
}

// ------------------------------------------------------------------------------------------------
// Helper methods
// ------------------------------------------------------------------------------------------------

async function call (promise) {
  try { return await promise } catch (e) {
    const { config: c, response: r } = e
    if (c && c.url && r && r.data) {
      const message = r.data.message ? (r.data.message.message || r.data.message) : r.data
      const reason = r.data.name && message ? `${r.data.name}: ${message}` : r.data.name || message
      throw new Error(`${reason}\n\n${c.method.toUpperCase()} ${c.url}`)
    } else { throw e }
  }
}

function jsonToTx (json) {
  const tx = new Transaction(json.hex || json.rawtx)
  tx.time = json.time * 1000 || Date.now()
  if (json.blockhash && json.blockhash.length) tx.blockhash = json.blockhash
  if (json.blocktime) tx.blocktime = json.blocktime
  if (json.blockheight) tx.blockheight = json.blockheight
  if (typeof json.confirmations !== 'undefined') tx.confirmations = json.confirmations
  if (json.vout) {
    json.vout.forEach((output, n) => {
      if (typeof output.spentTxId !== 'undefined') tx.outputs[n].spentTxId = output.spentTxId
      if (typeof output.spentIndex !== 'undefined') tx.outputs[n].spentIndex = output.spentIndex
      if (typeof output.spentHeight !== 'undefined') tx.outputs[n].spentHeight = output.spentHeight
    })
  }
  return tx
}

// ------------------------------------------------------------------------------------------------
// REST APIs
// ------------------------------------------------------------------------------------------------

const starApiHost = 'https://api.star.store'
const starApi = {
  broadcastUrl: network => `${starApiHost}/v1/${network}/tx`,
  broadcastData: tx => { return { rawtx: tx.toBuffer().toString('hex') } },
  fetchUrl: (network, txid) => `${starApiHost}/v1/${network}/tx/${txid}`,
  fetchResp: data => jsonToTx(data),
  utxosUrl: (network, address) => `${starApiHost}/v1/${network}/utxos/${address.toString()}`,
  utxosResp: (data, address) => data
}

const bitIndexApi = {
  broadcastUrl: network => `https://api.bitindex.network/api/v3/${network}/tx/send`,
  broadcastData: tx => { return { rawtx: tx.toBuffer().toString('hex') } },
  fetchUrl: (network, txid) => `https://api.bitindex.network/api/v3/${network}/tx/${txid}`,
  fetchResp: data => { const ret = jsonToTx(data); ret.confirmations = ret.confirmations || 0; return ret },
  utxosUrl: (network, address) => `https://api.bitindex.network/api/v3/${network}/addr/${address.toString()}/utxo`,
  utxosResp: (data, address) => data.map(o => { return { ...o, script: new Script(o.scriptPubKey) } })
}

const whatsOnChainApi = {
  broadcastUrl: network => `https://api.whatsonchain.com/v1/bsv/${network}/tx/raw`,
  broadcastData: tx => { return { txhex: tx.toBuffer().toString('hex') } },
  fetchUrl: (network, txid) => `https://api.whatsonchain.com/v1/bsv/${network}/tx/hash/${txid}`,
  fetchResp: data => { const ret = jsonToTx(data); ret.confirmations = ret.confirmations || 0; return ret },
  utxosUrl: (network, address) => `https://api.whatsonchain.com/v1/bsv/${network}/address/${address.toString()}/unspent`,
  utxosResp: (data, address) => data.map(o => {
    return { txid: o.tx_hash, vout: o.tx_pos, satoshis: o.value, script: Script.fromAddress(address) }
  })
}

// ------------------------------------------------------------------------------------------------

BlockchainServer.Cache = BlockchainServerCache

module.exports = { Blockchain, BlockchainServer }
