/**
 * run-sdk-cache.js
 *
 * Base class for a Cache implementation that automagically adds the following functionality:
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
 *    - The cache property will be set to a Cache implementation by Run
 *    - The client property will be set to a boolean by Run
 */

const { Cache } = require('../kernel/api')
const Log = require('../kernel/log')
const StateFilter = require('../kernel/state-filter')
const { _deepEqual } = require('../kernel/deep')

// ------------------------------------------------------------------------------------------------
// RunSDKCache
// ------------------------------------------------------------------------------------------------

class RunSDKCache {
  // --------------------------------------------------------------------------
  // hook
  // --------------------------------------------------------------------------

  hook () {
    if (!(this instanceof Cache)) throw new Error(`${this.constructor.name} does not implement Cache`)

    if (this.hooked) return
    else this.hooked = true

    // Save the current functions to call from our wrappers and also restore if we unwrap
    const originalGet = this.get
    const originalSet = this.set

    // ------------------------------------------------------------------------
    // get
    // ------------------------------------------------------------------------

    this.get = async (key) => {
      // Call the API
      if (Log._infoOn) Log._info(this.constructor.name, 'Get', key)
      const start = new Date()
      const value = await originalGet.call(this, key)
      if (Log._debugOn) Log._debug(this.constructor.name, 'Get (end): ' + (new Date() - start) + 'ms')
      if (Log._debugOn) Log._debug(this.constructor.name, 'Value', JSON.stringify(value, 0, 3))

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

    // ------------------------------------------------------------------------
    // set
    // ------------------------------------------------------------------------

    this.set = async (key, value) => {
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
      if (immutable) {
        const previousValue = await originalGet.call(this, key)
        if (typeof previousValue !== 'undefined' && !_deepEqual(value, previousValue)) {
          if (Log._errorOn) Log._error(this.constructor.name, 'Expected:', JSON.stringify(previousValue, 0, 3))
          if (Log._errorOn) Log._error(this.constructor.name, 'Actual:', JSON.stringify(value, 0, 3))

          const hint = 'This is an internal Run bug. Please report it to the library developers.'
          throw new Error(`Attempt to set different values for the same key: ${key}\n\n${hint}`)
        }
      }

      // Call the API
      if (Log._infoOn) Log._info(this.constructor.name, 'Set', key)
      if (Log._debugOn) Log._debug(this.constructor.name, 'Value', JSON.stringify(value, 0, 3))
      const start = new Date()
      const ret = await originalSet.call(this, key, value)
      if (Log._debugOn) Log._debug(this.constructor.name, 'Set (end): ' + (new Date() - start) + 'ms')

      // Update the code filter
      if (key.startsWith('jig://') && value.kind === 'code') {
        const filter = await originalGet.call(this, 'config://code-filter') || StateFilter.create()
        StateFilter.add(filter, key)
        await originalSet.call(this, 'config://code-filter', filter)
      }

      return ret
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RunSDKCache
