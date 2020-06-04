/**
 * jig.js
 *
 * Proxy handler common to all code and object jigs
 */

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
    if (prop === 'toString') return () => this._target.toString()

    // Clone for outside
    return this._target[prop]
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Membrane
