/**
 * jig.js
 *
 * Proxy handler common to all code and object jigs
 */

const { _sourceCode } = require('../../util/misc')

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

class Membrane {
  _init (target, proxy) {
    this._target = target
    this._proxy = proxy
  }

  /**
   * Trap for get
   */
  get (target, prop, receiver) {
    // The toString() on the proxy is not the same as the original.
    // Check _proxy because otherwise we'd override child toStrings()
    if (prop === 'toString' && receiver === this._proxy) {
      return () => _sourceCode(this._target)
    }

    // Clone for outside
    return this._target[prop]
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Membrane
