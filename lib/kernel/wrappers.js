/**
 * Wrappers around API implementations to write logs and update caches
 */

const { _assert } = require('./misc')
const Log = require('./log')
const { ClientModeError } = require('./errors')
const { Blockchain, State, Cache } = require('./api')
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
// StateWrapper
// ------------------------------------------------------------------------------------------------

class StateWrapper {
  constructor (state, cache) {
    _assert(state instanceof State)
    _assert(cache instanceof Cache)
    this._state = state
    this._cache = cache
  }

  // --------------------------------------------------------------------------
  // state
  // --------------------------------------------------------------------------

  async state (location) {
    if (Log._infoOn) Log._info('State', 'State', location)

    const start = new Date()

    try {
      const cacheKey = `${location.includes('?') ? 'berry' : 'jig'}://${location}`
      const cacheValue = await this._cache.get(cacheKey)
      if (typeof cacheValue !== 'undefined') return cacheValue

      return await this._state.state(location)
    } finally {
      if (Log._debugOn) Log._debug('State', 'State (end): ' + (new Date() - start) + 'ms')
    }
  }

  // --------------------------------------------------------------------------
  // trusted
  // --------------------------------------------------------------------------

  async trusted (txid) {
    if (Log._infoOn) Log._info('State', 'Trusted', txid)

    const start = new Date()

    try {
      const cacheKey = `trust://${txid}`
      const cacheValue = await this._cache.get(cacheKey)
      if (typeof cacheValue !== 'undefined') return cacheValue

      return await this._state.trusted(txid)
    } finally {
      if (Log._debugOn) Log._debug('State', 'Trusted (end): ' + (new Date() - start) + 'ms')
    }
  }

  // --------------------------------------------------------------------------
  // banned
  // --------------------------------------------------------------------------

  async banned (location) {
    if (Log._infoOn) Log._info('State', 'Banned', location)

    const start = new Date()

    try {
      const cacheKey = `ban://${location}`
      const cacheValue = await this._cache.get(cacheKey)
      if (typeof cacheValue !== 'undefined') return cacheValue

      return await this._state.banned(location)
    } finally {
      if (Log._debugOn) Log._debug('State', 'Banned (end): ' + (new Date() - start) + 'ms')
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  BlockchainWrapper,
  StateWrapper
}
