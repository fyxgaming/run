/**
 * blockchain-server.js
 *
 * Blockchain implementation that connects to a remote server
 */

const { Script, Transaction } = require('bsv')
const { _bsvNetwork } = require('../util/misc')
const { NotImplementedError } = require('../util/errors')
const { _scripthash } = require('../util/bsv')
const { State } = require('../kernel/api')
const Log = require('../util/log')
const REST = require('../util/rest')

// ------------------------------------------------------------------------------------------------
// RemoteBlockchain
// ------------------------------------------------------------------------------------------------

const TAG = 'RemoteBlockchain'

/**
 * A Blockchain implementation that connects to a network API.
 *
 * It provides various local checks, caching, and deduping of network requests. It is used
 * primarily to connect to REST servers like RunConnect and MatterCloud.
 */
class RemoteBlockchain {
  constructor (options = {}) {
    this.network = parseNetwork(options.network)
    this.api = parseApi(options.api)
    this.timeout = parseTimeout(options.timeout)
    this.cache = parseCache(options.cache)
    this.bsvNetwork = _bsvNetwork(this.network)

    this._requests = new Map() // txid|address -> [Promise]
    this._times = new Map() // txid -> time
    this._spends = new Map() // location -> txid
    this._recentBroadcasts = [] // [txid]
    this._indexingDelay = 10 * 1000

    this._copyCache(options.lastBlockchain)
  }

  async broadcast (rawtx) {
    const tx = new Transaction(rawtx)
    const txid = tx.hash

    Log._debug(TAG, 'Broadcast', txid)

    // Verify the tx locally. It is faster to find problems here than to wait for a server response.
    if (tx.inputs.length === 0) throw new Error('tx has no inputs')
    if (tx.outputs.length === 0) throw new Error('tx has no outputs')
    if (tx.getFee() < tx.toBuffer().length * Transaction.FEE_PER_KB / 1000) throw new Error('tx fee too low')
    if (tx.verify() !== true) throw new Error(tx.verify())

    // Store the transaction time
    this._times.set(txid, Date.now())

    // Mark outputs as unspent
    tx.outputs.forEach((output, vout) => {
      const location = `${txid}_o${vout}`
      this._spends.set(location, null)
    })

    // Mark inputs as spent
    tx.inputs.forEach(input => {
      const prevtxid = input.prevTxId.toString('hex')
      const location = `${prevtxid}_o${input.outputIndex}`
      this._spends.set(location, txid)
    })

    // Cache the transaction
    await this._cache.set(`tx://${txid}`, rawtx)

    // Broadcast the transaction
    await this._requestBroadcast(rawtx)

    // Put the transaction into a recent broadcast list used to correct server UTXOs
    const recent = txid => Date.now() - this._times.get(txid) < this._indexingDelay
    this._recentBroadcasts = this._broadcasts.filter(recent)
    this._recentBroadcasts.push(txid)
  }

  async fetch (txid) {
    Log._debug(TAG, 'Fetch', txid)

    /*
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
      const tx = await this._remoteBlockchain.fetch(txid, true)

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
    */
  }

  async utxos (script) {
    Log._debug(TAG, 'Utxos', script.toString())

    /*
    const script = scriptOrAddress instanceof Script ? scriptOrAddress : Script.fromAddress(scriptOrAddress)
    const scripthash = _scripthash(script)

    // If we are already querying the utxos for this address, piggy-back on that request
    const prior = this._requests.get(scripthash)
    if (prior) return new Promise((resolve, reject) => prior.push({ resolve, reject }))

    // Create a new promise list for other code to piggy-back on
    this._requests.set(scripthash, [])

    try {
      // Query the utxos
      const utxos = await this._remoteBlockchain.utxos(script)

      if (!Array.isArray(utxos)) {
        throw new Error(`Received invalid utxos for ${scriptOrAddress}\n\n: Type: ${typeof utxos}\n\nNetwork: ${this.network}`)
      }

      // In case the utxos from the server have any duplicates, dedup them
      const dedupedUtxos = this._dedupUtxos(utxos)

      // The server may not index utxos right away. update the utxos with our own broadcasted txns
      const correctedUtxos = this.cache._correctForServerUtxoIndexingDelay(dedupedUtxos, script)

      // Notify all other code that was also waiting for this request
      this._requests.get(scripthash).forEach(o => o.resolve(correctedUtxos))

      return correctedUtxos
    } catch (e) {
      // Notify all other code that this request failed
      this._requests.get(scripthash).forEach(o => o.reject(e))

      throw e
    } finally {
      // Whether we succeeded or failed, remove the promises for this request
      this._requests.delete(scripthash)
    }
    */
  }

  async time (txid) {
    Log._debug(TAG, 'Time', txid)

    // TODO
  }

  async spends (txid, vout) {
    Log._debug(TAG, 'Spends', txid, vout)

    // TODO
  }

  async _requestBroadcast (rawtx) {
    const url = this._broadcastUrl(this.network)
    const data = this._broadcastData(rawtx)
    await REST._post(url, data, this.timeout)
  }

  /*
  async _requestFetch (txid, force = false) {
    const url = this._fetchUrl(this.network, txid)
    const data = await REST._get(url, this.timeout)
    return this._fetchResp(data)
  }

  async _requestUtxos (script) {
    const url = this._utxosUrl(this.network, script)
    const data = await REST._get(url, this.timeout)
    return this._utxosResp(data, script)
  }
  */

  // These should be implemented for each specific API
  _broadcastUrl (network) { throw new NotImplementedError() }
  _broadcastData (tx) { throw new NotImplementedError() }
  _fetchUrl (network, txid) { throw new NotImplementedError() }
  _fetchResp (data) { throw new NotImplementedError() }
  _utxosUrl (network, script) { throw new NotImplementedError() }
  _utxosResp (data, script) { throw new NotImplementedError() }

  _copyCache (lastBlockchain) {
    if (!lastBlockchain) return
    if (this.network !== lastBlockchain.network) return
    this._cache = lastBlockchain._cache
    this._recentBroadcasts = lastBlockchain._recentBroadcasts
  }

  /*
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
  */
}

// ------------------------------------------------------------------------------------------------
// BlockchainApiCache
// ------------------------------------------------------------------------------------------------

/*
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
*/

// ------------------------------------------------------------------------------------------------
// Built-in REST APIs
// ------------------------------------------------------------------------------------------------

class BlockchainServer extends RemoteBlockchain {
  constructor (options) {
    options.network = parseNetwork(options.network)
    if (options.network !== 'main' && options.network !== 'test') {
      throw new Error('Run Connect API only supports mainnet and testnet')
    }
    options.api = 'run'
    super(options)
  }

  _broadcastUrl (network) { return `https://api.run.network/v1/${network}/tx` }
  _broadcastData (tx) { return { rawtx: tx.toString('hex') } }
  _fetchUrl (network, txid) { return `https://api.run.network/v1/${network}/tx/${txid}` }
  _fetchResp (data) { return jsonToTx(data) }
  _utxosUrl (network, script) { return `https://api.run.network/v1/${network}/utxos/${_scripthash(script)}` }
  _utxosResp (data, script) { return typeof data === 'string' ? JSON.parse(data) : data }
}

class MatterCloud extends RemoteBlockchain {}
class WhatsOnChain extends RemoteBlockchain {}

/*
class MatterCloud extends RemoteBlockchain {
  constructor (options) {
    options.network = parseNetwork(options.network)
    if (options.network !== 'main') throw new Error('MatterCloud API only supports mainnet')
    super(options)
  }

  _broadcastUrl (network) { return `https://api.mattercloud.net/api/v3/${network}/tx/send${this._suffix}` }
  _broadcastData (tx) { return { rawtx: tx.toString('hex') } }
  _fetchUrl (network, txid) { return `https://api.mattercloud.net/api/v3/${network}/tx/${txid}${this._suffix}` }
  _fetchResp (data) { return jsonToTx(data) }
  _utxosUrl (network, script) { return `https://api.mattercloud.net/api/v3/${network}/scripthash/${_scripthash(script)}/utxo${this._suffix}` }
  _utxosResp (data, script) { return data.map(o => { return Object.assign({}, o, { script }) }) }
  get _suffix () { return this.apiKey ? `?api_key=${this.apiKey}` : '' }
}

class WhatsOnChain extends RemoteBlockchain {
  constructor (options) {
    options.network = parseNetwork(options.network)
    if (options.network !== 'main' && options.network !== 'test' && options.network !== 'stn') {
      throw new Error('WhatsOnChain API only supports mainnet, testnet, and STN')
    }
    super(options)
  }

  _broadcastUrl (network) { return `https://api.whatsonchain.com/v1/bsv/${network}/tx/raw` }
  _broadcastData (tx) { return { txhex: tx.toString('hex') } }
  _utxosUrl (network, script) { return `https://api.whatsonchain.com/v1/bsv/${network}/script/${_scripthash(script)}/unspent` }
  _utxosResp (data, script) {
    return data.map(o => {
      return { txid: o.tx_hash, vout: o.tx_pos, satoshis: o.value, script }
    })
  }

  async fetch (txid, force = false) {
    const jsonUrl = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/hash/${txid}`
    const hexUrl = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/${txid}/hex`
    const [jsonResult, hexResult] = await Promise.all([
      REST._get(jsonUrl, this.timeout),
      REST._get(hexUrl, this.timeout)
    ])
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
*/

// ------------------------------------------------------------------------------------------------
// Helper methods
// ------------------------------------------------------------------------------------------------

function jsonToTx (json) {
  if (typeof json !== 'object') throw new Error(`JSON returned is invalid or not an object: ${json}`)
  const tx = new Transaction(json.hex || json.rawtx)
  tx.time = json.time * 1000 || Date.now()
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

function parseApi (api) {
  if (typeof api === 'string') return api
  throw new Error(`Unsupported api: ${api}`)
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

function parseCache (cache) {
  if (cache instanceof State) return cache
  if (typeof cache === 'undefined') return new Map()
  throw new Error(`Unsupported cache: ${cache}`)
}

// ------------------------------------------------------------------------------------------------
// Factory
// ------------------------------------------------------------------------------------------------

RemoteBlockchain.create = options => {
  switch (typeof options.api) {
    case 'string':
      switch (options.api) {
        case 'run': return new BlockchainServer(options)
        case 'bitindex': return new MatterCloud(options)
        case 'mattercloud': return new MatterCloud(options)
        case 'whatsonchain': return new WhatsOnChain(options)
      }
      break
    case 'undefined':
      // Only whatsonchain supports STN right now
      return options.network === 'stn' ? new WhatsOnChain(options) : new BlockchainServer(options)
  }
  throw new Error(`Invalid blockchain API: ${options.api}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = { BlockchainServer, MatterCloud, WhatsOnChain, RemoteBlockchain }
