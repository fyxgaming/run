/**
 * changes.js
 *
 * Makes changes to jigs and records them in case they need to be rolled back
 */

// ------------------------------------------------------------------------------------------------
// Changes
// ------------------------------------------------------------------------------------------------

class Changes {
  constructor () {
    this._jigs = new Map()
  }

  _set (J, obj, prop, val) {
    // const c = this._jigs.get(J) || new Map()
  }

  _delete (J, obj, prop) {
    // TODO
  }

  _setAdd (J, set, val) {
    // TODO
  }

  _setDelete (J, set, val) {
    // TODO
  }

  _setClear (J, set) {
    // TODO
  }

  _mapSet (J, map, key, val) {
    // TODO
  }

  _mapDelete (J, map, key) {
    // TODO
  }

  _mapClear (J, map) {
    // TODO
  }

  _rollback () {
    // TODO
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Changes
