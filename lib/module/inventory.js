/**
 * inventory.js
 *
 * An object that tracks the jigs and code for the current owner
 */

const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Inventory'

// ------------------------------------------------------------------------------------------------
// Inventory
// ------------------------------------------------------------------------------------------------

// const TAG = 'Inventory'

class Inventory {
  constructor (owner) {
    this._owner = owner
    this._listener = (event, data) => this._notify(data)
  }

  get jigs () {
  }

  get code () {
  }

  async sync () {
    // One sync at a time
    if (this._sync) return this._sync

    this._sync = this._syncLatest()
      .then(() => { this._sync = null })
      .catch(e => { this._sync = null; throw e })

    return this._sync
  }

  async _syncLatest () {
  }

  _notify (jig) {
    console.log('notify', jig)
  }

  _activate (kernel) {
    Log._debug(TAG, 'Activate')
    if (kernel._listeners.some(x => x._listener === this._listener)) return
    kernel._listeners.push({ _event: 'jig', _listener: this._listener })
  }

  _deactivate (kernel) {
    Log._debug(TAG, 'Deactivate')
    kernel._listeners = kernel._listeners.filter(x => x._listener === this._listener)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Inventory
