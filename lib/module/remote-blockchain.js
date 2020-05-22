/**
 * remote-blockchain.js
 *
 * Blockchain implementation that connects to a remote server
 */

const { Address, Script, Transaction } = require('bsv')
const { _bsvNetwork, _display } = require('../util/misc')
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
  // --------------------------------------------------------------------------
  // constructor()
  // --------------------------------------------------------------------------

  constructor (options = {}) {
    this.network = parseNetwork(options.network)
    this.api = parseApi(options.api)
    this.timeout = parseTimeout(options.timeout)
    this.cache = parseCache(options.cache)
    this.bsvNetwork = _bsvNetwork(this.network)

    this._requests = new Map() // txid|scripthash -> [Promise]
    this._broadcasts = [] // [tx]
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

    Log._debug(TAG, 'Broadcast', txid)

    // Verify the tx locally. It is faster to find problems here than to wait for a server response.
    if (tx.inputs.length === 0) throw new Error('tx has no inputs')
    if (tx.outputs.length === 0) throw new Error('tx has no outputs')
    if (tx.verify() !== true) throw new Error(tx.verify())

    // Broadcast the transaction
    await this._postTransaction(rawtx)

    // Store the transaction time. Allow errors if there are dups.
    const promises = []
    if (!(await this.cache.get(`time://${txid}`))) {
      promises.push(this.cache.set(`time://${txid}`, Date.now()).catch(e => {}))
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
    this._broadcasts.filter(tx => Date.now() - tx.time < this._indexingDelay)
    tx.time = Date.now()
    this._broadcasts.push(tx)
  }

  // --------------------------------------------------------------------------
  // fetch()
  // --------------------------------------------------------------------------

  async fetch (txid) {
    Log._debug(TAG, 'Fetch', txid)

    const cachedTx = await this.cache.get(`tx://${txid}`)
    if (cachedTx) return cachedTx

    const { rawtx } = await this._getAndCacheTransactionData(txid)
    return rawtx
  }

  // --------------------------------------------------------------------------
  // utxos()
  // --------------------------------------------------------------------------

  async utxos (script) {
    Log._debug(TAG, 'Utxos', script.toString())

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
      throw new Error(`Invalid script: ${_display(script)}`)
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
      const correctedUtxos = this._correctForServerUtxoIndexingDelay(dedupedUtxos, script)

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
    Log._debug(TAG, 'Time', txid)

    const cachedTime = await this.cache.get(`time://${txid}`)
    if (cachedTime) return cachedTime

    const { time } = await this._getAndCacheTransactionData(txid)
    return time
  }

  // --------------------------------------------------------------------------
  // spends()
  // --------------------------------------------------------------------------

  async spends (txid, vout) {
    Log._debug(TAG, 'Spends', txid, vout)

    const cachedSpend = await this.cache.get(`spend://${txid}_o${vout}`)
    if (cachedSpend) return cachedSpend

    const { spends } = await this._getAndCacheTransactionData(txid)
    return spends[vout]
  }

  // --------------------------------------------------------------------------
  // To be implemented in subclasses
  // --------------------------------------------------------------------------

  async _postTransaction (rawtx) { throw new NotImplementedError() }
  async _getTransactionData (txid) { throw new NotImplementedError() }
  async _getUtxos (scripthash, script) { throw new NotImplementedError() }

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
        promises.push(this.cache.set(`time://${txid}`, Date.now()).catch(e => {}))
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
        Log._warn(TAG, 'Duplicate utxo returned from server:', location)
        return false
      }
    })
  }

  _correctForServerUtxoIndexingDelay (utxos, script) {
    // First remove all expired txns from our broadcast cache
    this._broadcasts.filter(tx => Date.now() - tx.time < this._indexingDelay)

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
// Run Blockchain Server
// ------------------------------------------------------------------------------------------------

class BlockchainServer extends RemoteBlockchain {
  constructor (options) {
    options.network = parseNetwork(options.network)
    if (options.network !== 'main' && options.network !== 'test') {
      throw new Error('Run Blockchain Server only supports mainnet and testnet')
    }
    options.api = 'run'
    super(options)
  }

  async _postTransaction (rawtx) {
    const url = `https://api.run.network/v1/${this.network}/tx`
    await REST._post(url, { rawtx }, this.timeout)
  }

  async _getTransactionData (txid) {
    const url = `https://api.run.network/v1/${this.network}/tx/${txid}`
    const json = await REST._get(url, this.timeout)
    return {
      rawtx: json.hex,
      time: json.time,
      spends: json.vout.map(x => x.spentTxId)
    }
  }

  async _getUtxos (scripthash, script) {
    const url = `https://api.run.network/v1/${this.network}/utxos/${scripthash}`
    const data = await REST._get(url, this.timeout)
    return data
  }
}

// ------------------------------------------------------------------------------------------------
// MatterCloud
// ------------------------------------------------------------------------------------------------

class MatterCloud extends RemoteBlockchain {
  constructor (options) {
    options.network = parseNetwork(options.network)
    if (options.network !== 'main') {
      throw new Error('MatterCloud API only supports mainnet')
    }
    options.api = 'mattercloud'
    super(options)
  }

  async spends (txid, vout) {
    Log._debug(TAG, 'Spends', txid, vout)
    throw new NotImplementedError('WhatsOnChain API does not support spends')
  }

  async _postTransaction (rawtx) {
    const url = `https://api.run.network/v1/${this.network}/tx`
    await REST._post(url, { rawtx }, this.timeout)
  }

  async _getTransactionData (txid) {
    const url = `https://api.run.network/v1/${this.network}/tx/${txid}`
    const json = await REST._get(url, this.timeout)
    console.log(json)
    // return {
    // rawtx: json.hex,
    // time: json.time,
    // spends: json.vout.map(x => x.spentTxId)
    // }
  }

  async _getUtxos (scripthash, script) {
    const url = `https://api.run.network/v1/${this.network}/utxos/${scripthash}`
    const data = await REST._get(url, this.timeout)
    console.log(data)
    // return data
  }
}

// ------------------------------------------------------------------------------------------------
// WhatsOnChain
// ------------------------------------------------------------------------------------------------

class WhatsOnChain extends RemoteBlockchain {
  constructor (options) {
    options.network = parseNetwork(options.network)
    if (options.network !== 'main' && options.network !== 'test' && options.network !== 'stn') {
      throw new Error('WhatsOnChain API only supports mainnet, testnet, and STN')
    }
    options.api = 'whatsonchain'
    super(options)
  }

  async spends (txid, vout) {
    Log._debug(TAG, 'Spends', txid, vout)
    throw new NotImplementedError('WhatsOnChain API does not support spends')
  }

  async _postTransaction (rawtx) {
    const url = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/raw`
    await REST._post(url, { txhex: rawtx }, this.timeout)
  }

  async _getTransactionData (txid) {
    const jsonUrl = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/hash/${txid}`
    const hexUrl = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/${txid}/hex`

    const [jsonResult, hexResult] = await Promise.all([
      REST._get(jsonUrl, this.timeout),
      REST._get(hexUrl, this.timeout)
    ])

    const { time } = jsonResult
    const rawtx = hexResult
    const spends = []

    return { rawtx, time, spends }
  }

  async _getUtxos (scripthash, script) {
    if (this.network === 'stn') {
      Log._warn(TAG, 'Utxos are not available on STN')
      return []
    }

    const url = `https://api.whatsonchain.com/v1/bsv/${this.network}/script/${scripthash}/unspent`
    const data = await REST._get(url, this.timeout)

    return data.map(o => {
      return { txid: o.tx_hash, vout: o.tx_pos, satoshis: o.value, script }
    })
  }
}

/*
class MatterCloud extends RemoteBlockchain {
  _broadcastData (tx) { return { rawtx: tx.toString('hex') } }
  _fetchUrl (network, txid) { return `https://api.mattercloud.net/api/v3/${network}/tx/${txid}${this._suffix}` }
  _fetchResp (data) { return jsonToTx(data) }
  _utxosUrl (network, script) { return `https://api.mattercloud.net/api/v3/${network}/scripthash/${_scripthash(script)}/utxo${this._suffix}` }
  _utxosResp (data, script) { return data.map(o => { return Object.assign({}, o, { script }) }) }
  get _suffix () { return this.apiKey ? `?api_key=${this.apiKey}` : '' }
}

class WhatsOnChain extends RemoteBlockchain {
  _broadcastUrl (network) { return `https://api.whatsonchain.com/v1/bsv/${network}/tx/raw` }
  _broadcastData (tx) { return { txhex: tx.toString('hex') } }

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
}
*/

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
