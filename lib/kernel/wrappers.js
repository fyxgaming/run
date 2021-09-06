/**
 * Wrappers around API implementations to write logs and update caches
 */

const { _assert } = require('./misc')
const Log = require('./log')
const { ClientModeError } = require('./errors')
const { Blockchain, Cache } = require('./api')
const bsv = require('bsv')

// ------------------------------------------------------------------------------------------------
// BlockchainWrapper
// ------------------------------------------------------------------------------------------------

class BlockchainWrapper {
  constructor (blockchain, cache, client) {
    _assert(blockchain instanceof Blockchain)
    _assert(cache instanceof Cache)

    this._blockchain = blockchain
    this._cache = cache
    this._client = client
  }

  // --------------------------------------------------------------------------
  // network
  // --------------------------------------------------------------------------

  get network () {
    return this._blockchain.network
  }

  // --------------------------------------------------------------------------
  // broadcast
  // --------------------------------------------------------------------------

  async broadcast (rawtx) {
    if (Log._infoOn) {
      const txid = new bsv.Transaction(rawtx).hash
      Log._info('Blockchain', 'Broadcast', txid)
    }

    const start = new Date()

    const txid = await this._blockchain.broadcast(rawtx)

    if (Log._debugOn) Log._debug('Blockchain', 'Broadcast (end): ' + (new Date() - start) + 'ms')

    await this._cache.set(`tx://${txid}`, rawtx)

    return txid
  }

  // --------------------------------------------------------------------------
  // fetch
  // --------------------------------------------------------------------------

  async fetch (txid) {
    if (Log._infoOn) Log._info('Blockchain', 'Fetch', txid)

    // The inventory may have non-jigs inside of it. These become banned.
    if (this._client) {
      const rawtx = await this._cache.get(`tx://${txid}`)
      if (!rawtx) throw new ClientModeError(txid, 'transaction')
      return rawtx
    }

    const start = new Date()

    const ret = await this._blockchain.fetch(txid)

    if (Log._debugOn) Log._debug('Blockchain', 'Fetch (end): ' + (new Date() - start) + 'ms')

    return ret
  }

  // --------------------------------------------------------------------------
  // utxos
  // --------------------------------------------------------------------------

  async utxos (script) {
    if (Log._infoOn) Log._info('Blockchain', 'Utxos', script)

    const start = new Date()

    const ret = await this._blockchain.utxos(script)

    if (Log._debugOn) Log._debug('Blockchain', 'Utxos (end): ' + (new Date() - start) + 'ms')

    return ret
  }

  // --------------------------------------------------------------------------
  // spends
  // --------------------------------------------------------------------------

  async spends (txid, vout) {
    if (Log._infoOn) Log._info('Blockchain', `Spends ${txid}_o${vout}`)

    if (this._client) {
      return await this._cache.get(`spend://${txid}_o${vout}`)
    }

    const start = new Date()

    const ret = await this._blockchain.spends(txid, vout)

    if (Log._debugOn) Log._debug('Blockchain', 'Spends (end): ' + (new Date() - start) + 'ms')

    return ret
  }

  // --------------------------------------------------------------------------
  // time
  // --------------------------------------------------------------------------

  async time (txid) {
    if (Log._infoOn) Log._info('Blockchain', 'Time', txid)

    if (this._client) {
      return await this._cache.get(`time://${txid}`)
    }

    const start = new Date()

    const ret = await this._blockchain.time(txid)

    if (Log._debugOn) Log._debug('Blockchain', 'Time (end): ' + (new Date() - start) + 'ms')

    return ret
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  BlockchainWrapper
}
