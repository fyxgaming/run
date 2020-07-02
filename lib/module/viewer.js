/**
 * viewer.js
 *
 * A Run Owner for loading another person's jigs but being unable to sign them.
 */

const { _text } = require('../kernel/misc')
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
   */
  constructor (owner) {
    this.lock = _owner(owner)
    this.script = new Script(bsv.deps.Buffer.from(this.lock.script()))
  }

  async sign (rawtx, parents, locks) {
    Log._warn(TAG, 'Viewer cannot sign ', _text(this.lock))
    return rawtx
  }

  owner () {
    return this.lock
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Viewer
