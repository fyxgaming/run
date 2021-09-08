/**
 * viewer.js
 *
 * A RUN Owner for loading another person's jigs but being unable to sign them.
 */

const { _text, _bsvNetwork } = require('../kernel/misc')
const { _owner } = require('../kernel/bindings')
const bsv = require('bsv')
const { Script } = bsv
const Log = require('../kernel/log')

// ------------------------------------------------------------------------------------------------
// Viewer
// ------------------------------------------------------------------------------------------------

const TAG = 'Viewer'

class Viewer {
  /**
   * Creates a new Viewer
   * @param {string|object} owner Address string, pubkey string, or custom lock
   * @param {?string} network Optional network string
   */
  constructor (owner, network) {
    this.owner = owner
    this.script = Script.fromHex(_owner(this.owner, false, _bsvNetwork(network)).script())
  }

  async sign (rawtx, parents, locks) {
    if (Log._warnOn) Log._warn(TAG, 'Viewer cannot sign ', _text(this.owner))
    return rawtx
  }

  nextOwner () {
    return this.owner
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Viewer
