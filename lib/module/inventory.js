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
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Inventory
