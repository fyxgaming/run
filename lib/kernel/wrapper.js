/**
 * Wrappers around API implementations to write logs and update caches
 */

const { _assert } = require('./misc')
const Log = require('./log')
const { ClientModeError, NotImplementedError } = require('./error')
const { Blockchain, State, Cache, Owner, Purse } = require('./api')
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
    _assert(!blockchain || blockchain instanceof Blockchain)
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

    if (!this._blockchain) throw new NotImplementedError('Cannot call broadcast(). Blockchain not specified.')

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

    if (!this._blockchain) throw new NotImplementedError('Cannot call fetch(). Blockchain not specified.')

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

    if (!this._blockchain) throw new NotImplementedError('Cannot call spends(). Blockchain not specified.')

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

    if (!this._blockchain) throw new NotImplementedError('Cannot call time(). Blockchain not specified.')

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
    _assert(!state || state instanceof State)
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

    const cacheKey = `${location.includes('?') ? 'berry' : 'jig'}://${location}`
    const cacheValue = await this._cache.get(cacheKey)
    if (typeof cacheValue !== 'undefined') return cacheValue

    const ret = this._state ? await this._state.state(location) : undefined

    if (Log._debugOn) Log._debug('State', 'State (end): ' + (new Date() - start) + 'ms')

    return ret
  }
}

// ------------------------------------------------------------------------------------------------
// CacheWrapper
// ------------------------------------------------------------------------------------------------

class CacheWrapper {
  constructor (cache) {
    _assert(!cache || cache instanceof Cache)

    this._cache = cache
  }

  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  async get (key) {
    if (Log._infoOn) Log._info('Cache', 'Get', key)

    const start = new Date()

    if (!this._cache) return undefined

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

    if (!this._cache) return

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
    _assert(!owner || owner instanceof Owner)

    this._owner = owner
  }

  // --------------------------------------------------------------------------
  // nextOwner
  // --------------------------------------------------------------------------

  async nextOwner () {
    if (Log._infoOn) Log._info('Owner', 'Next owner')

    const start = new Date()

    if (!this._owner) throw new NotImplementedError('Cannot call nextOwner(). Owner not specified.')

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

  // --------------------------------------------------------------------------
  // sign
  // --------------------------------------------------------------------------

  async sign (rawtx, parents, locks) {
    if (Log._infoOn) Log._info('Owner', 'Sign')

    const start = new Date()

    if (!this._owner) return

    const ret = await this._owner.sign(rawtx, parents, locks)

    if (Log._debugOn) Log._debug('Owner', 'Sign (end): ' + (new Date() - start) + 'ms')

    return ret
  }
}

// ------------------------------------------------------------------------------------------------
// PurseWrapper
// ------------------------------------------------------------------------------------------------

class PurseWrapper {
  constructor (purse) {
    _assert(purse instanceof Purse)

    this._purse = purse
  }

  // --------------------------------------------------------------------------
  // pay
  // --------------------------------------------------------------------------

  async pay (rawtx, parents) {
    if (Log._infoOn) Log._info('Purse', 'Pay')

    const start = new Date()

    const ret = await this._purse.pay(rawtx, parents)

    if (Log._debugOn) Log._debug('Purse', 'Pay (end): ' + (new Date() - start) + 'ms')

    return ret
  }

  // --------------------------------------------------------------------------
  // broadcast
  // --------------------------------------------------------------------------

  async broadcast (rawtx) {
    if (typeof this._purse.broadcast === 'function') {
      if (Log._infoOn) Log._info('Purse', 'Broadcast')

      const start = new Date()

      const ret = await this._purse.broadcast(rawtx)

      if (Log._debugOn) Log._debug('Purse', 'Broadcast (end): ' + (new Date() - start) + 'ms')

      return ret
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  BlockchainWrapper,
  StateWrapper,
  CacheWrapper,
  OwnerWrapper,
  PurseWrapper
}
