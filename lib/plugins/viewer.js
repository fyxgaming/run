/**
 * viewer.js
 *
 * A Run Owner for loading another person's jigs but being unable to sign them.
 */

const { _text } = require('../util/misc')
const { _owner } = require('../util/bindings')
const bsv = require('bsv')
const { Script } = bsv
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Viewer
// ------------------------------------------------------------------------------------------------

const TAG = 'Viewer'

class Viewer {
  /**
   * Creates a new Viewer
   * @param {string|object} owner Address string, pubkey string, or custom lock
   */
  constructor (owner) {
    this.owner = owner
    this.script = Script.fromHex(_owner(this.owner).script())
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
