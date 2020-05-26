/**
 * viewer.js
 *
 * A Run Owner for loading another person's jigs but being unable to sign them.
 */

const { _text } = require('../util/misc')
const { _lockify } = require('../util/resource')
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
    this.lock = _lockify(owner)
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
