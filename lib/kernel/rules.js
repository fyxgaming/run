/**
 * rules.js
 *
 * Rules that control the membrane
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
    // Whether this object should have Code methods on it
    this._codeMethods = false
    // Whether this object should have Jig methods on it
    this._jigMethods = false
    // Whether this target supported private properties
    this._privacy = false
    // Whether this jig cannot be changed
    this._immutable = false
    // Whether this jig should record reads and changes
    this._recordable = false
    // Whether methods and static methods should be recorded as actions to be replayed.
    // In order to be replayable, properties must only be changed by methods.
    this._replayable = false
    // Whether the function should never have a thisArg when called
    this._thisless = false
    // Whether to copy the underlying target when the object is updated
    this._cow = false
    // Whether inner properties will be copy-on-write when read externally. This makes some
    // external code simpler. No required cloning. But you lose persistency, so its not used.
    this._cowProps = false
    // List of method names that cannot be called on this jig
    this._disabledMethods = []
  }

  static _code () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
    rules._reserved = true
    rules._codeMethods = true
    rules._jigMethods = false
    rules._privacy = true
    rules._immutable = false
    rules._recordable = true
    rules._replayable = true
    rules._thisless = false
    rules._cow = false
    rules._cowProps = false
    rules._disabledMethods = []
    return rules
  }

  static _staticCode () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
    rules._reserved = true
    rules._codeMethods = true
    rules._jigMethods = false
    rules._privacy = false
    rules._immutable = true
    rules._recordable = true
    rules._replayable = false
    rules._thisless = true
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
    rules._privacy = false
    rules._immutable = true
    rules._recordable = false
    rules._replayable = false
    rules._thisless = true
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
    rules._privacy = true
    rules._immutable = false
    rules._recordable = true
    rules._replayable = true
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
    rules._privacy = true
    rules._immutable = true
    rules._recordable = true
    rules._replayable = false
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
    rules._privacy = false
    rules._immutable = false
    rules._recordable = false
    rules._replayable = false
    rules._thisless = false
    rules._cow = true
    rules._cowProps = false
    rules._disabledMethods = []
    return rules
  }

  static _childProperty (parentJig, method, owned) {
    const parentHandler = Proxy2._getHandler(parentJig)
    _assert(parentHandler)
    const parentRules = parentHandler._rules
    const rules = new Rules()
    rules._parentJig = parentJig
    rules._admin = parentRules._admin
    rules._errors = parentRules._errors
    rules._bindings = false
    rules._reserved = false
    rules._codeMethods = false
    rules._jigMethods = false
    rules._privacy = parentRules._privacy
    rules._immutable = parentRules._immutable || method
    rules._recordable = parentRules._recordable
    rules._replayable = false
    rules._thisless = parentRules._thisless && owned
    rules._cow = parentRules._cow
    rules._cowProps = parentRules._cowProps
    rules._disabledMethods = []
    return rules
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Rules
