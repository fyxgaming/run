/**
 * code.js
 *
 * A base class for all tokenized code
 */

const { _sandboxSourceCode } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// CodeDeps
// ------------------------------------------------------------------------------------------------

class CodeDeps {
  static get _File () { return require('./file') }
  static get _sync () { return require('./sync') }
  static get _sandboxSourceCode () { return require('../util/misc')._sandboxSourceCode }
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
  toString () {
    // TODO

    // Prefer the code jig source code. This may be different from the original source code.
    // See the _sourceCode method in util. However, i
    
    // The file may not exist yet. A class may extend another code
    // jig but not be a code jig itself. This method will still be called.
    const file = CodeDeps._File._find(this)
    if (file && file._src) return file._src

    // Otherwise, the code may not yet be installed into a file.
    // We might be in the process of hooking up
    const src = Function.prototype.toString.apply(this)
    return CodeDeps._sandboxSourceCode(src, this)
  }

  async sync (options = {}) {
    const file = CodeDeps._File._find(this)
    // Sync not available for native code
    if (file._native) return
    // Sync the code
    await CodeDeps._sync(file._jig, options)
    // Not available inside jig code
    // TODO
    return this
  }

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

  destroy () {
    const file = CodeDeps._File._find(this)
    // Destroy not available for native code
    if (file._native) return
    // Destroy the code
    file._destroy()
    return this
  }

  auth () {
    const file = CodeDeps._File._find(this)
    // Auth not available for native code
    if (file._native) return
    // Auth the code
    file._auth()
    return this
  }

  static [Symbol.hasInstance] (x) {
    if (typeof x !== 'function') return false
    const file = CodeDeps._File._find(x)
    return file && x === file._jig
  }
}

Code.deps = { CodeDeps }

Code.sealed = false

// ------------------------------------------------------------------------------------------------

Code.toString() // Preserves the class name during compilation

const NativeCode = new CodeDeps._File()._installNative(Code, true /* internal */)._jig

module.exports = NativeCode
