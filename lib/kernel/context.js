
/**
 * The objects that are exposed from Run to our built-in sandboxes, Jig and Berry
 */
class Context {
  static _activeRun () { return require('../util/misc')._activeRun() }
  static _networkSuffix (x) { return require('../util/misc')._networkSuffix(x) }
  static _resourceType (x) { return require('../util/misc')._resourceType(x) }
  static _cloneForHost (x) { return require('../util/misc')._cloneForHost(x) }
  static _cloneForSandbox (x) { return require('../util/misc')._cloneForSandbox(x) }
  static _nextOwner () { return this._activeRun().transaction._nextResourceOwner() }

  // resource
  static _satoshis (x) { return require('../util/resource')._satoshis(x) }

  static _lockify (x) {
    const { _activeRun, _bsvNetwork } = require('../util/misc')
    const { _lockify } = require('../util/resource')
    const network = _activeRun().blockchain.network
    const bsvNetwork = _bsvNetwork(network)
    return _lockify(x, bsvNetwork)
  }

  static _checkNoObjectsBelongingToOtherResources (...args) {
    return require('../util/misc')._checkNoObjectsBelongingToOtherResources(...args)
  }

  static get Checkpoint () { return require('../util/checkpoint') }
  static get _intrinsics () { return require('../util/sandbox')._instance._intrinsics }

  static deepFreeze (x) {
    // TODO: deeply freeze
    Object.freeze(x)
  }
}

module.exports = Context
