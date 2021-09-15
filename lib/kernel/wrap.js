/**
 * wrap.js
 *
 * Wrapping around API implementations to improve usability. These modify the actual API objects
 * because users will often call their methods directly and want this behavior externally.
 */

const { State } = require('./api')
const Log = require('./log')

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
}

// ------------------------------------------------------------------------------------------------
// _wrapState
// ------------------------------------------------------------------------------------------------

/**
 * Modifies a State API implementation to:
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

module.exports = { _wrap }
