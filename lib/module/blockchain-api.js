/**
 * blockchain-api.js
 *
 * Blockchain implementation that connects to a remote server
 */

const { Script, Transaction } = require('bsv')
const { _bsvNetwork } = require('../util/misc')
const { _fetchWithTimeout, _parseJsonResponse } = require('../util/fetch')
const { NotImplementedError } = require('../util/errors')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// BlockchainApi
// ------------------------------------------------------------------------------------------------

const TAG = 'BlockchainApi'

/**
 * A Blockchain implementation that connects to a network API.
 *
 * It provides various local checks, caching, and deduping of network requests. It is used
 * primarily to connect to REST servers like RunConnect and MatterCloud.
 */
class BlockchainApi {
  constructor (options = {}) {
    this.network = parseNetwork(options.network)
    this.remoteBlockchain = parseRemoteBlockchain(options)
    this.cache = parseCache(options.lastBlockchain, this.network)
    this.bsvNetwork = _bsvNetwork(this.network)
    this._requests = new Map() // txid|address -> Array<Function>
  }

  get api () {
    if (typeof this.remoteBlockchain.constructor.api === 'string') {
      return this.remoteBlockchain.constructor.api
    } else {
      return 'custom'
    }
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
    if (tx.inputs.some((_, n) => !tx.isValidSignature({ inputIndex: n }))) throw new Error('tx signature not valid')

    // Set properties on the tx that run expects
    tx.time = Date.now()
    tx.confirmations = 0
    tx.outputs.forEach(o => { o.spentTxId = null; o.spentIndex = null; o.spentHeight = null })

    // Broadcast the transaction
    await this.remoteBlockchain.broadcast(tx)

    // Cache the transaction for later fetches and also put in our sent list so that
    // we can correct UTXOs returned for the server.
    this.cache._broadcasted(tx)
  }

  async fetch (txid, force = false) {
    // Check the cache for this transaction if we are not force-refreshing the transaction
    const cached = this.cache._get(txid)
    if (!force && cached) return cached

    // If we already are fetching this transaction, then piggy-back on the response
    const prior = this._requests.get(txid)
    if (prior) return new Promise((resolve, reject) => prior.push({ resolve, reject }))

    // Otherwise, create a new promise list for this request
    this._requests.set(txid, [])

    try {
      // Fetch the transaction by its txid
      const tx = await this.remoteBlockchain.fetch(txid, true)

      // If we have a local cached copy, make sure the spent data is up-to-date
      if (cached) {
        for (let vout = 0; vout < tx.outputs.length; vout++) {
          tx.outputs[vout].spentTxId = tx.outputs[vout].spentTxId || cached.outputs[vout].spentTxId
          tx.outputs[vout].spentIndex = tx.outputs[vout].spentIndex || cached.outputs[vout].spentIndex
          tx.outputs[vout].spentHeight = tx.outputs[vout].spentHeight || cached.outputs[vout].spentHeight
        }
      }

      // Cache it
      this.cache._fetched(tx)

      // If there is other code waiting for this result, resolve their promises now
      this._requests.get(txid).forEach(promise => promise.resolve(tx))

      return tx
    } catch (e) {
      // If the request fails, notify all other code that is waiting for this request
      this._requests.get(txid).forEach(promise => promise.reject(e))

      throw e
    } finally {
      // Whether fetch succeeds or fails, remove all callbacks for this request
      this._requests.delete(txid)
    }
  }

  async utxos (scriptOrAddress) {
    const script = scriptOrAddress instanceof Script ? scriptOrAddress : Script.fromAddress(scriptOrAddress)

    // If we are already querying the utxos for this address, piggy-back on that request
    const prior = this._requests.get(script.hash)
    if (prior) return new Promise((resolve, reject) => prior.push({ resolve, reject }))

    // Create a new promise list for other code to piggy-back on
    this._requests.set(script.hash, [])

    try {
      // Query the utxos
      const utxos = await this.remoteBlockchain.utxos(script)

      if (!Array.isArray(utxos)) {
        throw new Error(`Received invalid utxos for ${scriptOrAddress}\n\n: Type: ${typeof utxos}\n\nNetwork: ${this.network}`)
      }

      // In case the utxos from the server have any duplicates, dedup them
      const dedupedUtxos = this._dedupUtxos(utxos)

      // The server may not index utxos right away. update the utxos with our own broadcasted txns
      const correctedUtxos = this.cache._correctForServerUtxoIndexingDelay(dedupedUtxos, script)

      // Notify all other code that was also waiting for this request
      this._requests.get(script.hash).forEach(o => o.resolve(correctedUtxos))

      return correctedUtxos
    } catch (e) {
      // Notify all other code that this request failed
      this._requests.get(script.hash).forEach(o => o.reject(e))

      throw e
    } finally {
      // Whether we succeeded or failed, remove the promises for this request
      this._requests.delete(script.hash)
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
        Log._warn(TAG, 'Duplicate utxo returned from server:', location)
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
    this._transactions = new Map() // txid -> tx
    this._broadcasts = [] // Array<Transaction>
    this.size = 10000
    this.expiration = 10 * 60 * 1000
    this._indexingDelay = 10 * 1000
  }

  clear () {
    this._transactions = new Map()
    this._broadcasts = []
  }

  _get (txid) {
    const tx = this._transactions.get(txid)
    if (!tx) return

    // If the transaction is expired, remove it
    const expired = Date.now() - tx._fetchedTime > this.expiration
    if (expired) {
      this._transactions.delete(txid)
      return
    }

    // Bump the transaction to the top and return it
    this._transactions.delete(txid)
    this._transactions.set(txid, tx)
    return tx
  }

  _fetched (tx) {
    tx._fetchedTime = Date.now()

    this._transactions.set(tx.hash, tx)

    // If the cache is full, remove the oldest transaction
    if (this._transactions.size > this.size) {
      const oldest = this._transactions.keys().next().value
      this._transactions.delete(oldest)
    }
  }

  _broadcasted (tx) {
    this._fetched(tx)

    // Remove all transactions from our broadcast past the indexing delay
    const now = Date.now()
    this._broadcasts = this._broadcasts.filter(tx => now - tx.time < this._indexingDelay)

    this._broadcasts.push(tx)

    // Update our known transactions with spent info
    tx.inputs.forEach((input, vin) => {
      const spent = this._transactions.get(input.prevTxId.toString('hex'))
      if (spent) {
        spent.outputs[input.outputIndex].spentTxId = tx.hash
        spent.outputs[input.outputIndex].spentIndex = vin
        spent.outputs[input.outputIndex].spentHeight = -1
      }
    })
  }

  _correctForServerUtxoIndexingDelay (utxos, script) {
    // First remove all expired txns from our broadcast cache
    const now = Date.now()
    this._broadcasts = this._broadcasts.filter(tx => now - tx.time < this._indexingDelay)

    // Add all utxos from our broadcast cache for this script that aren't already there
    this._broadcasts.forEach(tx => {
      tx.outputs.forEach((output, vout) => {
        if (output.script.equals(script) && !utxos.some(utxo => utxo.txid === tx.hash && utxo.vout === vout)) {
          utxos.push({ txid: tx.hash, vout, script: output.script, satoshis: output.satoshis })
        }
      })
    })

    // Remove all utxos that we know are spent because they are in our broadcast cache
    this._broadcasts.forEach(tx => {
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
    this.timeout = parseTimeout(options.timeout)
    this.network = options.network
    this.apiKey = options.apiKey
  }

  async broadcast (tx) {
    // Broadcast the transaction
    await this._post(this._broadcastUrl(this.network), this._broadcastData(tx))
  }

  async fetch (txid, force = false) {
    const data = await this._get(this._fetchUrl(this.network, txid))
    return this._fetchResp(data)
  }

  async utxos (script) {
    const data = await this._get(this._utxosUrl(this.network, script))
    return this._utxosResp(data, script)
  }

  async _post (url, data) {
    Log._info(TAG, 'POST', url)

    const method = 'post'
    const body = JSON.stringify(data)
    const headers = { 'Content-Type': 'application/json' }
    const options = { method, body, headers }

    return _fetchWithTimeout(url, this.timeout, options).then(_parseJsonResponse)
  }

  async _get (url) {
    Log._info(TAG, 'GET', url)

    return _fetchWithTimeout(url, this.timeout).then(_parseJsonResponse)
  }

  static get api () { return 'unknown' }
  _broadcastUrl (network) { throw new NotImplementedError() }
  _broadcastData (tx) { throw new NotImplementedError() }
  _fetchUrl (network, txid) { throw new NotImplementedError() }
  _fetchResp (data) { throw new NotImplementedError() }
  _utxosUrl (network, script) { throw new NotImplementedError() }
  _utxosResp (data, script) { throw new NotImplementedError() }
}

// ------------------------------------------------------------------------------------------------
// Built-in REST APIs
// ------------------------------------------------------------------------------------------------

class RunConnect extends RestApi {
  constructor (options) {
    options.network = parseNetwork(options.network)
    if (options.network !== 'main' && options.network !== 'test') {
      throw new Error('Run Connect API only supports mainnet and testnet')
    }
    super(options)
  }

  static get api () { return 'run' }
  _broadcastUrl (network) { return `https://api.run.network/v1/${network}/tx` }
  _broadcastData (tx) { return { rawtx: tx.toBuffer().toString('hex') } }
  _fetchUrl (network, txid) { return `https://api.run.network/v1/${network}/tx/${txid}` }
  _fetchResp (data) { return jsonToTx(data) }
  _utxosUrl (network, script) { return `https://api.run.network/v1/${network}/utxos/${script.hash}` }
  _utxosResp (data, script) { return typeof data === 'string' ? JSON.parse(data) : data }
}

class MatterCloud extends RestApi {
  constructor (options) {
    options.network = parseNetwork(options.network)
    if (options.network !== 'main') throw new Error('MatterCloud API only supports mainnet')
    super(options)
  }

  static get api () { return 'mattercloud' }
  _broadcastUrl (network) { return `https://api.mattercloud.net/api/v3/${network}/tx/send${this._suffix}` }
  _broadcastData (tx) { return { rawtx: tx.toBuffer().toString('hex') } }
  _fetchUrl (network, txid) { return `https://api.mattercloud.net/api/v3/${network}/tx/${txid}${this._suffix}` }
  _fetchResp (data) { const ret = jsonToTx(data); ret.confirmations = ret.confirmations || 0; return ret }
  _utxosUrl (network, script) { return `https://api.mattercloud.net/api/v3/${network}/scripthash/${script.hash}/utxo${this._suffix}` }
  _utxosResp (data, script) { return data.map(o => { return Object.assign({}, o, { script }) }) }
  get _suffix () { return this.apiKey ? `?api_key=${this.apiKey}` : '' }
}

class WhatsOnChain extends RestApi {
  constructor (options) {
    options.network = parseNetwork(options.network)
    if (options.network !== 'main' && options.network !== 'test' && options.network !== 'stn') {
      throw new Error('WhatsOnChain API only supports mainnet, testnet, and STN')
    }
    super(options)
  }

  static get api () { return 'whatsonchain' }
  _broadcastUrl (network) { return `https://api.whatsonchain.com/v1/bsv/${network}/tx/raw` }
  _broadcastData (tx) { return { txhex: tx.toBuffer().toString('hex') } }
  _utxosUrl (network, script) { return `https://api.whatsonchain.com/v1/bsv/${network}/script/${script.hash}/unspent` }
  _utxosResp (data, script) {
    return data.map(o => {
      return { txid: o.tx_hash, vout: o.tx_pos, satoshis: o.value, script }
    })
  }

  async fetch (txid, force = false) {
    const jsonUrl = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/hash/${txid}`
    const hexUrl = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/${txid}/hex`
    const [jsonResult, hexResult] = await Promise.all([this._get(jsonUrl), this._get(hexUrl)])
    jsonResult.confirmations = jsonResult.confirmations || 0
    jsonResult.hex = hexResult
    return jsonToTx(jsonResult)
  }

  async utxos (script) {
    if (this.network === 'stn') {
      Log._warn(TAG, 'Utxos are not available on STN')
      return []
    }
    return super.utxos(script)
  }
}

const apis = [RunConnect, MatterCloud, WhatsOnChain]

// ------------------------------------------------------------------------------------------------
// Helper methods
// ------------------------------------------------------------------------------------------------

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
  if (network === 'main' || network === 'test' || network === 'stn') return network
  throw new Error(`Unsupported network: ${network}`)
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

function parseRemoteBlockchain (options) {
  switch (typeof options.api) {
    case 'string': {
      const Api = apis.find(x => x.api === options.api)
      if (!Api) throw new Error(`Unknown blockchain API: ${options.api}`)
      return new Api(options)
    }
    case 'object':
      if (!options.api) throw new Error(`Invalid blockchain API: ${options.api}`)
      return options.api
    case 'undefined':
      // Only whatsonchain supports STN right now
      return options.network === 'stn' ? new WhatsOnChain(options) : new RunConnect(options)
    default: throw new Error(`Invalid blockchain API: ${options.api}`)
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
