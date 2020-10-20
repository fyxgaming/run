/**
 * creation.js
 *
 * Common base for jigs, sidekicks, and berries
 */

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// Creations are only creations if they are in these weak sets.
// This gives us control over what is and isn't a creation.
const JIG_OBJECTS = new WeakSet()
const CODE = new WeakSet() // Jig code and sidekick code
const BERRIES = new WeakSet()

// ------------------------------------------------------------------------------------------------
// Creation
// ------------------------------------------------------------------------------------------------

/**
 * A JavaScript asset that can be loaded by Run. There are three kinds:
 *
 *      - Jigs (code and objects)
 *      - Sidekicks (code)
 *      - Berries (objects)
 *
 * All creations have creation bindings - location, origin, and nonce. They can be referenced
 * in transactions. They have membranes and their actions are tracked internally by Run.
 * Not all creations however will have a UTXO bindings however, owner or satoshis.
 * Specifically, berries only have creation bindings.
 */
class Creation {
  static [Symbol.hasInstance] (x) {
    if (JIG_OBJECTS.has(x)) return true
    if (CODE.has(x)) return true
    if (BERRIES.has(x)) return true
    return false
  }
}

// ------------------------------------------------------------------------------------------------

Creation._JIG_OBJECTS = JIG_OBJECTS
Creation._CODE = CODE
Creation._BERRIES = BERRIES

module.exports = Creation
