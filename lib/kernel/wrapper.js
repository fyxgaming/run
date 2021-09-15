/**
 * Wrappers around API implementations to write logs and update caches
 */

const { _assert } = require('./misc')
const Log = require('./log')
const { Purse } = require('./api')

// ------------------------------------------------------------------------------------------------
// PurseWrapper
// ------------------------------------------------------------------------------------------------

class PurseWrapper {
  constructor (purse) {
    _assert(!purse || purse instanceof Purse)

    this._purse = purse
  }

  // --------------------------------------------------------------------------
  // pay
  // --------------------------------------------------------------------------

  async pay (rawtx, parents) {
    if (Log._infoOn) Log._info('Purse', 'Pay')

    const start = new Date()

    if (!this._purse) return

    const ret = await this._purse.pay(rawtx, parents)

    if (Log._debugOn) Log._debug('Purse', 'Pay (end): ' + (new Date() - start) + 'ms')

    return ret
  }

  // --------------------------------------------------------------------------
  // broadcast
  // --------------------------------------------------------------------------

  async broadcast (rawtx) {
    if (Log._infoOn) Log._info('Purse', 'Broadcast')

    const start = new Date()

    if (!this._purse || typeof this._purse.broadcast !== 'function') return

    const ret = await this._purse.broadcast(rawtx)

    if (Log._debugOn) Log._debug('Purse', 'Broadcast (end): ' + (new Date() - start) + 'ms')

    return ret
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  PurseWrapper
}
