/**
 * code.js
 *
 * A jig for code such as classes and functions
 */

// ------------------------------------------------------------------------------------------------
// Context
// ------------------------------------------------------------------------------------------------

class Context {
  static get _Repository () { return require('./repository') }
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
    return Context._Repository._getSourceCode(this)
  }

  async sync (options = {}) {
    // Sync not available for native code
    if (Context._Repository._native(this)._get(this)) return
    // Sync the code
    await Context._sync(this, options)
    // Not available inside jig code
    // TODO
    return this
  }

  upgrade (T) {
    // Upgrade not available for native code
    if (Context._Repository._native(this)._get(this)) return
    // Upgrade the code
    const options = { _upgrade: { _T: T, _C: this } }
    Context._Repository._active()._install(T, options)
    // Not available inside jig code
    // TODO
    return this
  }

  destroy () {
    // Destroy not available for native code
    if (Context._Repository._native(this)._get(this)) return
    // Destroy the code
    Context._Repository._active()._destroy(this)
    return this
  }

  auth () {
    // Auth not available for native code
    if (Context._Repository._native(this)._get(this)) return
    // Auth the code
    Context._Repository._active()._auth(this)
    return this
  }

  static [Symbol.hasInstance] (x) {
    if (typeof x !== 'function') return false
    return Context._Repository._isCode(x)
  }
}

Code.deps = { Context }

Code.sealed = false

// ------------------------------------------------------------------------------------------------

Code.toString() // Preserves the class name during compilation

const NativeCode = Context._Repository._native()._install(Code, { _dep: false })

module.exports = NativeCode
