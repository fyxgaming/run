
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
    return util.ownerScript(x, util.activeRunInstance().blockchain.network)
  }

  static networkSuffix (x) { return require('../util').networkSuffix(x) }
  static get Location () { return require('./location') }
  static get Protocol () { return require('./protocol') }

  static get FriendlySet () { return require('../util/friendly').FriendlySet }
  static get FriendlyMap () { return require('../util/friendly').FriendlyMap }
  static get friendlyKey () { return require('../util/friendly').friendlyKey }
  static get friendlyPrivateData () { return require('../util/friendly').friendlyPrivateData }

  static deepFreeze (x) {
    // TODO: deeply freeze
    Object.freeze(x)
  }
}

module.exports = Context
