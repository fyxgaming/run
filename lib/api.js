const axios = require('axios')
const { Address, Script, Transaction } = require('bsv')
const util = require('./util')

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

function txJsonToObject (json) {
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

const starApiHost = 'https://api.star.store'
const starApi = {
  broadcastUrl: network => `${starApiHost}/v1/${network}/tx`,
  broadcastData: tx => { return { rawtx: tx.toBuffer().toString('hex') } },
  fetchUrl: (network, txid) => `${starApiHost}/v1/${network}/tx/${txid}`,
  fetchResp: data => txJsonToObject(data),
  utxosUrl: (network, address) => `${starApiHost}/v1/${network}/utxos/${address.toString()}`,
  utxosResp: (data, address) => data
}

const bitIndexApi = {
  broadcastUrl: network => `https://api.bitindex.network/api/v3/${network}/tx/send`,
  broadcastData: tx => { return { rawtx: tx.toBuffer().toString('hex') } },
  fetchUrl: (network, txid) => `https://api.bitindex.network/api/v3/${network}/tx/${txid}`,
  fetchResp: data => { const ret = txJsonToObject(data); ret.confirmations = ret.confirmations || 0; return ret },
  utxosUrl: (network, address) => `https://api.bitindex.network/api/v3/${network}/addr/${address.toString()}/utxo`,
  utxosResp: (data, address) => data.map(o => { return { ...o, script: new Script(o.scriptPubKey) } })
}

const whatsOnChainApi = {
  broadcastUrl: network => `https://api.whatsonchain.com/v1/bsv/${network}/tx/raw`,
  broadcastData: tx => { return { txhex: tx.toBuffer().toString('hex') } },
  fetchUrl: (network, txid) => `https://api.whatsonchain.com/v1/bsv/${network}/tx/hash/${txid}`,
  fetchResp: data => { const ret = txJsonToObject(data); ret.confirmations = ret.confirmations || 0; return ret },
  utxosUrl: (network, address) => `https://api.whatsonchain.com/v1/bsv/${network}/address/${address.toString()}/unspent`,
  utxosResp: (data, address) => data.map(o => {
    return { txid: o.tx_hash, vout: o.tx_pos, satoshis: o.value, script: Script.fromAddress(address) }
  })
}

// TODO: Should we have a global cache strategy, that aligns with code, jig, and api?
const DEFAULT_TX_CACHE_MAX_SIZE = 10000 // max number of txns to cache
const DEFAULT_TX_CACHE_EXPIRATION = 10 * 60 * 1000 // 10 minutes until transactions must be refetched
const DEFAULT_BROADCAST_CACHE_TIME = 10 * 60 * 1000 // 10 minutes until we stop correcting for broadcasted transactions

class Api {
  constructor (options) {
    this.network = options.network
    this.bsvNetwork = util.bsvNetwork(options.network)
    if (typeof options.api === 'string') {
      this.api = options.api === 'bitindex' ? bitIndexApi
        : options.api === 'whatsonchain' ? whatsOnChainApi : starApi
    } else if (typeof options.api === 'object') {
      this.api = options.api
    } else {
      this.api = starApi
    }
    this.axios = axios.create({ timeout: 10000 })
    this.txCache = new Map() // txid -> tx
    this.txCacheMaxSize = typeof options.cacheSize === 'undefined' ? DEFAULT_TX_CACHE_MAX_SIZE : options.cacheSize
    this.txCacheExpiration = typeof options.cacheExpiration === 'undefined' ? DEFAULT_TX_CACHE_EXPIRATION : options.cacheExpiration
    this.broadcastCache = [] // Array<Transaction>
    this.broadcastCacheTime = DEFAULT_BROADCAST_CACHE_TIME
    this.requests = new Map() // txid|address -> Array<Function>
    this.logger = options.logger
  }

  async broadcast (tx) {
    // verify the tx locally. it is faster to problems errors here than to wait for a server response.
    if (tx.inputs.length === 0) throw new Error('tx has no inputs')
    if (tx.outputs.length === 0) throw new Error('tx has no outputs')
    if (tx.getFee() < tx.toBuffer().length) throw new Error('tx fee too low')
    if (tx.verify() !== true) throw new Error(tx.verify())
    if (tx.isFullySigned() !== true) throw new Error('tx not fully signed')

    // broadcast the transaction
    await this._post(this.api.broadcastUrl(this.network), this.api.broadcastData(tx))

    // cache the transaction for fetches
    const now = Date.now()
    tx.time = now
    tx.lastFetchedTime = now
    tx.outputs.forEach(o => { o.spentTxId = null; o.spentIndex = null; o.spentHeight = null })
    this.txCache.set(tx.hash, tx)

    // if the fetch cache is full, remove the oldest item
    if (this.txCache.size > this.txCacheMaxSize) {
      const oldestTxid = this.txCache.keys().next().value
      this.txCache.delete(oldestTxid)
    }

    // remember transactions that we broadcast so that we can correct the utxos returned from the
    // server if they are stale. many APIs don't index utxos right away.
    this.broadcastCache = this.broadcastCache.filter(tx => now - tx.time < this.broadcastCacheTime)
    this.broadcastCache.push(tx)

    for (let i = 0; i < tx.inputs.length; i++) {
      const input = tx.inputs[i]
      const cached = this.txCache.get(input.prevTxId.toString('hex'))
      if (cached) {
        cached.outputs[input.outputIndex].spentTxId = tx.hash
        cached.outputs[input.outputIndex].spentIndex = i
        cached.outputs[input.outputIndex].spentHeight = -1
      }
    }
  }

  async fetch (txid, refresh = false) {
    // if this transaction is cached, and the transaction is recent, then return it directly
    const cached = this.txCache.get(txid)
    if (!refresh && cached && Date.now() - cached.lastFetchedTime < this.txCacheExpiration) {
      this.txCache.delete(txid)
      this.txCache.set(txid, cached)
      return cached
    }

    // if we already are fetching this transaction, then piggy-back on the response
    const inProgressRequestCallbacks = this.requests.get(txid)
    if (inProgressRequestCallbacks) {
      return new Promise((resolve, reject) => {
        inProgressRequestCallbacks.push({ resolve, reject })
      })
    }

    // otherwise, create a new callback set
    this.requests.set(txid, [])

    try {
      // fetch the transaction by its txid
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

      // cache it
      tx.lastFetchedTime = Date.now()
      this.txCache.set(txid, tx)

      // if the cache is full, remove the oldest item
      if (this.txCache.size > this.txCacheMaxSize) {
        const oldestTxid = this.txCache.keys().next().value
        this.txCache.delete(oldestTxid)
      }

      // if other code is waiting for this same call, call their callbacks too
      this.requests.get(txid).forEach(o => o.resolve(tx))

      return tx
    } catch (e) {
      // if the request fails, notify all other code that is waiting for this callback
      this.requests.get(txid).forEach(o => o.reject(e))

      throw e
    } finally {
      // whether fetch succeeds or fails, remove the callbacks for this request
      this.requests.delete(txid)
    }
  }

  async utxos (address) {
    // whether we are passed a bsv.Address or a string, convert it to a string
    address = new Address(address, this.bsvNetwork).toString()

    // if we are already querying the utxos for this address, piggy-back on that request
    const inProgressRequestCallbacks = this.requests.get(address)
    if (inProgressRequestCallbacks) {
      return new Promise((resolve, reject) => {
        inProgressRequestCallbacks.push({ resolve, reject })
      })
    }

    // create new callbacks for other code to piggy-back on
    this.requests.set(address, [])

    try {
      // query the utxos
      const data = (await this._get(this.api.utxosUrl(this.network, address))).data
      const utxos = this.api.utxosResp(data, address)

      // in case the utxos from the server have any duplicates, dedup them
      const dedupedUtxos = this._dedupUtxos(utxos)

      // the server may not index utxos right away. update the utxos with our own broadcasted txns
      const correctedUtxos = this._correctForServerUtxoIndexDelay(dedupedUtxos, address)

      // notify all other code that was also waiting for this request
      this.requests.get(address).forEach(o => o.resolve(correctedUtxos))

      return correctedUtxos
    } catch (e) {
      // notify all other code that this request failed
      this.requests.get(address).forEach(o => o.reject(e))

      throw e
    } finally {
      // whether we succeeded or failed, remove the callbacks for this request
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
        if (this.logger) this.logger.warn(`duplicate utxo returned from server: ${location}`)
        return false
      }
    })
  }

  _correctForServerUtxoIndexDelay (utxos, address) {
    // first remove all expired txns from our broadcast cache
    const now = Date.now()
    this.broadcastCache = this.broadcastCache.filter(tx => now - tx.time < this.broadcastCacheTime)

    // add all utxos from our broadcast cache for this address that aren't already there
    this.broadcastCache.forEach(tx => {
      tx.outputs.forEach((output, vout) => {
        if (output.script.toAddress(this.bsvNetwork).toString() === address &&
              !utxos.some(utxo => utxo.txid === tx.hash && utxo.vout === vout)) {
          utxos.push({ txid: tx.hash, vout, script: output.script, satoshis: output.satoshis })
        }
      })
    })

    // remove all utxos that we know are spent because they are in our broadcast cache
    this.broadcastCache.forEach(tx => {
      const inputSpendsUtxo = (input, utxo) =>
        input.prevTxId.toString('hex') === utxo.txid &&
        input.outputIndex === utxo.vout

      utxos = utxos.filter(utxo => !tx.inputs.some(input => inputSpendsUtxo(input, utxo)))
    })

    return utxos
  }

  async _post (url, data) {
    if (this.logger) this.logger.info(`POST ${url}`)
    return call(this.axios.post(url, data))
  }

  async _get (url) {
    if (this.logger) this.logger.info(`GET ${url}`)
    return call(this.axios.get(url))
  }

  _copyCache (blockchain) {
    // TODO: Should this respect the max cache sizes?
    // TODO: Add tests
    this.txCache = new Map(blockchain.txCache)
    this.broadcastCache = [...blockchain.broadcastCache]
  }
}

module.exports = Api
