
/**
 * The objects that are exposed from Run to our built-in sandboxes, Jig and Berry
 */
class Context {
  static _activeRun () { return require('../lib/kernel/misc')._activeRun() }
  static _networkSuffix (x) { return require('../lib/kernel/misc')._networkSuffix(x) }
  static _resourceType (x) { return require('../lib/kernel/misc')._resourceType(x) }
  static _cloneForHost (x) { return require('../lib/kernel/misc')._cloneForHost(x) }
  static _cloneForSandbox (x) { return require('../lib/kernel/misc')._cloneForSandbox(x) }
  static _nextOwner () { return this._activeRun().transaction._nextResourceOwner() }

  // resource
  static _satoshis (x) { return require('../lib/kernel/bindings')._satoshis(x) }
  static _owner (x) {
    const { _activeRun, _bsvNetwork } = require('../lib/kernel/misc')
    const { _owner } = require('../lib/kernel/bindings')
    const network = _activeRun().blockchain.network
    const bsvNetwork = _bsvNetwork(network)
    return _owner(x, bsvNetwork)
  }

  static _checkNoObjectsBelongingToOtherResources (...args) {
    return require('../lib/kernel/misc')._checkNoObjectsBelongingToOtherResources(...args)
  }

  static get Checkpoint () { return require('./util/checkpoint') }
  static get _intrinsics () { return require('../lib/kernel/sandbox')._intrinsics }

  static deepFreeze (x) {
    // TODO: deeply freeze
    Object.freeze(x)
  }
}

module.exports = Context
