/**
 * run-sdk-owner.js
 *
 * Base class for an Owner implementation that automagically adds the following functionality:
 *
 *    - Log calls
 *    - Log performance in debug mode
 *    - Verify the API responses
 *    - Allows signing without providing parents
 *
 * This allows the implementation to just focus on making API calls.
 */

const { Owner } = require('../kernel/api')
const Log = require('../kernel/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const HEX_REGEX = /^([a-fA-F0-9][a-fA-F0-9])*$/

// ------------------------------------------------------------------------------------------------
// RunSDKOwner
// ------------------------------------------------------------------------------------------------

class RunSDKOwner {
  hook () {
    if (!(this instanceof Owner)) throw new Error(`${this.constructor.name} does not implement Owner`)

    // Save the current functions to call from our wrappers and also restore if we unwrap
    const originalNextOwner = this.nextOwner
    const originalSign = this.sign

    if (this.hooked) return
    else this.hooked = true

    // ------------------------------------------------------------------------
    // nextOwner
    // ------------------------------------------------------------------------

    this.nextOwner = async () => {
      if (Log._infoOn) Log._info('Owner', 'Next owner')
      const start = new Date()
      const owner = await originalNextOwner.call(this)
      if (Log._debugOn) Log._debug('Owner', 'Next owner (end): ' + (new Date() - start) + 'ms')

      // TODO: Check that the owner is a valid lock
      // if (!(owner instanceof Lock))

      return owner
    }

    // ------------------------------------------------------------------------
    // sign
    // ------------------------------------------------------------------------

    this.sign = async (rawtx, parents, locks) => {
      // Allow parents and locks to be null when user is calling
      parents = parents || []
      locks = locks || []

      // Check that rawtx is a valid hex string
      if (typeof rawtx !== 'string' || !HEX_REGEX.test(rawtx)) throw new Error(`Invalid tx to sign: ${rawtx}`)

      if (Log._infoOn) Log._info('Owner', 'Sign')
      const start = new Date()
      const signedtx = await originalSign(this, rawtx, parents, locks)
      if (Log._debugOn) Log._debug('Owner', 'Sign (end): ' + (new Date() - start) + 'ms')

      // Check that signedtx is valid
      if (typeof signedtx !== 'string' || !HEX_REGEX.test(signedtx)) throw new Error(`Invalid signed tx: ${signedtx}`)

      return signedtx
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RunSDKOwner
