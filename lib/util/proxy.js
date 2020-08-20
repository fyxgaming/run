/**
 * proxy.js
 *
 * A unique proxy that allows for lookups. This is should be used for all internal proxies.
 * Membranes expect this functionality. The proxy returned is a sandboxed proxy too.
 */

const { _assert } = require('./misc')
const Sandbox = require('./sandbox')
const SI = Sandbox._intrinsics

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const PROXIES = new WeakMap() // target -> proxy
const TARGETS = new WeakMap() // proxy -> target

// ------------------------------------------------------------------------------------------------
// UniqueProxy
// ------------------------------------------------------------------------------------------------

class UniqueProxy {
  constructor (target, handler) {
    // There should not be more than one proxy for this target
    _assert(!PROXIES.has(target))

    const proxy = new SI.Proxy(target, handler)

    PROXIES.set(target, proxy)
    TARGETS.set(proxy, target)

    return proxy
  }

  // --------------------------------------------------------------------------

  static _getProxy (target) {
    return PROXIES.get(target)
  }

  // --------------------------------------------------------------------------

  static _getTarget (proxy) {
    return TARGETS.get(proxy)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = UniqueProxy
