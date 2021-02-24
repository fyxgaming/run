/**
 * creation-set.js
 *
 * A ordered set that can hold and quickly check for existance of creations
 */

// const { _sudo } = require('./admin')
const { _assert } = require('./misc')

// ------------------------------------------------------------------------------------------------
// CreationSet
// ------------------------------------------------------------------------------------------------

class CreationSet {
  constructor () {
    this._creations = new Set()
    this._array = null
    // this.locations = new Map() // origin -> location
  }

  _add (x) {
    const Creation = require('../kernel/creation')
    _assert(x instanceof Creation)
    this._creations.add(x)
    this._array = null
  }

  _delete (x) {
    const Creation = require('../kernel/creation')
    _assert(x instanceof Creation)
    this._creations.delete(x)
    this._array = null
  }

  /*
  const Creation = require('../kernel/creation')
  const { _location } = require('./bindings')

  if (!(a instanceof Creation)) return false
  if (!(b instanceof Creation)) return false

  return _sudo(() => {
    if (a === b) return true

    if (_location(a.origin)._error) return false
    if (_location(b.origin)._error) return false

    if (a.origin !== b.origin) return false

    if (a.location !== b.location) {
      const ainfo = `${_text(a)}: ${a.location}`
      const binfo = `${_text(b)}: ${b.location}`
      throw new Error(`Inconsistent worldview\n\n${ainfo}\n${binfo}`)
    }

    return true
  })
  */

  _forEach (f) {
    let i = 0
    for (const jig of this._creations) {
      f(jig, i++)
    }
  }

  _has (x) {
    const Creation = require('../kernel/creation')
    _assert(x instanceof Creation)
    return this._creations.has(x)

    /*
        if (this.creations.has(x)) return true
        let xOrigin
        const xOrigin = _sudo(x => x.origin)
        const yLocation = this.locations.has(xOrigin)
        if (yLocation) {
            const xLocation = _sudo(x => x.location)
            if (xLocation.startsWith('error://'))
        }
        return false
        */
  }

  _get (x) {
    if (this._has(x)) return x
  }

  static _sameCreation (x, y) {
    return x === y
  }

  _indexOf (x) {
    return this._arr().findIndex(y => CreationSet._sameCreation(x, y))
  }

  _arr () {
    this._array = this._array || Array.from(this._creations)
    return this._array
  }

  get _size () {
    return this._creations.size
  }

  [Symbol.iterator] () {
    return this._creations[Symbol.iterator]()
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = CreationSet
