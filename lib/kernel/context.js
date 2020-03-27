
/**
 * The objects that are exposed from Run to our built-in sandboxes, Jig and Berry
 */
class Context {
  static get Checkpoint () { return require('./xray').Checkpoint }
  static activeRunInstance () { return require('./util').activeRunInstance() }
  static deployable (x) { return require('./util').deployable(x) }
  static checkSatoshis (x) { return require('./util').checkSatoshis(x) }
  static ownerScript (x) { return require('./util').ownerScript(x) }
  static networkSuffix (x) { return require('./util').networkSuffix(x) }
  static get Location () { return require('./location') }
  static get Protocol () { return require('./protocol') }

  static get FriendlySet () { return require('./friendly').FriendlySet }
  static get FriendlyMap () { return require('./friendly').FriendlyMap }
  static get friendlyKey () { return require('./friendly').friendlyKey }
  static get friendlyPrivateData () { return require('./friendly').friendlyPrivateData }

  static deepFreeze (x) {
    // TODO: deeply freeze
    Object.freeze(x)
  }
}

module.exports = Context
