/**
 * unify.js
 *
 * Unify jigs for use together
 */

const Universal = require('./universal')
const { _text, _checkState, _assert } = require('../util/misc')
const { _deepVisit, _deepReplace } = require('../util/deep')
const { _sudo } = require('../util/admin')

// ------------------------------------------------------------------------------------------------
// _unify
// ------------------------------------------------------------------------------------------------

function _unify (...jigs) {
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

/**
 * Incoming jigs are all deduped with each other so that they share the same inner reference jigs.
 * When two jigs are both used in a transaction, and they share some jigs at different states,
 * the newer state is used for both of them. This is called social synchronization.
 */
function _unifyIncoming (incoming, jigToSync) {
  const Berry = require('./berry')

  // All incoming jigs must have unique origins. No inconsistent refs and no refs also in inputs.
  const incomingOrigins = {}
  incoming.forEach(x => {
    const xOrigin = x instanceof Berry ? x.location : x.origin
    _checkState(!(xOrigin in incomingOrigins), 'Inconsistent reference')
    incomingOrigins[xOrigin] = x
  })

  const worldview = {} // Origin -> Jig

  // Calculate incoming and references directly stored in incoming (1st degree)
  const directReferences = new Set()

  // Find the latest version of each inner jig
  _sudo(() => {
    _deepVisit(incoming, x => {
      if (x instanceof Universal) {
        directReferences.add(x)

        const key = x instanceof Berry ? x.location : x.origin

        // Always prefer incoming jigs
        x = incomingOrigins[key] || x

        if (!(key in worldview)) worldview[key] = x
        if (x.nonce > worldview[key].nonce) worldview[key] = x

        // Don't traverse deeply. Deep references are not part of a jig's state.
        // They should not contribute towards the refmap used to capture state nor
        // to the unification with other jigs.
        return incoming.includes(x)
      }
    })
  })

  // Override the worldview so that all inner refs use the jig to sync
  if (jigToSync) worldview[jigToSync.origin] = jigToSync

  // Build a refmap from the worldview
  const refmap = {}
  Object.entries(worldview).forEach(([origin, jig]) => {
    refmap[origin] = [jig.location, jig.nonce]
  })

  // Unify each inner reference with the worldview
  _sudo(() => {
    // Unify the jig to sync with the worldview, potentially reversing inner syncs
    if (jigToSync) {
      _deepReplace(jigToSync, x => {
        if (x instanceof Universal) {
          const key = x instanceof Berry ? x.location : x.origin
          return worldview[key]
        }
      })
    }

    incoming.forEach(jig => _deepReplace(jig, x => {
      if (x instanceof Universal) {
        const key = x instanceof Berry ? x.location : x.origin

        // Make sure we only sync forward for jigs other than the one we're syncing.
        const timeTravel = key in incomingOrigins && x.nonce > incomingOrigins[key].nonce

        // Indirect references however are not part of a jig's state. If a reference moves it
        // back in time, then we can ignore it. Any uses of it will be caught later. Forward
        // advances are expected to happen however.
        if (!directReferences.has(x)) {
          if (timeTravel) return x
          return worldview[key] || x
        }

        _checkState(!timeTravel, 'Time travel')
        _assert(worldview[key])
        return worldview[key]
      }
    }))
  })

  return refmap
}

// ------------------------------------------------------------------------------------------------

_unify._unifyIncoming = _unifyIncoming

module.exports = _unify
