/**
 * universal.js
 *
 * The most general jig class
 */

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// Jigs are only jigs if they are in these weak sets.
// This gives us control over what is and isn't a jig.
const JIGS = new WeakSet()
const CODE = new WeakSet()
const BERRIES = new WeakSet()

// ------------------------------------------------------------------------------------------------
// Universal
// ------------------------------------------------------------------------------------------------

/**
 * A general-purpose jig that matches any specific jig.
 *
 * There are three kinds of jigs supported by Run:
 *
 *      - Code instances: classes, functions, native code, etc.
 *      - Jig instances: object jigs created from code jigs
 *      - Berry instances: object jigs created by plucking
 *
 * The Jig class is by most confusing because it represents jig objects, which are the most
 * common kind of jig, but it steals the name jig. Internally, we need a name for a general
 * jig that is any of the above. We call that the "Universal Jig".
 *
 * All universal jigs have location. They can be referenced in transactions. They have membranes
 * and their actions are tracked internally by Run. Not all universal jigs however will have
 * owners, origins, nonces, or satoshis. Those differences are defined by each kind of jig.
 */
class Universal {
  static [Symbol.hasInstance] (x) {
    if (JIGS.has(x)) return true
    if (CODE.has(x)) return true
    if (BERRIES.has(x)) return true
    return false
  }
}

// ------------------------------------------------------------------------------------------------

Universal._JIGS = JIGS
Universal._CODE = CODE
Universal._BERRIES = BERRIES

module.exports = Universal
