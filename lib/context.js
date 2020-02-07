/**
 * The objects that are exposed from Run to our built-in sandboxes, Jig and Berry
 */
class Context {
  static get Checkpoint () { return require('./xray').Checkpoint }
  static activeRunInstance () { return require('./util').activeRunInstance() }
  static deployable (x) { return require('./util').deployable(x) }
  static checkOwner (x) { return require('./util').checkOwner(x) }
  static checkSatoshis (x) { return require('./util').checkSatoshis(x) }
  static networkSuffix (x) { return require('./util').networkSuffix(x) }

  static deepFreeze (x) {
    // TODO: deeply freeze
    Object.freeze(x)
  }
}

module.exports = Context
