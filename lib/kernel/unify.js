/**
 * unify.js
 *
 * Unify: make jigs that interact together all use the same jigs in their latest common states
 *
 * Unifification happens automatically. When a user calls a method:
 *
 *    a.f(b, c)
 *
 * then a, b, c, and also all their inner references, are unified. Similar for deploy and upgrade.
 *
 * We unify so that within a method, distinct jigs are distinct, and same jigs are same,
 * and there is a consistent worldview of jigs at locations, so that when users say is x === y,
 * they get consistent answers that make sense, and over time inner references are updated.
 *
 * However...
 *
 * The state of a jig is just its own properties. It may include references to other jigs,
 * but whatever is in those other jigs are not part of the base jig state. Why does it matter?
 *
 * Because when jigs are unified for a method, the *indirect jigs*, those jigs that are
 * references of references, are unified too. But when they are not part of any jig being
 * updated, those indirect jigs mustn't stay unified after the method is complete. They
 * must revert to their former state as it was referenced by the jigs before the method.
 *
 * This process, called de-unification, is used during imports. It's not crucial for user
 * method calls though. Also, during imports, we only unify the inputs and refs once during load.
 * We don't have to unify every action if we know they were all unified at the beginning.
 */

const Universal = require('./universal')
const { _text, _checkState, _assert } = require('../util/misc')
const { _deepVisit, _deepReplace } = require('../util/deep')
const { _sudo } = require('../util/admin')

// ------------------------------------------------------------------------------------------------
// _unifyForReplay
// ------------------------------------------------------------------------------------------------

function _unifyForReplay (inputs, refs, jigToSync) {
  // TODO

  // 1) Detect any inconsistencies with inputs and refs
  // 2) Calculate the fixed set - inputs and refs
  // 3) Get the latest of everything in each input and ref

  // Unify

  // If a ref isn't the latest, replace it with one that is.

  return { _refmap, _refs }
}

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
