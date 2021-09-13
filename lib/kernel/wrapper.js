/**
 * Wrappers around API implementations to write logs and update caches
 */

const { _assert } = require('./misc')
const Log = require('./log')
const { NotImplementedError } = require('./error')
const { Owner, Purse } = require('./api')

// ------------------------------------------------------------------------------------------------
// OwnerWrapper
// ------------------------------------------------------------------------------------------------

class OwnerWrapper {
  constructor (owner) {
    _assert(!owner || owner instanceof Owner)

    this._owner = owner
  }

  // --------------------------------------------------------------------------
  // nextOwner
  // --------------------------------------------------------------------------

  async nextOwner () {
    if (Log._infoOn) Log._info('Owner', 'Next owner')

    const start = new Date()

    if (!this._owner) throw new NotImplementedError('Cannot call nextOwner(). Owner not specified.')

    let ret = null
    if (typeof this._owner.owner === 'function') {
      Log._warn('Owner', 'Owner.prototype.owner() is deprecated. Please rename owner() to nextOwner().')
      ret = await this._owner.owner()
    } else {
      ret = await this._owner.nextOwner()
    }

    // TODO: Check that the owner is a valid lock
    // if (!(owner instanceof Lock))

    if (Log._debugOn) Log._debug('Owner', 'Next owner (end): ' + (new Date() - start) + 'ms')
    return ret
  }

  // --------------------------------------------------------------------------
  // sign
  // --------------------------------------------------------------------------

  async sign (rawtx, parents, locks) {
    if (Log._infoOn) Log._info('Owner', 'Sign')

    const start = new Date()

    if (!this._owner) return

    const ret = await this._owner.sign(rawtx, parents, locks)

    if (Log._debugOn) Log._debug('Owner', 'Sign (end): ' + (new Date() - start) + 'ms')

    return ret
  }
}

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
  OwnerWrapper,
  PurseWrapper
}
