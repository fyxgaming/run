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
  static get _Syncer () { return require('./syncer') }
}

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * Jig code is to Code as a class is to Function
 */
class Code {
  toString () {
    return Context._Repository._getSourceCode(this)
  }

  async sync (options = {}) {
    await Context._Syncer._sync(this, options)
    // Not available inside jig code
    // TODO
  }

  upgrade (T) {
    const options = { _upgrade: { _T: T, _C: this } }
    Context._Repository._install(T, options)
    // Not available inside jig code
    // TODO
    return this
  }

  destroy () {
    Context._Repository._destroy(this)
    // Not available inside jig code
    // TODO
    return this
  }

  // B extends A, B is not Code, A is, B instanceof Code is true. Wow. In fact, any extensions are.
  // That's bad. Somehow, hasInstance needs to work on the actual instance, not any parents.
  // What if we just have a WeakSet of all code? That'll work.

  // Check if a particular class, not one of its protototypes, is a Code
  static [Symbol.hasInstance] (x) {
    // Only functions may be code jigs
    if (typeof x !== 'function') return false
    // The repository has a quick check
    return Context._Repository._isCode(x)
  }
}

Code.deps = { Context }

Code.sealed = false

// ------------------------------------------------------------------------------------------------

Code.toString() // Preserves the class name during compilation

const NativeCode = Context._Repository._installNative(Code, false /* dep */)

module.exports = NativeCode
