/**
 * viewer.js
 *
 * A Run Owner for loading another person's jigs but being unable to sign them.
 */

const { _lockify, _display } = require('../util/misc')
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

  async sign (txhex, inputs, locks) {
    Log._warn(TAG, 'Viewer cannot sign ', _display(this.lock))
    return txhex
  }

  owner () {
    return this.lock
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Viewer
