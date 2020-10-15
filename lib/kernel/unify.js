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
 * This process, called de-unification, is used during replays. It's not crucial for user
 * method calls though. Also, during replays, we only unify the inputs and refs once during load.
 * We don't have to unify every action if we know they were all unified at the beginning.
 */

const Creation = require('./creation')
const { _text, _checkState, _assert } = require('../util/misc')
const { _deepVisit, _deepReplace } = require('../util/deep')
const { _sudo } = require('../util/admin')
const { StateError } = require('../util/errors')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// Unificatoin for method gets disabled during replay because we unify ahead of time
let UNIFY_FOR_METHOD_ENABLED = true

// ------------------------------------------------------------------------------------------------
// _unifyForReplay
// ------------------------------------------------------------------------------------------------

function _unifyForReplay (inputs, refs, jigToSync) {
  return _sudo(() => {
    const Berry = require('./berry')
    const getOrigin = x => x instanceof Berry ? x.location : x.origin

    // All incoming jigs must have unique origins
    const incoming = inputs.concat(refs)
    const incomingByOrigin = {}
    incoming.forEach(x => {
      const xOrigin = getOrigin(x)
      const y = incomingByOrigin[xOrigin]
      if (y) {
        const line1 = `1st location: ${x.location}`
        const line2 = `2nd location: ${y.location}`
        const error = `Inconsistent reference: ${_text(x)}\n\n${line1}\n${line2}`
        throw new StateError(error)
      }
      incomingByOrigin[xOrigin] = x
    })

    const worldview = { }
    const allJigs = new Set()
    const deunifyMap = new Map()

    // Add all incoming jigs to the worldview first
    incoming.forEach(x => { worldview[getOrigin(x)] = x })

    // Calculate the latest versions of every referenced jig
    _deepVisit(incoming, x => {
      if (x instanceof Creation) {
        allJigs.add(x)
        const xOrigin = getOrigin(x)
        const incomingY = incomingByOrigin[xOrigin]
        if (incomingY && x.nonce > incomingY.nonce) {
          const line1 = `1st location: ${x.location}`
          const line2 = `2nd location: ${incomingY.location}`
          throw new StateError(`Time travel: ${_text(x)}\n\n${line1}\n${line2}`)
        }
        const y = worldview[xOrigin]
        if (!y || x.nonce > y.nonce) worldview[xOrigin] = x
      }
    })

    // Override the worldview so that all inner refs use the jig to sync
    if (jigToSync) worldview[jigToSync.origin] = jigToSync

    // Unify the jig to sync with the worldview, potentially reversing inner syncs
    _deepReplace(jigToSync, (x, recurse) => {
      if (x !== jigToSync && x instanceof Creation) {
        recurse(false)
        const xOrigin = getOrigin(x)
        return worldview[xOrigin]
      }
    })

    // Now update the jigs of all other references. Do so shallowly to track jigs for deunification.
    for (const jig of allJigs) {
      const refs = new Map()
      _deepReplace(jig, (x, recurse) => {
        if (x !== jig && x instanceof Creation) {
          const xOrigin = getOrigin(x)
          const y = worldview[xOrigin]
          if (x !== y) refs.set(y, x)
          _assert(y)
          recurse(false)
          return y
        }
      })
      if (!inputs.includes(jig)) deunifyMap.set(jig, refs)
    }

    // Build a refmap from the worldview which we will use to save state later
    const refmap = {}
    Object.entries(worldview).forEach(([origin, jig]) => {
      refmap[origin] = [jig.location, jig.nonce]
    })

    return { _refmap: refmap, _deunifyMap: deunifyMap }
  })
}

// ------------------------------------------------------------------------------------------------
// _deunifyForReplay
// ------------------------------------------------------------------------------------------------

function _deunifyForReplay (deunifyMap) {
  _sudo(() => {
    for (const [jig, value] of deunifyMap.entries()) {
      _deepReplace(jig, (x, recurse) => {
        if (x !== jig && x instanceof Creation) {
          recurse(false)
          return value.get(x) || x
        }
      })
    }
  })
}

// ------------------------------------------------------------------------------------------------
// _unifyForMethod
// ------------------------------------------------------------------------------------------------

function _unifyForMethod (obj, fixed = []) {
  if (!UNIFY_FOR_METHOD_ENABLED) return

  const Berry = require('./berry')

  const getKey = x => _sudo(() => x instanceof Berry ? x.location
    : x.origin.startsWith('error://') ? x : x.origin)

  return _sudo(() => {
    const worldview = new Map() // Origin | Jig -> Creation

    // Add fixed jigs so they don't get replaced
    fixed.forEach(jig => {
      _assert(jig instanceof Creation)
      const xkey = getKey(jig)
      const consistent = !worldview.has(xkey) || worldview.get(xkey).nonce === jig.nonce
      _checkState(consistent, `Cannot unify inconsistent ${_text(jig)}`)
      worldview.set(xkey, jig)
    })

    // Find the most recent versions of every inner jig
    _deepVisit(obj, x => {
      if (x instanceof Creation) {
        const xkey = getKey(x)
        const y = worldview.get(xkey) || x
        if (!worldview.has(xkey)) worldview.set(xkey, x)

        if (x.nonce > y.nonce) {
          if (fixed.includes(y)) {
            const line1 = `1st location: ${x.location}`
            const line2 = `2nd location: ${y.location}`
            throw new Error(`Cannot unify inconsistent ${_text(x)}\n\n${line1}\n${line2}`)
          }

          worldview.set(xkey, x)
        }
      }
    })

    return _deepReplace(obj, x => {
      if (x instanceof Creation) {
        return worldview.get(getKey(x))
      }
    })
  })
}

// ------------------------------------------------------------------------------------------------

function _setUnifyForMethodEnabled (enabled) {
  UNIFY_FOR_METHOD_ENABLED = enabled
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _unifyForReplay,
  _deunifyForReplay,
  _unifyForMethod,
  _setUnifyForMethodEnabled
}
