/**
 * changes.js
 *
 * Makes changes to jigs and records them in case they need to be rolled back
 */

const Membrane = require('../kernel/v2/membrane')
const Sandbox = require('./sandbox')

const SI = Sandbox._intrinsics
const HI = Sandbox._hostIntrinsics

// ------------------------------------------------------------------------------------------------
// Changes
// ------------------------------------------------------------------------------------------------

/**
 * Tracks changes to objects in a jig so that it can be rolled back.
 *
 * Note: We cannot simply create logs of sets and deletes, because the order of entries needs
 * to be preserved. Otherwise, Object.keys() might return a different result. This matters.
 *
 * Only types that are supported in deterministic code may be used here.
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
      this._preserve(obj)
      obj[prop] = val
    })
  }

  _delete (owner, obj, prop) {
    this._owners.set(obj, owner)
    return Membrane._sudo(() => {
      if (!(prop in obj)) return
      this._preserve(obj)
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
      this._origs.forEach((before, after) => {
        if (Array.isArray(after)) after.length = 0
        Object.keys(after).forEach(key => { delete after[key] })
        Object.assign(after, before)
      })
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

  _preserve (x) {
    if (this._origs.has(x)) return
    let y = {}
    if (x instanceof SI.Set || x instanceof HI.Set) {
      y = new Set(x)
    } else if (x instanceof SI.Map || x instanceof HI.Map) {
      y = new Map(x)
    }
    Object.assign(y, x)
    this._origs.set(x, y)
  }

  static _different (a, b) {
    const akeys = Object.keys(a)
    const bkeys = Object.keys(b)
    if (akeys.length !== bkeys.length) return true
    for (let i = 0; i < akeys.length; i++) {
      const ak = akeys[i]
      const bk = bkeys[i]
      if (ak !== bk) return true
      if (a[ak] !== b[bk]) return true
    }
    return false
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Changes
