/**
 * jpu.js
 *
 * A system module available to Code and Jig to connect with the non-sandboxed code.
 */

// ------------------------------------------------------------------------------------------------
// JPU
// ------------------------------------------------------------------------------------------------

class JPU {
  constructor () {
    this._code = new Map() // T|Code -> Code
  }

  get _network () { return require('../../util/misc')._activeRun().blockchain.network }
  get _text () { return require('../../util/misc')._text }
  get _Log () { return require('../../util/log') }
}

// ------------------------------------------------------------------------------------------------

module.exports = new JPU()
