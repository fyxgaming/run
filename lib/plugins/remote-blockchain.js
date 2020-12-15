/**
 * remote-blockchain.js
 *
 * Blockchain implementation that connects to a remote server
 */

const { Address, Script, Transaction } = require('bsv')
const { _bsvNetwork, _text } = require('../util/misc')
const { NotImplementedError } = require('../util/errors')
const { _scripthash } = require('../util/bsv')
const { Cache } = require('../kernel/api')
const Log = require('../util/log')

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
  // --------------------------------------------------------------------------
  // To be implemented in subclasses
  // --------------------------------------------------------------------------

  async _postTransaction (rawtx) { throw new NotImplementedError() }
  async _getTransactionData (txid) { throw new NotImplementedError() }
  async _getUtxos (scripthash, script) { throw new NotImplementedError() }

  // --------------------------------------------------------------------------
  // constructor()
  // --------------------------------------------------------------------------

  constructor (options = {}) {
    this.network = _parseNetwork(options.network)
    this.api = _parseApi(options.api)
    this.apiKey = _parseApiKey(options.apiKey)
    this.cache = _parseCache(options.cache)
    this.bsvNetwork = _bsvNetwork(this.network)

    this._requests = new Map() // txid|scripthash -> [Promise]
    this._broadcasts = [] // [tx, txid]
    this._indexingDelay = 10 * 1000

    this._copyCache(options.lastBlockchain)
  }

  // --------------------------------------------------------------------------
  // broadcast()
  // --------------------------------------------------------------------------

  async broadcast (rawtx) {
    // Allow both raw transactions and bsv transactions
    const tx = new Transaction(rawtx)
    const txid = tx.hash
    rawtx = tx.toString('hex')

    // Verify the tx locally. It is faster to find problems here than to wait for a server response.
    if (tx.inputs.length === 0) throw new Error('tx has no inputs')
    if (tx.outputs.length === 0) throw new Error('tx has no outputs')
    if (tx.verify() !== true) throw new Error(tx.verify())

    // Broadcast the transaction
    await this._postTransaction(rawtx)

    // Store the transaction time. Allow errors if there are dups.
    const promises = []
    if (!(await this.cache.get(`time://${txid}`))) {
      const promise = this.cache.set(`time://${txid}`, Date.now())
      if (promise instanceof Promise) promise.catch(e => {})
      promises.push(promise)
    }

    // Mark inputs as spent
    for (const input of tx.inputs) {
      const prevtxid = input.prevTxId.toString('hex')
      const location = `${prevtxid}_o${input.outputIndex}`
      promises.push(this.cache.set(`spend://${location}`, txid))
    }

    // Cache the transaction itself
    promises.push(this.cache.set(`tx://${txid}`, rawtx))

    // Wait for all cache updates to finish
    await Promise.all(promises)

    // Put the transaction into a recent broadcast list used to correct server UTXOs
    this._broadcasts.filter(([tx]) => Date.now() - tx.time < this._indexingDelay)
    tx.time = Date.now()
    this._broadcasts.push([tx, txid])

    return txid
  }

  // --------------------------------------------------------------------------
  // fetch()
  // --------------------------------------------------------------------------

  async fetch (txid) {
    const cachedTx = await this.cache.get(`tx://${txid}`)
    if (cachedTx) return cachedTx

    const { rawtx } = await this._getAndCacheTransactionData(txid)
    return rawtx
  }

  // --------------------------------------------------------------------------
  // utxos()
  // --------------------------------------------------------------------------

  async utxos (script) {
    // Allow addresses
    if (typeof script === 'string') {
      try {
        script = Script.fromAddress(script)
      } catch (e) {
        script = new Script(script)
      }
    } else if (script instanceof Address) {
      script = Script.fromAddress(script)
    } else if (script instanceof Script) {
      // no-op
    } else {
      throw new Error(`Invalid script: ${_text(script)}`)
    }

    const scripthash = _scripthash(script)

    // If we are already querying the utxos for this address, piggy-back on that request
    const prior = this._requests.get(scripthash)
    if (prior) return new Promise((resolve, reject) => prior.push({ resolve, reject }))

    // Create a new promise list for other code to piggy-back on
    this._requests.set(scripthash, [])

    try {
      // Query the utxos
      const utxos = await this._getUtxos(scripthash, script.toString('hex'))

      if (!Array.isArray(utxos)) {
        throw new Error(`Received invalid utxos for ${script}\n\n: Type: ${typeof utxos}\n\nNetwork: ${this.network}`)
      }

      // In case the utxos from the server have any duplicates, dedup them
      const dedupedUtxos = this._dedupUtxos(utxos)

      // The server may not index utxos right away. update the utxos with our own broadcasted txns
      const correctedUtxos = await this._correctForServerUtxoIndexingDelay(dedupedUtxos, script)

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
  }

  // --------------------------------------------------------------------------
  // time()
  // --------------------------------------------------------------------------

  async time (txid) {
    const cachedTime = await this.cache.get(`time://${txid}`)
    if (cachedTime) return cachedTime

    const { time } = await this._getAndCacheTransactionData(txid)
    return time
  }

  // --------------------------------------------------------------------------
  // spends()
  // --------------------------------------------------------------------------

  async spends (txid, vout) {
    const cachedSpend = await this.cache.get(`spend://${txid}_o${vout}`)
    if (cachedSpend) return cachedSpend

    const { spends } = await this._getAndCacheTransactionData(txid)
    return spends[vout]
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  async _getAndCacheTransactionData (txid) {
    // If we are already fetching this transaction, then piggy-back on the response
    const priors = this._requests.get(txid)
    if (priors) return new Promise((resolve, reject) => priors.push({ resolve, reject }))

    // Otherwise, create a new promise list for this request
    this._requests.set(txid, [])

    try {
      const { rawtx, time, spends } = await this._getTransactionData(txid)

      // Cache it
      const promises = []
      promises.push(this.cache.set(`tx://${txid}`, rawtx))
      if (!(await this.cache.get(`time://${txid}`))) {
        const promise = this.cache.set(`time://${txid}`, time * 1000)
        if (promise instanceof Promise) promise.catch(e => {})
        promises.push(promise)
      }
      spends.forEach((spend, vout) => {
        if (spend) promises.push(this.cache.set(`spend://${txid}_o${vout}`, spend))
      })

      // Record the spends
      const tx = new Transaction(rawtx)
      for (const input of tx.inputs) {
        const prevtxid = input.prevTxId.toString('hex')
        const location = `${prevtxid}_o${input.outputIndex}`
        promises.push(this.cache.set(`spend://${location}`, txid))
      }

      // Wait for all cache updates to finish
      await Promise.all(promises)

      const data = { rawtx, time, spends }

      this._requests.get(txid).forEach(promise => promise.resolve(data))

      return data
    } catch (e) {
      // If the request fails, notify all other code that is waiting for this request
      this._requests.get(txid).forEach(promise => promise.reject(e))

      throw e
    } finally {
      // Whether fetch succeeds or fails, remove all callbacks for this request
      this._requests.delete(txid)
    }
  }

  _copyCache (lastBlockchain) {
    if (!lastBlockchain) return
    if (this.network !== lastBlockchain.network) return
    this.cache = lastBlockchain.cache
    this._broadcasts = lastBlockchain._broadcasts
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
        if (Log._warnOn) Log._warn(TAG, 'Duplicate utxo returned from server:', location)
        return false
      }
    })
  }

  async _correctForServerUtxoIndexingDelay (utxos, script) {
    // First remove all expired txns from our broadcast cache
    this._broadcasts.filter(([tx]) => Date.now() - tx.time < this._indexingDelay)

    // Add all utxos from our broadcast cache for this script that aren't already there
    this._broadcasts.forEach(([tx, txid]) => {
      tx.outputs.forEach((output, vout) => {
        if (output.script.equals(script) && !utxos.some(utxo => utxo.txid === txid && utxo.vout === vout)) {
          utxos.push({ txid, vout, script: output.script, satoshis: output.satoshis })
        }
      })
    })

    // Remove all utxos that we know are spent because they are in our broadcast cache
    this._broadcasts.forEach(([tx]) => {
      const inputSpendsUtxo = (input, utxo) =>
        input.prevTxId.toString('hex') === utxo.txid &&
        input.outputIndex === utxo.vout

      utxos = utxos.filter(utxo => !tx.inputs.some(input => inputSpendsUtxo(input, utxo)))
    })

    // Remove all utxos that we know are spent because we spent and cached them
    const locations = utxos.map(utxo => utxo.txid + '_o' + utxo.vout)
    const promises = locations.map(location => this.cache.get('spend://' + location))
    const spends = await Promise.all(promises)
    utxos = utxos.filter((utxo, n) => !spends[n])

    return utxos
  }
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function _parseNetwork (network) {
  if (typeof network === 'undefined') return 'main'
  if (network === 'main' || network === 'test' || network === 'stn') return network
  throw new Error(`Unsupported network: ${network}`)
}

function _parseApi (api) {
  if (typeof api === 'string') return api
  throw new Error(`Unsupported api: ${api}`)
}

function _parseApiKey (apiKey) {
  if (typeof apiKey === 'string' || typeof apiKey === 'undefined') return apiKey
  throw new Error(`Unsupported apiKey: ${apiKey}`)
}

function _parseCache (cache) {
  if (cache instanceof Cache) return cache
  if (typeof cache === 'undefined') return new Map()
  throw new Error(`Unsupported cache: ${cache}`)
}

// ------------------------------------------------------------------------------------------------
// Factory
// ------------------------------------------------------------------------------------------------

RemoteBlockchain.create = (options = {}) => {
  const RunConnect = require('./run-connect')
  const MatterCloud = require('./mattercloud')
  const WhatsOnChain = require('./whatsonchain')

  switch (typeof options.api) {
    case 'string':
      switch (options.api) {
        case 'run': return new RunConnect(options)
        case 'bitindex': return new MatterCloud(options)
        case 'mattercloud': return new MatterCloud(options)
        case 'whatsonchain': return new WhatsOnChain(options)
      }
      break
    case 'undefined':
      // Only whatsonchain supports STN right now
      return options.network === 'stn' ? new WhatsOnChain(options) : new RunConnect(options)
  }

  throw new Error(`Invalid blockchain API: ${options.api}`)
}

// ------------------------------------------------------------------------------------------------

RemoteBlockchain._parseNetwork = _parseNetwork
RemoteBlockchain._parseApi = _parseApi
RemoteBlockchain._parseCache = _parseCache

module.exports = RemoteBlockchain
