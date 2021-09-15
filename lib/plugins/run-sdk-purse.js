/**
 * run-sdk-purse.js
 *
 * Base class for a Purse implementation that automagically adds the following functionality:
 *
 *    - Log calls
 *    - Log performance in debug mode
 *    - Verify the API responses
 *    - Allows paying without providing parents
 *
 * This allows the implementation to just focus on making API calls.
 */

const { Purse } = require('../kernel/api')
const Log = require('../kernel/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const HEX_REGEX = /^([a-fA-F0-9][a-fA-F0-9])*$/

// ------------------------------------------------------------------------------------------------
// RunSDKPurse
// ------------------------------------------------------------------------------------------------

class RunSDKPurse {
  hook () {
    if (!(this instanceof Purse)) throw new Error(`${this.constructor.name} does not implement Purse`)

    // Save the current functions to call from our wrappers and also restore if we unwrap
    const originalPay = this.pay
    const originalBroadcast = this.broadcast

    if (this.hooked) return
    else this.hooked = true

    // ------------------------------------------------------------------------
    // pay
    // ------------------------------------------------------------------------

    this.pay = async (rawtx, parents) => {
      // Allow parents to be null when user is calling
      parents = parents || []

      // Check that rawtx is a valid hex string
      if (typeof rawtx !== 'string' || !HEX_REGEX.test(rawtx)) throw new Error(`Invalid tx to pay: ${rawtx}`)

      // Call the API
      if (Log._infoOn) Log._info('Purse', 'Pay')
      const start = new Date()
      const paidtx = await originalPay(this, rawtx, parents)
      if (Log._debugOn) Log._debug('Purse', 'Pay (end): ' + (new Date() - start) + 'ms')

      // Check that paidtx is valid
      if (typeof paidtx !== 'string' || !HEX_REGEX.test(paidtx)) throw new Error(`Invalid paid tx: ${paidtx}`)

      return paidtx
    }

    // ------------------------------------------------------------------------
    // broadcast
    // ------------------------------------------------------------------------

    this.broadcast = async (rawtx) => {
      if (!originalBroadcast) return

      // Check that rawtx is a valid hex string
      if (typeof rawtx !== 'string' || !HEX_REGEX.test(rawtx)) throw new Error(`Invalid tx to broadcast: ${rawtx}`)

      // Call the API
      if (Log._infoOn) Log._info('Purse', 'Broadcast')
      const start = new Date()
      const ret = await originalBroadcast(this, rawtx)
      if (Log._debugOn) Log._debug('Purse', 'Broadcast (end): ' + (new Date() - start) + 'ms')

      return ret
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RunSDKPurse
