/**
 * unify.js
 *
 * Unify jigs for use together
 */

const Universal = require('./universal')
const { _kernel } = require('../util/misc')
const { _deepVisit, _deepReplace } = require('../util/deep')
const { _sudo } = require('../util/admin')

// ------------------------------------------------------------------------------------------------
// _unify
// ------------------------------------------------------------------------------------------------

function _unify (args) {
  if (_kernel()._autounify) {
    // In autounify mode, unify by origin. This is more invasive but leads to less surprises for
    // beginners and simple use cases. For advanced use cases, this can be disabled.
    _unifyByOrigin(args)
  } else {
    // If not automatically unifying, still unify jigs by their location. This preserves user
    // intention while also keeping things deterministic.
    _unifyByLocation(args)
  }
}

// ------------------------------------------------------------------------------------------------

function _unifyByOrigin (args) {
  const Berry = require('./berry')

  const key = x => x instanceof Berry ? x.location
    : x.origin.startsWith('error://') ? x : x.origin

  _sudo(() => {
    const worldview = new Map() // Origin | Jig -> Universal Jig

    _deepVisit(args, x => {
      if (x instanceof Universal) {
        const xkey = key(x)
        const y = worldview.get(xkey) || x
        if (!worldview.has(xkey)) worldview.set(xkey, x)
        if (x.nonce > y.nonce) worldview.set(xkey, x)
      }
    })

    _deepReplace(args, x => {
      if (x instanceof Universal) {
        return worldview.get(key(x))
      }
    })
  })
}

// ------------------------------------------------------------------------------------------------

function _unifyByLocation (args) {
  const key = x => x.origin.startsWith('error://') ? x : x.location

  _sudo(() => {
    const worldview = new Map() // Location | Jig -> Universal Jig

    _deepReplace(args, x => {
      if (x instanceof Universal) {
        const xkey = key(x)
        const y = worldview.get(xkey) || x
        worldview.set(xkey, y)
        return y
      }
    })
  })
}

// ------------------------------------------------------------------------------------------------

module.exports = _unify