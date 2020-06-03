/**
 * code.js
 *
 * A jig for code such as classes and functions
 */

const Sandbox = require('../../util/sandbox')
const JPU = require('./jpu')

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

class Code {
  constructor (T) {
    const TAG = 'Code'
    const network = JPU._network
    const Log = JPU._Log
    const text = JPU._text

    return create(T)

    /**
     * Creates new Code proxy for T
     */
    function create (T) {
      const PrevCode = JPU._code.get(T)
      if (PrevCode) return PrevCode

      const Parent = parent(T)
      const ParentCode = Parent && new Code(Parent)

      Log._info(TAG, 'Installing', text(T))

      check(T, ParentCode)

      return T
    }

    /**
     * Gets the parent class of T
     */
    function parent (T) {
    }

    /**
     * Checks if T is valid to become a code jig
     */
    function check (T, ParentCode) {

    }
  }
}

// Get Code exposed and install working

// ------------------------------------------------------------------------------------------------

const SandboxedCode = Sandbox._instance._sandboxType(Code, { JPU })[0]

module.exports = SandboxedCode
