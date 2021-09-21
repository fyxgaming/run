/**
 * run-sdk-state.js
 *
 * Base class for a State implementation that automagically adds the following functionality:
 *
 *    - Log calls
 *    - Log performance in debug mode
 *    - Verify the API responses
 *    - Allows paying without providing parents
 *    - Cache state locally
 *    - Query the local cache before making a server call
 *
 * This allows the implementation to just focus on making API calls.
 */

const bsv = require('bsv')
const { State } = require('../kernel/api')
const { _text } = require('../kernel/misc')
const Log = require('../kernel/log')
const StateFilter = require('../kernel/state-filter')
const LocalCache = require('./local-cache')

// ------------------------------------------------------------------------------------------------
// RunSDKState
// ------------------------------------------------------------------------------------------------

class RunSDKState {
  hook (cache) {
    if (!(this instanceof State)) throw new Error(`${this.constructor.name} does not implement State`)

    // Setup default properties we use below
    this.cache = cache || new LocalCache()

    if (this.hooked) return
    else this.hooked = true

    // Save the current functions to call from our wrappers and also restore if we unwrap
    const originalPull = this.pull
    const originalBroadcast = this.broadcast
    const originalLocations = this.locations

    // ------------------------------------------------------------------------
    // pull
    // ------------------------------------------------------------------------

    this.pull = async (key, options) => {
      // Check that the key is valid
      if (typeof key !== 'string' || !key.length) throw new Error(`Invalid key: ${_text(key)}`)

      // Check the the options are valid
      if (typeof options !== 'undefined' && !(typeof options === 'object' && options)) throw new Error(`Invalid options: ${_text(options)}`)

      options = options || {}

      // Check if we have it in the cache
      const cachedValue = this.cache && await this.cache.get(key)
      if (typeof cachedValue !== 'undefined') return cachedValue

      // If we are making an API call, changes the options to filter out what we already have
      if (!options.filter) {
        const codeFilter = await this.cache.get('config://code-filter')
        if (codeFilter) options.filter = StateFilter.toBase64(codeFilter)
      }

      // Call the API
      if (Log._infoOn) Log._info(this.constructor.name, 'Pull', key, _text(options))
      const start = new Date()
      const value = await originalPull.call(this, key, options)
      if (Log._debugOn) Log._debug(this.constructor.name, 'Pull (end): ' + (new Date() - start) + 'ms')

      // We intentionally check for truthy. Trust will return true/false, and we don't want
      // to set false in our local cache to allow for changes in the Run-DB instance.
      if (value && this.cache) {
        await this.cache.set(key, value)
      }

      return value
    }

    // ------------------------------------------------------------------------
    // locations
    // ------------------------------------------------------------------------

    if (originalLocations) {
      this.locations = async (script) => {
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
        if (Log._infoOn) Log._info(this.constructor.name, 'Locations', script)
        const start = new Date()
        let locations = await originalLocations.call(this, script)
        if (Log._debugOn) Log._debug(this.constructor.name, 'Trusted (end): ' + (new Date() - start) + 'ms')

        // Check the response
        if (!Array.isArray(locations) || locations.some(location => typeof location !== 'string')) {
          throw new Error(`Received invalid locations: ${_text(locations)}`)
        }

        // Filter out duplicates
        const locationSet = new Set()
        locations = locations.filter(location => {
          if (!locationSet.has(location)) {
            locationSet.add(location)
            return true
          } else {
            if (Log._warnOn) Log._warn(this.constructor.name, 'Duplicate utxo returned from server:', location)
            return false
          }
        })

        return locations
      }
    }

    // ------------------------------------------------------------------------
    // broadcast
    // ------------------------------------------------------------------------

    if (originalBroadcast) {
      this.broadcast = async (rawtx) => {
        if (typeof rawtx !== 'string' || !rawtx.length) {
          throw new Error(`Invalid rawtx: ${_text(rawtx)}`)
        }

        // Call the API
        if (Log._infoOn) Log._info(this.constructor.name, 'Broadcast')
        const start = new Date()
        await originalBroadcast.call(this, rawtx)
        if (Log._debugOn) Log._debug(this.constructor.name, 'Broadcast (end): ' + (new Date() - start) + 'ms')
      }
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RunSDKState
