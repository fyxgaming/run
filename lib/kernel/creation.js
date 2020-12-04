/**
 * creation.js
 *
 * Common base for jigs, sidekicks, and berries
 */

// ------------------------------------------------------------------------------------------------
// CreationDeps
// ------------------------------------------------------------------------------------------------

class CreationDeps {
  static get _Editor () { return require('./editor') }
  static get _misc () { return require('../util/misc') }
}

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
    const { _JIGS, _CODE, _BERRIES } = CreationDeps._misc
    if (_JIGS.has(x)) return true
    if (_CODE.has(x)) return true
    if (_BERRIES.has(x)) return true
    return false
  }
}

Creation.deps = { CreationDeps }
Creation.sealed = true

// ------------------------------------------------------------------------------------------------

Creation.toString() // Preserves the class name during compilation

const NativeCreation = CreationDeps._Editor._createCode()
const editor = CreationDeps._Editor._get(NativeCreation)
const internal = false
editor._installNative(Creation, internal)

module.exports = NativeCreation
