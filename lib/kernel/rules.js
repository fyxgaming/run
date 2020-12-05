/**
 * rules.js
 *
 * Rules for the different membranes that surround creations and their properties
 */

const { _assert } = require('../util/misc')
const Proxy2 = require('../util/proxy2')
const { _PROTOCOL_VERSION } = require('../util/version')

// ------------------------------------------------------------------------------------------------
// Rules
// ------------------------------------------------------------------------------------------------

class Rules {
  constructor () {
    // The owning parent creation (undefined = self)
    this._creation = undefined
    // Whether to allow admin mode to override everything
    this._admin = false
    // Whether this target has location bindings that need protection
    this._locationBindings = false
    // Whether this target has utxo bindings that need protection
    this._utxoBindings = false
    // Whether this target cannot set or define reserved properties
    this._reserved = false
    // Whether this object is code and should have Code methods on it
    this._codeMethods = false
    // Whether this object is a jig object
    this._jigMethods = false
    // Whether this object is a berry instance
    this._berryMethods = false
    // Whether this target protects private properties
    this._privacy = false
    // Whether this target cannot be changed
    this._immutable = false
    // Whether we should record reads for the creation
    this._recordReads = false
    // Whether we should record changes for the creation
    this._recordUpdates = false
    // Whether static and instance methods should be recorded as actions to be replayed
    this._recordCalls = false
    // Whether this object should record method performed calls on it
    this._recordableTarget = false
    // Whether its properties are only updatable by its owner in a method
    this._smartAPI = false
    // Whether the function should never have a thisArg when called
    this._thisless = false
    // List of method names that cannot be called on this target
    this._disabledMethods = []
    // Whether methods should automatically convert local types thisArgs into code
    this._autocode = false
    // Version of the protocol
    this._version = _PROTOCOL_VERSION
  }

  static _jigCode () {
    const rules = new Rules()
    rules._creation = undefined
    rules._admin = true
    rules._locationBindings = true
    rules._utxoBindings = true
    rules._reserved = true
    rules._codeMethods = true
    rules._jigMethods = false
    rules._berryMethods = false
    rules._privacy = true
    rules._immutable = false
    rules._recordReads = true
    rules._recordUpdates = true
    rules._recordCalls = true
    rules._recordableTarget = true
    rules._smartAPI = true
    rules._thisless = false
    rules._disabledMethods = []
    rules._autocode = true
    return rules
  }

  static _sidekickCode (isClass) {
    const rules = new Rules()
    rules._creation = undefined
    rules._admin = true
    rules._locationBindings = true
    rules._utxoBindings = true
    rules._reserved = true
    rules._codeMethods = true
    rules._jigMethods = false
    rules._berryMethods = false
    rules._privacy = false
    rules._immutable = true
    rules._recordReads = true
    rules._recordUpdates = false
    rules._recordCalls = false
    rules._recordableTarget = false
    rules._smartAPI = false
    rules._thisless = !isClass
    rules._disabledMethods = []
    rules._autocode = false
    return rules
  }

  static _nativeCode () {
    const rules = new Rules()
    rules._creation = undefined
    rules._admin = true
    rules._locationBindings = true
    rules._utxoBindings = true
    rules._reserved = false
    rules._codeMethods = true
    rules._jigMethods = false
    rules._berryMethods = false
    rules._privacy = false
    rules._immutable = true
    rules._recordReads = false // Native code never changes. No ref needed unless its referenced directly.
    rules._recordUpdates = false
    rules._recordCalls = false
    rules._recordableTarget = false
    rules._smartAPI = true
    rules._thisless = false
    rules._disabledMethods = []
    rules._autocode = false
    return rules
  }

  static _jigObject (initialized) {
    const rules = new Rules()
    rules._creation = undefined
    rules._admin = true
    rules._locationBindings = true
    rules._utxoBindings = true
    rules._reserved = true
    rules._codeMethods = false
    rules._jigMethods = true
    rules._berryMethods = false
    rules._privacy = true
    rules._immutable = false
    rules._recordReads = true
    rules._recordUpdates = true
    rules._recordCalls = true
    rules._recordableTarget = true
    rules._smartAPI = true
    rules._thisless = false
    rules._disabledMethods = initialized ? ['init'] : []
    rules._autocode = false
    return rules
  }

  static _berryObject (initialized) {
    const rules = new Rules()
    rules._creation = undefined
    rules._admin = true
    rules._locationBindings = true
    rules._utxoBindings = true
    rules._reserved = true
    rules._codeMethods = false
    rules._jigMethods = false
    rules._berryMethods = true
    rules._privacy = false
    rules._immutable = true
    rules._recordReads = true
    rules._recordUpdates = false
    rules._recordCalls = false
    rules._recordableTarget = false
    rules._smartAPI = false
    rules._thisless = false
    rules._disabledMethods = initialized ? ['init'] : []
    rules._autocode = false
    return rules
  }

  static _childProperty (creation, method) {
    const creationMembrane = Proxy2._getHandler(creation)
    _assert(creationMembrane)
    const creationRules = creationMembrane._rules
    const rules = new Rules()
    rules._creation = creation
    rules._admin = creationRules._admin
    rules._locationBindings = false
    rules._utxoBindings = false
    rules._reserved = false
    rules._codeMethods = false
    rules._jigMethods = false
    rules._berryMethods = false
    rules._privacy = creationRules._privacy
    rules._immutable = creationRules._immutable || method
    rules._recordReads = creationRules._recordReads
    rules._recordUpdates = creationRules._recordUpdates
    rules._recordCalls = creationRules._recordCalls
    rules._recordableTarget = false
    rules._smartAPI = creationRules._smartAPI
    rules._thisless = creationRules._thisless // Would inherit to both static + prototype methods
    rules._disabledMethods = []
    rules._autocode = creationRules._autocode
    return rules
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Rules
