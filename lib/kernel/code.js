/**
 * code.js
 *
 * A jig for code such as classes and functions
 */

// ------------------------------------------------------------------------------------------------
// Context
// ------------------------------------------------------------------------------------------------

class Context {
  static get _File () { return require('./file') }
  static get _sync () { return require('./sync') }
}

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * A jig class (or function) is to Code as a standard class is to Function
 *
 * Instances have a location and origin and can be used in other jigs.
 */
class Code {
  toString () {
    // If we have the file source code for the jig, prefer that.
    const file = Context._File._find(this)
    if (file && file._src) return file._src
    // Otherwise, the code may not yet be installed. Get it manually.
    return Function.prototype.toString.apply(this)
  }

  async sync (options = {}) {
    const file = Context._File._find(this)
    // Sync not available for native code
    if (file._native) return
    // Sync the code
    await file._sync(options)
    // Not available inside jig code
    // TODO
    return this
  }

  upgrade (T) {
    const file = Context._File._find(this)
    // Upgrade not available for native code
    if (file._native) return
    // Upgrade the code
    file._upgrade(T)
    // Not available inside jig code
    // TODO
    return this
  }

  destroy () {
    const file = Context._File._find(this)
    // Destroy not available for native code
    if (file._native) return
    // Destroy the code
    file._destroy()
    return this
  }

  auth () {
    const file = Context._File._find(this)
    // Auth not available for native code
    if (file._native) return
    // Auth the code
    file._auth()
    return this
  }

  static [Symbol.hasInstance] (x) {
    if (typeof x !== 'function') return false
    const file = Context._File._find(x)
    return file && x === file._jig
  }
}

Code.deps = { Context }

Code.sealed = false

// ------------------------------------------------------------------------------------------------

Code.toString() // Preserves the class name during compilation

const NativeCode = new Context._File()._installNative(Code, true /* internal */)._jig

module.exports = NativeCode
