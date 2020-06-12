/**
 * changes.js
 *
 * Makes changes to jigs and records them in case they need to be rolled back
 */

const Membrane = require('../kernel/v2/membrane')

// ------------------------------------------------------------------------------------------------
// Changes
// ------------------------------------------------------------------------------------------------

/**
 * Tracks changes to objects in a jig so that it can be rolled back.
 *
 * Note: We cannot simply create logs of sets and deletes, because the order of entries needs
 * to be preserved. Otherwise, Object.keys() might return a different result. This matters.
 */
class Changes {
  constructor () {
    this._origs = new Map()
  }

  _set (J, obj, prop, val) {
    return Membrane._sudo(() => {
      if (obj[prop] === val) return
      if (!this._origs.has(obj)) this._origs.set(obj, Object.assign({}, obj))
      obj[prop] = val
    })
  }

  _delete (J, obj, prop) {
    // TODO
  }

  _setAdd (J, set, val) {
    if (set.has(val)) return
    const adds = this._setAdds.get(set) || new Set()
    adds.add(val)
    this._setAdds.set(set, adds)
    return set.add(val)
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
    return Membrane._sudo(() => {
      for (const [key, value] in this._origs) {
        console.log(key, value)
      }
    })
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Changes
