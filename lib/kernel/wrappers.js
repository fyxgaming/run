/**
 * Wrappers around API implementations to write logs and update caches
 */

const { _assert } = require('./misc')
const Log = require('./log')
const { ClientModeError } = require('./errors')
const { Blockchain, State, Cache, Owner } = require('./api')
const StateFilter = require('./state-filter')
const bsv = require('bsv')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const CONFIG_KEY_CODE_FILTER = 'config://code-filter'

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
// CacheWrapper
// ------------------------------------------------------------------------------------------------

class CacheWrapper {
  constructor (cache) {
    _assert(cache instanceof Cache)

    this._cache = cache
  }

  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  async get (key) {
    if (Log._infoOn) Log._info('Cache', 'Get', key)

    const start = new Date()

    const value = await this._cache.get(key)

    if (Log._debugOn) Log._debug('Cache', 'Get (end): ' + (new Date() - start) + 'ms')
    if (Log._debugOn) Log._debug('Cache', 'Value', JSON.stringify(value, 0, 3))

    return value
  }

  // --------------------------------------------------------------------------
  // set
  // --------------------------------------------------------------------------

  async set (key, value) {
    if (Log._infoOn) Log._info('Cache', 'Set', key)
    if (Log._debugOn) Log._debug('Cache', 'Value', JSON.stringify(value, 0, 3))

    const start = new Date()

    const ret = await this._cache.set(key, value)

    // Update the code filter
    if (key.startsWith('jig://') && value.kind === 'code') {
      const filter = await this._cache.get(CONFIG_KEY_CODE_FILTER) || StateFilter.create()
      StateFilter.add(filter, key)
      await this._cache.set(CONFIG_KEY_CODE_FILTER, filter)
    }

    if (Log._debugOn) Log._debug('Cache', 'Set (end): ' + (new Date() - start) + 'ms')

    return ret
  }
}

// ------------------------------------------------------------------------------------------------
// OwnerWrapper
// ------------------------------------------------------------------------------------------------

class OwnerWrapper {
  constructor (owner) {
    _assert(owner instanceof Owner)

    this._owner = owner
  }

  async nextOwner () {
    if (Log._infoOn) Log._info('Owner', 'Next owner')
    const start = new Date()

    let ret = null
    if (typeof this._owner.owner === 'function') {
      Log._warn('Owner', 'Owner.prototype.owner() is deprecated. Please rename owner() to nextOwner().')
      ret = await this._owner.owner()
    } else {
      ret = await this._owner.nextOwner()
    }

    // TODO: Check that the owner is a valid lock
    // if (!(owner instanceof Lock))

    if (Log._debugOn) Log._debug('Owner', 'Next owner (end): ' + (new Date() - start) + 'ms')
    return ret
  }

  async sign (rawtx, parents, locks) {
    if (Log._infoOn) Log._info('Owner', 'Sign')
    const start = new Date()

    const ret = await this._owner.sign(rawtx, parents, locks)

    if (Log._debugOn) Log._debug('Owner', 'Sign (end): ' + (new Date() - start) + 'ms')
    return ret
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  BlockchainWrapper,
  StateWrapper,
  CacheWrapper,
  OwnerWrapper
}
