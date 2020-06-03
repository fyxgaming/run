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
  get _errors () { return require('../../util/errors') }
  get _text () { return require('../../util/misc')._text }
  get _Log () { return require('../../util/log') }
  get _Resource () { return require('../../util/resource') }
  get _Sandbox () { return require('../../util/sandbox') }
}

// ------------------------------------------------------------------------------------------------

module.exports = new JPU()
