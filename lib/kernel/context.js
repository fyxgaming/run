
/**
 * The objects that are exposed from Run to our built-in sandboxes, Jig and Berry
 */
class Context {
  static get Checkpoint () { return require('../util/xray').Checkpoint }
  static activeRunInstance () { return require('../util').activeRunInstance() }
  static deployable (x) { return require('../util').deployable(x) }
  static checkSatoshis (x) { return require('../util').checkSatoshis(x) }
  static ownerScript (x) {
    const util = require('../util')
    const network = util.activeRunInstance().blockchain.network
    const bsvNetwork = util._bsvNetwork(network)
    return util.ownerScript(x, bsvNetwork)
  }

  static networkSuffix (x) { return require('../util').networkSuffix(x) }
  static get Location () { return require('./location') }
  static get Protocol () { return require('./protocol') }

  static get TokenSet () { return require('../util/set').TokenSet }
  static get TokenMap () { return require('../util/set').TokenMap }

  static deepFreeze (x) {
    // TODO: deeply freeze
    Object.freeze(x)
  }
}

module.exports = Context
