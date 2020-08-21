/**
 * membrane.js
 */

const { _assert } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const MEMBRANES = new WeakMap() // Proxy -> Membrane
const PROXIES = new WeakMap() // Target -> Proxy
const TARGETS = new WeakMap() // Proxy -> Target

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

class Membrane {
  constructor (target) {
    _assert(!PROXIES.has(target))

    const proxy = new Proxy(target, this)

    PROXIES.set(target, proxy)
    MEMBRANES.set(target, this)
    TARGETS.set(proxy, target)

    this._layers = []

    return proxy
  }

  static _getMembrane (x) { return MEMBRANES.get(x) }
  static _getProxy (x) { return PROXIES.get(x) }
  static _getTarget (x) { return TARGETS.get(x) }
}

// ------------------------------------------------------------------------------------------------

module.exports = Membrane
