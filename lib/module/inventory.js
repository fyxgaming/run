/**
 * inventory.js
 *
 * An object that tracks the jigs and code for the current owner
 */

// ------------------------------------------------------------------------------------------------
// Inventory
// ------------------------------------------------------------------------------------------------

// const TAG = 'Inventory'

class Inventory {
  constructor (owner) {
    this._owner = owner
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
    this._listener = jig => this._notify(jig)
    kernel._listeners.push('jig', this._listener)
  }

  _deactivate (kernel) {
    kernel._listeners = kernel._listeners.filter(x => x._listener === this._listener)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Inventory
