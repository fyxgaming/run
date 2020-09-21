/**
 * unify.js
 *
 * Unify jigs for use together
 */

const Universal = require('./universal')
const { _kernel, _text, _checkState } = require('../util/misc')
const { _deepVisit, _deepReplace } = require('../util/deep')
const { _sudo } = require('../util/admin')

// ------------------------------------------------------------------------------------------------
// _unify
// ------------------------------------------------------------------------------------------------

function _unify (...jigs) {
  if (_kernel()._autounify) {
    // In autounify mode, unify by origin. This is more invasive but leads to less surprises for
    // beginners and simple use cases. For advanced use cases, this can be disabled.
    _unifyByOrigin(...jigs)
  } else {
    // If not automatically unifying, still unify jigs by their location. This preserves user
    // intention while also keeping things deterministic.
    _unifyByLocation(...jigs)
  }
}

// ------------------------------------------------------------------------------------------------

function _unifyByOrigin (...jigs) {
  const Berry = require('./berry')

  const key = x => x instanceof Berry ? x.location
    : x.origin.startsWith('error://') ? x : x.origin

  _sudo(() => {
    const worldview = new Map() // Origin | Jig -> Universal Jig
    const fixed = new Set() // Origin | Jig

    // Add top level jigs so they don't get replaced
    jigs.filter(jig => jig instanceof Universal).forEach(jig => {
      const xkey = key(jig)
      const consistent = !worldview.has(xkey) || worldview.get(xkey).nonce === jig.nonce
      _checkState(consistent, `Cannot unify inconsistent ${_text(jig)}`)
      worldview.set(xkey, jig)
      fixed.add(xkey)
    })

    _deepVisit(jigs, x => {
      if (x instanceof Universal) {
        const xkey = key(x)
        const y = worldview.get(xkey) || x
        if (!worldview.has(xkey)) worldview.set(xkey, x)

        if (x.nonce > y.nonce) {
          if (fixed.has(xkey)) {
            const line1 = `${_text(x)}: ${x.location}`
            const line2 = `${_text(y)}: ${y.location}`
            throw new Error(`Cannot unify inconsistent jigs\n\n${line1}\n${line2}`)
          }

          worldview.set(xkey, x)
        }
      }
    })

    _deepReplace(jigs, x => {
      if (x instanceof Universal) {
        return worldview.get(key(x))
      }
    })
  })
}

// ------------------------------------------------------------------------------------------------

function _unifyByLocation (...jigs) {
  // Both berries and non-berries use location so no need to differentiate like _unifyByOrigin().
  const key = x => x.origin.startsWith('error://') ? x : x.location

  _sudo(() => {
    const worldview = new Map() // Location | Jig -> Universal Jig

    // Add top level jigs first so they don't get replaced
    jigs
      .filter(jig => jig instanceof Universal)
      .forEach(jig => worldview.set(key(jig), jig))

    // Traverse all inner jigs
    _deepReplace(jigs, x => {
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

_unify._unifyByOrigin = _unifyByOrigin
_unify._unifyByLocation = _unifyByLocation

module.exports = _unify
