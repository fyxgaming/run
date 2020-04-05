
/**
 * The objects that are exposed from Run to our built-in sandboxes, Jig and Berry
 */
class Context {
  static _activeRun () { return require('../util/misc')._activeRun() }
  static _networkSuffix (x) { return require('../util/misc')._networkSuffix(x) }
  static _deployable (x) { return require('../util/misc')._deployable(x) }
  static _checkSatoshis (x) { return require('../util/misc')._checkSatoshis(x) }

  static _ownerScript (x) {
    const { _activeRun, _bsvNetwork, _ownerScript } = require('../util/misc')
    const network = _activeRun().blockchain.network
    const bsvNetwork = _bsvNetwork(network)
    return _ownerScript(x, bsvNetwork)
  }

  static _checkNoObjectsBelongingToOtherTokens (...args) {
    return require('../util/misc')._checkNoObjectsBelongingToOtherTokens(...args)
  }

  static get Location () { return require('../util/location') }
  static get Protocol () { return require('./protocol') }
  static get Checkpoint () { return require('../util/checkpoint').Checkpoint }
  static get TokenSet () { return require('../util/datatypes').TokenSet }
  static get TokenMap () { return require('../util/datatypes').TokenMap }

  static deepFreeze (x) {
    // TODO: deeply freeze
    Object.freeze(x)
  }
}

module.exports = Context
