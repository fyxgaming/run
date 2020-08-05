/**
 * code.js
 *
 * A base class for all tokenized code
 */

// ------------------------------------------------------------------------------------------------
// CodeDeps
// ------------------------------------------------------------------------------------------------

class CodeDeps {
  static get _File () { return require('./file') }
  static get _sync () { return require('./sync') }
  static get _assert () { return require('../util/misc')._assert }
  static get _checkState () { return require('../util/misc')._checkState }
}

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * A jig class is to Code as a standard class is to Function
 *
 * Instances of Code, which are jig classes, have jig bindings.
 */
class Code {
  // --------------------------------------------------------------------------
  // toString
  // --------------------------------------------------------------------------

  /**
   * Returns the source code for a code jig.
   *
   * This is overridden to support upgradability.
   */
  toString () {
    const { _File, _assert } = CodeDeps

    // If a file exists, then use its current source code
    const file = _File._find(this)
    if (file) {
      _assert(file._src)
      return file._src
    }

    // We have extended a normal class from a native code class. We will get the code for the
    // normal class directly. It will not be modified for a sandbox because it is not yet a jig.
    return Function.prototype.toString.apply(this)
  }

  // --------------------------------------------------------------------------
  // sync
  // --------------------------------------------------------------------------

  /**
   * Updates the jig to its latest state
   *
   * @param {?object} options
   * @param {boolean} options.forward Whether to forward sync or just wait for pending updates. Default true.
   * @param {boolean} options.inner Whether to forward sync inner jigs if forward syncing. Default true.
   */
  async sync (options = {}) {
    const { _File, _sync, _checkState } = CodeDeps

    // Sync should only be called on jigs
    const file = _File._find(this)
    _checkState(file, 'sync unavailable')

    // Nothing to sync with native code
    if (file._native) return

    // Sync the code
    await _sync(file._jig, options)

    // Not available inside jig code, not for native code
    // TODO
    return this
  }

  // --------------------------------------------------------------------------
  // upgrade
  // --------------------------------------------------------------------------

  upgrade (T) {
    const file = CodeDeps._File._find(this)
    // Upgrade not available for native code
    if (file._native) return
    // Upgrade the code
    file._upgrade(T)
    // Not available inside jig code
    // TODO
    return this
  }

  // --------------------------------------------------------------------------
  // destroy
  // --------------------------------------------------------------------------

  destroy () {
    const file = CodeDeps._File._find(this)
    // Destroy not available for native code
    if (file._native) return
    // Destroy the code
    file._destroy()
    return this
  }

  // --------------------------------------------------------------------------
  // auth
  // --------------------------------------------------------------------------

  auth () {
    const file = CodeDeps._File._find(this)
    // Auth not available for native code
    if (file._native) return
    // Auth the code
    file._auth()
    return this
  }

  // --------------------------------------------------------------------------
  // static hasInstance
  // --------------------------------------------------------------------------

  // TODO: All code, including internal
  static [Symbol.hasInstance] (x) {
    console.log(x)
    if (typeof x !== 'function') return false
    const file = CodeDeps._File._find(x)
    console.log(file)
    return file && x === file._jig
  }
}

Code.deps = { CodeDeps }

Code.sealed = false

// ------------------------------------------------------------------------------------------------

Code.toString() // Preserves the class name during compilation

const NativeCode = new CodeDeps._File()._installNative(Code, true /* internal */)._jig

module.exports = NativeCode
