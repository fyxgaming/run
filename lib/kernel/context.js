
/**
 * The objects that are exposed from Run to our built-in sandboxes, Jig and Berry
 */
class Context {
  static _activeRun () { return require('../util/misc')._activeRun() }
  static _networkSuffix (x) { return require('../util/misc')._networkSuffix(x) }
  static _checkSatoshis (x) { return require('../util/misc')._checkSatoshis(x) }
  static _tokenType (x) { return require('../util/misc')._tokenType(x) }
  static _cloneForHost (x) { return require('../util/misc')._cloneForHost(x) }

  static _ownerScript (x) {
    const { _activeRun, _bsvNetwork, _ownerScript } = require('../util/misc')
    const network = _activeRun().blockchain.network
    const bsvNetwork = _bsvNetwork(network)
    return _ownerScript(x, bsvNetwork)
  }

  static _checkNoObjectsBelongingToOtherTokens (...args) {
    return require('../util/misc')._checkNoObjectsBelongingToOtherTokens(...args)
  }

  static get Checkpoint () { return require('../util/checkpoint') }
  static get _intrinsics () { return require('../util/sandbox')._instance._intrinsics }

  static deepFreeze (x) {
    // TODO: deeply freeze
    Object.freeze(x)
  }
}

module.exports = Context
