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
    this._owners = new Map()
  }

  _set (owner, obj, prop, val) {
    this._owners.set(obj, owner)
    return Membrane._sudo(() => {
      if (obj[prop] === val) return
      if (!this._origs.has(obj)) this._origs.set(obj, Object.assign({}, obj))
      obj[prop] = val
    })
  }

  _delete (owner, obj, prop) {
    this._owners.set(obj, owner)
    return Membrane._sudo(() => {
      if (!(prop in obj)) return
      if (!this._origs.has(obj)) this._origs.set(obj, Object.assign({}, obj))
      delete obj[prop]
    })
  }

  _setAdd (owner, set, val) {
    this._owners.set(set, owner)
  }

  _setDelete (owner, set, val) {
    this._owners.set(set, owner)
    // TODO
  }

  _setClear (owner, set) {
    this._owners.set(set, owner)
    // TODO
  }

  _mapSet (owner, map, key, val) {
    this._owners.set(map, owner)
    // TODO
  }

  _mapDelete (owner, map, key) {
    this._owners.set(map, owner)
    // TODO
  }

  _mapClear (owner, map) {
    this._owners.set(map, owner)
    // TODO
  }

  _rollback () {
    return Membrane._sudo(() => {
      for (const [key, value] in this._origs) {
        console.log(key, value)
      }
    })
  }

  _diff () {
    const changed = new Set()
    for (const [, owner] of this._owners) {
      if (changed.has(owner)) continue
      for (const [after, before] of this._origs) {
        if (Changes._different(before, after)) changed.add(owner)
      }
    }
    return changed
  }

  static _different (a, b) {
    if (Object.keys(a).length !== Object.keys(b).length) return true
    for (const key of Object.keys(a)) { if (a[key] !== b[key]) return true }
    return false
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Changes
