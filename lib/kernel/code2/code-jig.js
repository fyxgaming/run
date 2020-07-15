/**
 * code-jig.js
 *
 * A jig for code such as classes and functions
 */

// ------------------------------------------------------------------------------------------------
// Context
// ------------------------------------------------------------------------------------------------

class Context {
  static get _Code () { return require('./code.js') }
  static get _sync () { return require('../sync') }
}

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
   * A jig class is to CodeJig as a standard class is to Function
   *
   * Instances have a location and origin and can be used in other jigs.
   */
class CodeJig {
  toString () {
    return Context._Code._lookup(this)._src
  }

  async sync (options = {}) {
    const code = Context._Code._lookup(this)
    // Sync not available for native code
    if (code._native) return
    // Sync the code
    await Context._sync(this, options)
    // Not available inside jig code
    // TODO
    return this
  }

  upgrade (T) {
    const code = Context._Code._lookup(this)
    // Upgrade not available for native code
    if (code._native) return
    // Upgrade the code
    code._upgrade(T)
    // Not available inside jig code
    // TODO
    return this
  }

  destroy () {
    const code = Context._Code._lookup(this)
    // Destroy not available for native code
    if (code._native) return
    code._destroy()
    return this
  }

  auth () {
    const code = Context._Code._lookup(this)
    // Auth not available for native code
    if (code._native) return
    code._auth()
    return this
  }

  static [Symbol.hasInstance] (x) {
    if (typeof x !== 'function') return false
    return !!Context._Code._lookup(x)
  }
}

CodeJig.deps = { Context }

CodeJig.sealed = false

// ------------------------------------------------------------------------------------------------

CodeJig.toString() // Preserves the class name during compilation

const NativeCodeJig = Context._Code._fromNative(CodeJig)

module.exports = NativeCodeJig
