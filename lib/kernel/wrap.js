/**
 * wrap.js
 *
 * Wrapping around API implementations to improve usability. These modify the actual API objects
 * because users will often call their methods directly and want this behavior externally.
 */

const bsv = require('bsv')
const { Blockchain, State, Cache, Purse, Owner } = require('./api')
const Log = require('./log')
const { ClientModeError } = require('./error')
const RecentBroadcasts = require('./recent-broadcasts')
const { _text } = require('./misc')
const { _dedupUtxos } = require('./bsv')
const { _deepEqual } = require('./deep')
const StateFilter = require('./state-filter')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const HEX_REGEX = /^([a-fA-F0-9][a-fA-F0-9])*$/

const CONFIG_KEY_CODE_FILTER = 'config://code-filter'

// ------------------------------------------------------------------------------------------------
// _wrap
// ------------------------------------------------------------------------------------------------

/**
 * Wraps an API implementation, acquiring a $wrapper property
 */
function _wrap (api) {
  if (api.$wrapper) return

  api.$wrapper = {}

  if (api instanceof Blockchain) {
    _wrapBlockchain(api)
  }

  if (api instanceof State) {
    _wrapState(api)
  }

  if (api instanceof Cache) {
    _wrapCache(api)
  }
}

// ------------------------------------------------------------------------------------------------
// _wrapBlockchain
// ------------------------------------------------------------------------------------------------

/**
 * Modifies a Blockchain API implementation to:
 *
 *    - Log calls
 *    - Log performance in debug mode
 *    - Check the cache before making API calls
 *    - Store results inside the cache after calling
 *    - Enforce client mode
 *    - Verify the API responses
 *    - Cache recently broadcasted transactions
 *    - Update UTXO results with recently-broadcasted transactions
 *    - Dedup UTXO results (with a warning)
 *    - Allow passing a bsv Transaction object into broadcast()
 *    - Allow passing an address into utxos()
 *
 * This allows the implementation to just focus on making API calls.
 *
 * Other notes
 *
 *    - The api.$wrapper.cache property should usually be set to a Cache implementation after
 *    - The api.$wrapper.client property may be set to a boolean to enable/disable client mode
 */
function _wrapBlockchain (api) {
  // Save the current functions to call from our wrappers and also restore if we unwrap
  api.$wrapper.broadcast = api.broadcast
  api.$wrapper.fetch = api.fetch
  api.$wrapper.utxos = api.utxos
  api.$wrapper.spends = api.spends
  api.$wrapper.time = api.time

  // Wrap broadcast()
  api.broadcast = async (rawtx) => {
    // Allow both raw transactions and bsv transactions
    const tx = new bsv.Transaction(rawtx)
    rawtx = typeof rawtx === 'string' ? rawtx : tx.toString()

    // Basic transaction checks
    if (tx.inputs.length === 0) throw new Error('tx has no inputs')
    if (tx.outputs.length === 0) throw new Error('tx has no outputs')
    if (tx.verify() !== true) throw new Error(tx.verify())

    // Broadcast the transaction
    if (Log._infoOn) Log._info('Blockchain', 'Broadcast', tx.hash)
    const start = new Date()
    const txid = await api.$wrapper.broadcast.call(api, rawtx)
    if (Log._debugOn) Log._debug('Blockchain', 'Broadcast (end): ' + (new Date() - start) + 'ms')

    // Cache the transaction
    const cache = api.$wrapper.cache
    if (cache) {
      const cacheSets = []

      // Store the transaction time. Allow errors if there are dups.
      const previousTime = await cache.get(`time://${txid}`)
      if (typeof previousTime === 'undefined') {
        const promise = cache.set(`time://${txid}`, Date.now())
        if (promise instanceof Promise) promise.catch(e => {})
        cacheSets.push(promise)
      }

      // Mark inputs as spent
      for (const input of tx.inputs) {
        const prevtxid = input.prevTxId.toString('hex')
        const location = `${prevtxid}_o${input.outputIndex}`
        cacheSets.push(cache.set(`spend://${location}`, txid))
      }

      // Cache the transaction itself
      cacheSets.push(cache.set(`tx://${txid}`, rawtx))

      // Update our recent broadcasts
      cacheSets.push(RecentBroadcasts._addToCache(cache, tx, txid))

      // Wait for all cache updates to finish
      await Promise.all(cacheSets)
    }

    return txid
  }

  // Wrap fetch()
  api.fetch = async (txid) => {
    // Check the cache. In client mode, we must use the cache.
    const cache = api.$wrapper.cache
    const cachedTx = cache ? await cache.get(`tx://${txid}`) : undefined
    if (typeof cachedTx !== 'undefined') return cachedTx

    // In client mode, we do not allow fetches
    if (api.$wrapper.client) throw new ClientModeError(txid, 'transaction')

    // Fetch
    if (Log._infoOn) Log._info('Blockchain', 'Fetch', txid)
    const start = new Date()
    const rawtx = await api.$wrapper.fetch.call(api, txid)
    if (Log._debugOn) Log._debug('Blockchain', 'Fetch (end): ' + (new Date() - start) + 'ms')

    // Check the response is correct
    if (typeof rawtx !== 'string' || !rawtx.length || !HEX_REGEX.test(rawtx)) {
      throw new Error(`Invalid rawtx fetched for ${txid}: ${rawtx}`)
    }

    // Cache the transaction and its spends
    if (cache) {
      const cacheSets = []

      cacheSets.push(cache.set(`tx://${txid}`, rawtx))

      const bsvtx = new bsv.Transaction(rawtx)
      bsvtx.inputs.forEach(input => {
        const prevtxid = input.prevTxId.toString('hex')
        const location = `${prevtxid}_o${input.outputIndex}`
        cacheSets.push(cache.set(`spend://${location}`, txid))
      })

      await Promise.all(cacheSets)
    }

    return rawtx
  }

  // Wrap utxos()
  api.utxos = async (script) => {
    // Allow the user to pass an address, or bsv objects
    if (typeof script === 'string') {
      try {
        script = bsv.Script.fromAddress(script).toHex()
      } catch (e) {
        script = new bsv.Script(script).toHex()
      }
    } else if (script instanceof bsv.Address) {
      script = bsv.Script.fromAddress(script).toHex()
    } else if (script instanceof bsv.Script) {
      script = script.toHex()
    } else {
      throw new Error(`Invalid script: ${_text(script)}`)
    }

    // Call the API
    if (Log._infoOn) Log._info('Blockchain', 'Utxos', script)
    const start = new Date()
    let utxos = await api.$wrapper.utxos.call(api, script)
    if (Log._debugOn) Log._debug('Blockchain', 'Utxos (end): ' + (new Date() - start) + 'ms')

    // Check the response
    if (!Array.isArray(utxos) || utxos.some(utxo => {
      if (typeof utxo.txid !== 'string') return false
      if (utxo.txid.length !== 64) return false
      if (HEX_REGEX.test(utxo.txid)) return false
      if (typeof utxo.vout !== 'number') return false
      if (!Number.isInteger(utxo.vout)) return false
      if (utxo.vout < 0) return false
      if (typeof utxo.script !== 'string') return false
      if (!HEX_REGEX.test(utxo.script)) return false
      if (typeof utxo.satoshis !== 'number') return false
      if (!Number.isInteger(utxo.satoshis)) return false
    })) {
      throw new Error(`Received invalid utxos: ${utxos}`)
    }

    // Dedup the utxos
    utxos = _dedupUtxos(utxos)

    // Correct utxos with known recent broadcasts
    const cache = api.$wrapper.cache
    if (cache) {
      await RecentBroadcasts._correctUtxosUsingCache(cache, utxos, script)
    }

    return utxos
  }

  // Wrap spends()
  api.spends = async (txid, vout) => {
    // Check the cache. In client mode, we must use the cache.
    const cache = api.$wrapper.cache
    const cachedSpend = cache ? await cache.get(`spend://${txid}_o${vout}`) : undefined
    if (typeof cachedSpend !== 'undefined' || api.$wrapper.client) return cachedSpend

    // Call the API
    if (Log._infoOn) Log._info('Blockchain', `Spends ${txid}_o${vout}`)
    const start = new Date()
    const spend = await api.$wrapper.spends.call(api, txid, vout)
    if (Log._debugOn) Log._debug('Blockchain', 'Spends (end): ' + (new Date() - start) + 'ms')

    // Check the response
    if (spend !== null && !(typeof spend === 'string' && spend.length === 64 && HEX_REGEX.test(spend))) {
      throw new Error(`Invalid spend txid fetched for ${txid}_o${vout}: ${spend}`)
    }

    // Cache the spend
    if (spend) await cache.set(`spend://${txid}_${vout}`, spend)

    return spend
  }

  // Wrap time
  api.time = async (txid) => {
    // Check the cache. In client mode, we must use the cache.
    const cache = api.$wrapper.cache
    const cachedTime = cache ? await cache.get(`time://${txid}`) : undefined
    if (typeof cachedTime !== 'undefined' || api.$wrapper.client) return cachedTime

    // Call the API
    if (Log._infoOn) Log._info('Blockchain', 'Time', txid)
    const start = new Date()
    const time = await api.$wrapper.time.call(api, txid)
    if (Log._debugOn) Log._debug('Blockchain', 'Time (end): ' + (new Date() - start) + 'ms')

    // Check the response
    if (typeof time !== 'number' || time < 0) throw new Error(`Invalid time fetched for ${txid}: ${time}`)

    // Cache the time
    await cache.set(`time://${txid}`, time)

    return time
  }
}

// ------------------------------------------------------------------------------------------------
// _wrapState
// ------------------------------------------------------------------------------------------------

/**
 * Modifies a State API implementation to:
 *
 *    - Log calls
 *    - Log performance in debug mode
 *    - Check the cache before making API calls
 *    - Store results inside the cache after calling
 *    - Enforce client mode
 *    - Verify the API responses
 *
 * This allows the implementation to just focus on making API calls.
 *
 * Other notes
 *
 *    - The api.$wrapper.cache property should usually be set to a Cache implementation after
 *    - The api.$wrapper.client property may be set to a boolean to enable/disable client mode
 */
function _wrapState (api) {
  // Save the current functions to call from our wrappers and also restore if we unwrap
  api.$wrapper.state = api.state

  api.state = async (location) => {
    // Check the cache. In client mode, we must use the cache.
    const cacheKey = `${location.includes('?') ? 'berry' : 'jig'}://${location}`
    const cache = api.$wrapper.cache
    const cachedState = await cache.get(cacheKey)
    if (typeof cachedState !== 'undefined' || api.$wrapper.client) return cachedState

    // Call the API
    if (Log._infoOn) Log._info('State', 'State', location)
    const start = new Date()
    const state = api.$wrapper.state.call(api, location)
    if (Log._debugOn) Log._debug('State', 'State (end): ' + (new Date() - start) + 'ms')

    // Check the response
    if (typeof state !== 'undefined') {
      try {
        const s = JSON.stringify(state)
        const v = JSON.parse(s)
        if (JSON.stringify(v) !== s) throw new Error()
      } catch (e) {
        throw new Error(`Invalid state fetched for ${location}: ${state}`)
      }
    }

    // Cache the state
    if (cache && state) {
      await cache.set(cacheKey, state)
    }

    return state
  }
}

// ------------------------------------------------------------------------------------------------
// _wrapCache
// ------------------------------------------------------------------------------------------------

/**
 * Modifies a Cache API implementation to:
 *
 *    - Log calls
 *    - Log performance in debug mode
 *    - Check that values set or retrieved are JSON
 *    - Update the code filter key
 *
 * This allows the implementation to just focus on making API calls.
 */
function _wrapCache (api) {
  // Save the current functions to call from our wrappers and also restore if we unwrap
  api.$wrapper.get = api.get
  api.$wrapper.set = api.set

  // Wrap get()
  api.get = async (key) => {
    // Call the API
    if (Log._infoOn) Log._info('Cache', 'Get', key)
    const start = new Date()
    const value = await api.$wrapper.get.call(api, key)
    if (Log._debugOn) Log._debug('Cache', 'Get (end): ' + (new Date() - start) + 'ms')
    if (Log._debugOn) Log._debug('Cache', 'Value', JSON.stringify(value, 0, 3))

    // Check the response
    if (typeof value !== 'undefined') {
      try {
        const s = JSON.stringify(value)
        const v = JSON.parse(s)
        if (JSON.stringify(v) !== s) throw new Error()
      } catch (e) {
        throw new Error(`Invalid value retrieved for ${key}: ${value}`)
      }
    }

    return value
  }

  // Wrap set()
  api.set = async (key, value) => {
    // Check the key is valid
    if (typeof key !== 'string' || !key.length) throw new Error(`Invalid key ${key}`)

    // Check the value is JSON
    try {
      const s = JSON.stringify(value)
      const v = JSON.parse(s)
      if (JSON.stringify(v) !== s) throw new Error()
    } catch (e) {
      throw new Error(`Invalid JSON value for ${key}: ${value}`)
    }

    // If we are overwriting an immutable previous value, check that the values are the same.
    const immutable = ['jig', 'berry', 'tx'].includes(key.split('://')[0])
    const previousValue = await api.$wrapper.get.call(api, key)
    if (typeof previousValue !== 'undefined' && immutable && !_deepEqual(value, previousValue)) {
      if (Log._errorOn) Log._error('Cache', 'Expected:', JSON.stringify(previousValue, 0, 3))
      if (Log._errorOn) Log._error('Cache', 'Actual:', JSON.stringify(value, 0, 3))

      const hint = 'This is an internal Run bug. Please report it to the library developers.'
      throw new Error(`Attempt to set different values for the same key: ${key}\n\n${hint}`)
    }

    // Call the API
    if (Log._infoOn) Log._info('Cache', 'Set', key)
    if (Log._debugOn) Log._debug('Cache', 'Value', JSON.stringify(value, 0, 3))
    const start = new Date()
    const ret = await api.$wrapper.set.call(api, key, value)
    if (Log._debugOn) Log._debug('Cache', 'Set (end): ' + (new Date() - start) + 'ms')

    // Update the code filter
    if (key.startsWith('jig://') && value.kind === 'code') {
      const filter = await api.$wrapper.get.call(api, CONFIG_KEY_CODE_FILTER) || StateFilter.create()
      StateFilter.add(filter, key)
      await api.$wrapper.set.call(api, CONFIG_KEY_CODE_FILTER, filter)
    }

    return ret
  }
}

// ------------------------------------------------------------------------------------------------
// _unwrap
// ------------------------------------------------------------------------------------------------

function _unwrap (api) {
  if (!api.$wrapper) return

  if (api instanceof Blockchain) {
    api.broadcast = api.$wrapper.broadcast
    api.fetch = api.$wrapper.fetch
    api.utxos = api.$wrapper.utxos
    api.spends = api.$wrapper.spends
    api.time = api.$wrapper.time
  }

  if (api instanceof State) {
    api.state = api.$wrapper.state
  }

  if (api instanceof Cache) {
    api.get = api.$wrapper.get
    api.set = api.$wrapper.set
  }

  if (api instanceof Purse) {
    api.pay = api.$wrapper.pay
    api.broadcast = api.$wrapper.broadcast
  }

  if (api instanceof Owner) {
    api.sign = api.$wrapper.sign
    api.nextOwner = api.$wrapper.nextOwner
  }

  delete api.$wrapper
}

// ------------------------------------------------------------------------------------------------

module.exports = { _wrap, _unwrap }
