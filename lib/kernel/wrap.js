/**
 * wrap.js
 *
 * Wrapping around API implementations to improve usability. These modify the actual API objects
 * because users will often call their methods directly and want this behavior externally.
 */

const { State, Cache, Purse, Owner } = require('./api')
const Log = require('./log')
const { _deepEqual } = require('./deep')
const StateFilter = require('./state-filter')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

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

  if (api instanceof State) {
    _wrapState(api)
  }

  if (api instanceof Cache) {
    _wrapCache(api)
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
