/**
 * purse-wrapper.js
 *
 * Wraps a Run Purse implementation to add common functionality:
 *
 *    - Logging calls
 *    - Logging performance
 *    - Validate responses
 *    - Allows paying without passing parents
 *
 * To use, either wrap an owner instance:
 *
 *    new PurseWrapper(myPurse)
 *
 * or extend your class from it:
 *
 *    class MyPurse extends PurseWrapper { ... }
 */

const bsv = require('bsv')
const Log = require('../kernel/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const HEX_REGEX = /^(?:[a-fA-F0-9][a-fA-F0-9])*$/

// ------------------------------------------------------------------------------------------------
// PurseWrapper
// ------------------------------------------------------------------------------------------------

class PurseWrapper {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  constructor (purse = this) {
    this.unwrappedPurse = purse
    this.unwrappedPay = purse.pay
    this.unwrappedBroadcast = purse.broadcast

    this.setWrappingEnabled(true)
  }

  // --------------------------------------------------------------------------
  // setWrappingEnabled
  // --------------------------------------------------------------------------

  setWrappingEnabled (enabled) {
    if (enabled) {
      this.pay = PurseWrapper.prototype.wrappedPay
      this.broadcast = this.unwrappedBroadcast && PurseWrapper.prototype.wrappedBroadcast
    } else {
      this.pay = this.unwrappedPay
      this.broadcast = this.unwrappedBroadcast
    }
  }

  // ------------------------------------------------------------------------
  // wrappedPay
  // ------------------------------------------------------------------------

  async wrappedPay (rawtx, parents) {
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
    const paidtx = await this.unwrappedPay.call(this.unwrappedPurse, rawtx, parents)
    if (Log._debugOn) Log._debug(this.constructor.name, 'Pay (end): ' + (new Date() - start) + 'ms')

    // Check that paidtx is valid
    if (typeof paidtx !== 'string' || !HEX_REGEX.test(paidtx)) throw new Error(`Invalid paid tx: ${paidtx}`)

    return paidtx
  }

  // ------------------------------------------------------------------------
  // wrappedBroadcast
  // ------------------------------------------------------------------------

  async wrappedBroadcast (rawtx) {
    // Check that rawtx is a valid hex string
    if (typeof rawtx !== 'string' || !HEX_REGEX.test(rawtx)) throw new Error(`Invalid tx to broadcast: ${rawtx}`)

    // Call the API
    if (Log._infoOn) Log._info(this.constructor.name, 'Broadcast')
    const start = new Date()
    const ret = await this.unwrappedBroadcast.call(this.unwrappedPurse, rawtx)
    if (Log._debugOn) Log._debug(this.constructor.name, 'Broadcast (end): ' + (new Date() - start) + 'ms')

    return ret
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = PurseWrapper
