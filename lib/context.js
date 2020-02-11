const uniquePrivates = new WeakMap()

/**
 * The objects that are exposed from Run to our built-in sandboxes, Jig and Berry
 */
class Context {
  static get Checkpoint () { return require('./xray').Checkpoint }
  static activeRunInstance () { return require('./util').activeRunInstance() }
  static deployable (x) { return require('./util').deployable(x) }
  static checkSatoshis (x) { return require('./util').checkSatoshis(x) }
  static getOwnerScript (x) { return require('./util').getOwnerScript(x) }
  static networkSuffix (x) { return require('./util').networkSuffix(x) }
  static get Location () { return require('./location') }
  static get Protocol () { return require('./protocol') }
  static get uniquePrivates () { return uniquePrivates }
  static get UniqueSet () { return require('./unique').UniqueSet }
  static get UniqueMap () { return require('./unique').UniqueMap }

  static deepFreeze (x) {
    // TODO: deeply freeze
    Object.freeze(x)
  }
}

module.exports = Context
