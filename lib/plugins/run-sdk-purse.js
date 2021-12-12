/**
 * run-sdk-purse.js
 *
 * Base class for a Purse implementation that adds the following functionality:
 *
 *    - Log calls
 *    - Log performance in debug mode
 *    - Verify the API responses
 *    - Allows paying without providing parents
 *
 * This allows the implementation to just focus on making API calls.
 */

const bsv = require('bsv')
const { Purse } = require('../kernel/api')
const Log = require('../kernel/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const HEX_REGEX = /^(?:[a-fA-F0-9][a-fA-F0-9])*$/

// ------------------------------------------------------------------------------------------------
// RunSDKPurse
// ------------------------------------------------------------------------------------------------

class RunSDKPurse {
  // --------------------------------------------------------------------------
  // hook
  // --------------------------------------------------------------------------

  hook () {
    if (!(this instanceof Purse)) throw new Error(`${this.constructor.name} does not implement Purse`)

    if (this.hooked) return
    else this.hooked = true

    // Save the current functions to call from our wrappers and also restore if we unwrap
    const originalPay = this.pay
    const originalBroadcast = this.broadcast

    // ------------------------------------------------------------------------
    // pay
    // ------------------------------------------------------------------------

    this.pay = async (rawtx, parents) => {
      // Allow both raw transactions and bsv transactions
      const tx = new bsv.Transaction(rawtx)
      rawtx = typeof rawtx === 'string' ? rawtx : tx.toString()

      // Allow parents to be null when user is calling
      parents = parents || []

      // Check that rawtx is a valid hex string
      if (typeof rawtx !== 'string' || !HEX_REGEX.test(rawtx)) throw new Error(`Invalid tx to pay: ${rawtx}`)

      // Call the API
      if (Log._infoOn) Log._info(this.constructor.name, 'Pay')
      const start = new Date()
      const paidtx = await originalPay.call(this, rawtx, parents)
      if (Log._debugOn) Log._debug(this.constructor.name, 'Pay (end): ' + (new Date() - start) + 'ms')

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
      if (Log._infoOn) Log._info(this.constructor.name, 'Broadcast')
      const start = new Date()
      const ret = await originalBroadcast.call(this, rawtx)
      if (Log._debugOn) Log._debug(this.constructor.name, 'Broadcast (end): ' + (new Date() - start) + 'ms')

      return ret
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RunSDKPurse
