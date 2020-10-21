/**
 * native-code.js
 *
 * User-facing Code object that can also be referenced in jigs
 */

const InternalCode = require('./code')

// TODO
// - Code methods must be the same as above
// - Tests for Code internally
// - Replace Run.Code externally

// ------------------------------------------------------------------------------------------------
// NativeCode
// ------------------------------------------------------------------------------------------------

class Code {
  constructor () { throw new Error('Cannot instantiate Code') }
  toString () { }
  sync (options) { }
  upgrade (T) { }
  auth () { }
  destroy () { }
  static [Symbol.hasInstance] (x) { }
}

Code.sealed = true

// ------------------------------------------------------------------------------------------------

Code.toString() // Preserves the class name during compilation

const NativeCode = new InternalCode()
const editor = InternalCode._editor(NativeCode)
const internal = false
editor._installNative(Code, internal)

// ------------------------------------------------------------------------------------------------

module.exports = NativeCode
