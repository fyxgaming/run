/**
 * proxy.js
 *
 * A unique proxy that allows for lookups from its target, used for jigs and code
 */

const { _assert } = require('./misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const PROXIES = new WeakMap() // Target -> proxy

// ------------------------------------------------------------------------------------------------
// UniqueProxy
// ------------------------------------------------------------------------------------------------

class UniqueProxy {
  constructor (target, handler) {
    // There should not be more than one proxy for this target
    _assert(!PROXIES.has(target))

    const proxy = new Proxy(target, handler)

    PROXIES.set(target, proxy)

    return proxy
  }

  // --------------------------------------------------------------------------

  static _get (target) {
    const proxy = PROXIES.get(target)

    // The proxy should always exist if the target exists
    _assert(proxy)

    return proxy
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = UniqueProxy
