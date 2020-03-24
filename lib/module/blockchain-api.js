/**
 * blockchain-api.js
 *
 * Blockchain implementation that connects to a remote server
 */

const { Address, Script, Transaction } = require('bsv')
const axios = require('axios')
const { bsvNetwork } = require('../util')

// ------------------------------------------------------------------------------------------------
// BlockchainApi
// ------------------------------------------------------------------------------------------------

/**
 * A Blockchain implementation that connects to a network API.
 *
 * It provides various local checks, caching, and deduping of network requests. It is used
 * primarily to connect to REST servers like RunConnect and MatterCloud.
 */
class BlockchainApi {
  constructor (options = {}) {
    this.network = parseNetwork(options.network)
    this.logger = parseLogger(options.logger)
    this.api = parseApi(options.api, options)
    this.cache = parseCache(options.lastBlockchain, this.network)
    this.bsvNetwork = bsvNetwork(this.network)
    this.requests = new Map() // txid|address -> Array<Function>
  }

  async broadcast (tx) {
    // Lock the tx both to improve performance and because caching assumes it doesn't change
    tx.lock()

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
    await this.api.broadcast(tx)

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
      const tx = await this.api.fetch(txid, true)

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

  async utxos (query) {
    // Whether we are passed a bsv.Address or a string, convert it to a string.
    // If we are passed a pubkey or Script, then we don't support this yet.
    let address = null
    try {
      address = new Address(query, this.bsvNetwork).toString()
    } catch (e) {
      throw new Error('Non-address utxo queries are not supported by this blockchain API')
    }

    // If we are already querying the utxos for this address, piggy-back on that request
    const prior = this.requests.get(address)
    if (prior) return new Promise((resolve, reject) => prior.push({ resolve, reject }))

    // Create a new promise list for other code to piggy-back on
    this.requests.set(address, [])

    try {
      // Query the utxos
      const utxos = await this.api.utxos(address)

      if (!Array.isArray(utxos)) {
        throw new Error(`Received invalid utxos for ${address}\n\n: Type: ${typeof utxos}\n\nNetwork: ${this.network}`)
      }

      // In case the utxos from the server have any duplicates, dedup them
      const dedupedUtxos = this.dedupUtxos(utxos)

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

  dedupUtxos (utxos) {
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
}

// ------------------------------------------------------------------------------------------------
// BlockchainApiCache
// ------------------------------------------------------------------------------------------------

class BlockchainApiCache {
  constructor () {
    this.transactions = new Map() // txid -> tx
    this.broadcasts = [] // Array<Transaction>
    this.size = 10000
    this.expiration = 10 * 60 * 1000
    this.indexingDelay = 10 * 1000
  }

  clear () {
    this.transactions = new Map()
    this.broadcasts = []
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
// REST APIs
// ------------------------------------------------------------------------------------------------

/**
 * A specific blockchain server
 */
class RestApi {
  constructor (options = {}) {
    const axiosOptions = { timeout: parseTimeout(options.timeout) }
    // Run and BitIndex gzip responses, but this is only needed in node. In browser, it errors.
    if (typeof window === 'undefined') axiosOptions.headers = { 'Accept-Encoding': 'gzip' }
    this.axios = axios.create(axiosOptions)
    this.logger = options.logger
    this.network = options.network
  }

  async broadcast (tx) {
    // Broadcast the transaction
    await this.post(this.broadcastUrl(this.network), this.broadcastData(tx))
  }

  async fetch (txid, force = false) {
    const data = (await this.get(this.fetchUrl(this.network, txid))).data
    return this.fetchResp(data)
  }

  async utxos (address) {
    const data = (await this.get(this.utxosUrl(this.network, address))).data
    return this.utxosResp(data, address)
  }

  async post (url, data) {
    if (this.logger) this.logger.info(`POST ${url}`)
    return call(this.axios.post(url, data))
  }

  async get (url) {
    if (this.logger) this.logger.info(`GET ${url}`)
    return call(this.axios.get(url))
  }

  static get name () { return 'Unknown' }
  broadcastUrl (network) { throw new Error('Not implemented') }
  broadcastData (tx) { throw new Error('Not implemented') }
  fetchUrl (network, txid) { throw new Error('Not implemented') }
  fetchResp (data) { throw new Error('Not implemented') }
  utxosUrl (network, address) { throw new Error('Not implemented') }
  utxosResp (data, address) { throw new Error('Not implemented') }
}

// ------------------------------------------------------------------------------------------------
// Built-in REST APIs
// ------------------------------------------------------------------------------------------------

class RunConnect extends RestApi {
  static get shortName () { return 'run' }
  broadcastUrl (network) { return `https://api.run.network/v1/${network}/tx` }
  broadcastData (tx) { return { rawtx: tx.toBuffer().toString('hex') } }
  fetchUrl (network, txid) { return `https://api.run.network/v1/${network}/tx/${txid}` }
  fetchResp (data) { return jsonToTx(data) }
  utxosUrl (network, address) { return `https://api.run.network/v1/${network}/utxos/${address.toString()}` }
  utxosResp (data, address) { return typeof data === 'string' ? JSON.parse(data) : data }
}

class MatterCloud extends RestApi {
  static get shortName () { return 'mattercloud' }
  broadcastUrl (network) { return `https://api.mattercloud.net/api/v3/${network}/tx/send` }
  broadcastData (tx) { return { rawtx: tx.toBuffer().toString('hex') } }
  fetchUrl (network, txid) { return `https://api.mattercloud.net/api/v3/${network}/tx/${txid}` }
  fetchResp (data) { const ret = jsonToTx(data); ret.confirmations = ret.confirmations || 0; return ret }
  utxosUrl (network, address) { return `https://api.mattercloud.net/api/v3/${network}/addr/${address.toString()}/utxo` }
  utxosResp (data, address) { return data.map(o => { return Object.assign({}, o, { script: new Script(o.scriptPubKey) }) }) }
}

class WhatsOnChain extends RestApi {
  static get shortName () { return 'whatsonchain' }
  broadcastUrl (network) { return `https://api.whatsonchain.com/v1/bsv/${network}/tx/raw` }
  broadcastData (tx) { return { txhex: tx.toBuffer().toString('hex') } }
  utxosUrl (network, address) { return `https://api.whatsonchain.com/v1/bsv/${network}/address/${address.toString()}/unspent` }
  utxosResp (data, address) {
    return data.map(o => {
      return { txid: o.tx_hash, vout: o.tx_pos, satoshis: o.value, script: Script.fromAddress(address) }
    })
  }

  async fetch (txid, force = false) {
    const jsonUrl = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/hash/${txid}`
    const hexUrl = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/${txid}/hex`
    const [jsonResult, hexResult] = await Promise.all([this.get(jsonUrl), this.get(hexUrl)])
    const json = jsonResult.data
    json.confirmations = json.confirmations || 0
    json.hex = hexResult.data
    return jsonToTx(json)
  }
}

const apis = [RunConnect, MatterCloud, WhatsOnChain]

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
  if (typeof json !== 'object') throw new Error(`JSON returned is invalid or not an object: ${json}`)
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
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseNetwork (network) {
  if (typeof network === 'undefined') return 'main'
  if (network === 'main' || network === 'test') return network
  throw new Error(`Unsupported network: ${network}`)
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

function parseApi (api, options) {
  switch (typeof api) {
    case 'string': {
      const Api = apis.find(x => x.shortName === api)
      if (!Api) throw new Error(`Unknown blockchain API: ${api}`)
      return new Api(options)
    }
    case 'object':
      if (!api) throw new Error(`Invalid blockchain API: ${api}`)
      return api
    case 'undefined': return new RunConnect(options)
    default: throw new Error(`Invalid blockchain API: ${api}`)
  }
}

function parseCache (lastBlockchain, network) {
  // Copy the cache from the last blockchain if possible to save round trips
  if (lastBlockchain && lastBlockchain instanceof BlockchainApi &&
    lastBlockchain.network === network) {
    return lastBlockchain.cache
  }
  return new BlockchainApiCache()
}

// ------------------------------------------------------------------------------------------------

BlockchainApi.Cache = BlockchainApiCache
BlockchainApi.RunConnect = RunConnect
BlockchainApi.MatterCloud = MatterCloud
BlockchainApi.WhatsOnChain = WhatsOnChain

module.exports = BlockchainApi
