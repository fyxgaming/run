/**
 * rules.js
 *
 * Different types of objects require different membrane rules
 */

const { _assert } = require('../util/misc')
const Proxy2 = require('../util/proxy2')

// ------------------------------------------------------------------------------------------------
// Rules
// ------------------------------------------------------------------------------------------------

class Rules {
  constructor () {
    // The owning parent jig if it exists
    this._parentJig = false
    // Whether to allow admin mode to override everything
    this._admin = false
    // Whether to check for errors on the underlying jig
    this._errors = false
    // Whether this target has bindings that need protection
    this._bindings = false
    // Whether this target cannot set or define reserved properties
    this._reserved = false
    // Whether this object is code and should have Code methods on it
    this._codeMethods = false
    // Whether this object is a jig
    this._jigMethods = false
    // Whether this object is a berry
    this._berryMethods = false
    // Whether this target supported private properties
    this._privacy = false
    // Whether this jig cannot be changed
    this._immutable = false
    // Whether this jig should record reads
    this._recordReads = false
    // Whether this jig should record changes
    this._recordUpdates = false
    // Whether static and instance methods should be recorded as actions to be replayed
    this._recordCalls = false
    // Whether this object should record method performed calls on it
    this._recordableTarget = false
    // Whether its properties are only updatable by its owner in a method
    this._smartAPI = false
    // Whether the function should never have a thisArg when called
    this._thisless = false
    // Whether to copy the underlying target when the object is updated
    this._cow = false
    // Whether inner properties will be copy-on-write when read externally. This makes some
    // external code simpler. No required cloning. But you lose persistency, so it's not used.
    this._cowProps = false
    // List of method names that cannot be called on this jig
    this._disabledMethods = []
  }

  static _jigCode () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
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
    rules._cow = false
    rules._cowProps = false
    rules._disabledMethods = []
    return rules
  }

  static _staticCode (isClass) {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
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
    rules._cow = false
    rules._cowProps = false
    rules._disabledMethods = []
    return rules
  }

  static _nativeCode () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
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
    rules._cow = false
    rules._cowProps = false
    rules._disabledMethods = []
    return rules
  }

  static _jigInstance () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
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
    rules._cow = false
    rules._cowProps = false
    rules._disabledMethods = []
    return rules
  }

  static _berryInstance () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
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
    rules._cow = false
    rules._cowProps = false
    rules._disabledMethods = []
    return rules
  }

  static _cow () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = false
    rules._reserved = false
    rules._codeMethods = false
    rules._jigMethods = false
    rules._berryMethods = false
    rules._privacy = false
    rules._immutable = false
    rules._recordReads = false
    rules._recordUpdates = false
    rules._recordCalls = false
    rules._recordableTarget = false
    rules._smartAPI = false
    rules._thisless = false
    rules._cow = true
    rules._cowProps = false
    rules._disabledMethods = []
    return rules
  }

  // owned is whether the property is stored on the jig or its subproperty, excluding its prototype
  static _childProperty (parentJig, method, owned) {
    const parentHandler = Proxy2._getHandler(parentJig)
    _assert(parentHandler)
    const parentRules = parentHandler._rules
    const rules = new Rules()
    rules._parentJig = parentRules._cow ? null : parentJig
    rules._admin = parentRules._admin
    rules._errors = parentRules._errors
    rules._bindings = false
    rules._reserved = false
    rules._codeMethods = false
    rules._jigMethods = false
    rules._berryMethods = false
    rules._privacy = parentRules._privacy
    rules._immutable = parentRules._immutable || method
    rules._recordReads = parentRules._recordReads
    rules._recordUpdates = parentRules._recordUpdates
    rules._recordCalls = parentRules._recordCalls
    rules._recordableTarget = false
    rules._smartAPI = parentRules._smartAPI
    rules._thisless = parentRules._thisless && owned
    rules._cow = parentRules._cow
    rules._cowProps = parentRules._cowProps
    rules._disabledMethods = []
    return rules
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Rules
