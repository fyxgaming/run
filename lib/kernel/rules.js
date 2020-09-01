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
    // Whether this object should have Code methods on it
    this._code = false
    // Whether this target supported private properties
    this._privacy = false
    // Whether this jig cannot be changed
    this._immutable = false
    // Whether this jig should record reads and changes
    this._recordable = false
    // Whether methods and static methods should be recorded as actions to be replayed
    // Any actions must also have a unified worldview
    this._actions = false
    // Whether values passed into the jig should be copied for protection
    this._copyInputs = false
    // Whether values leaving the jig should be copied for the outside
    this._copyOutputs = false

    // Whether various values coming in or out are cloned / membraned
    this._copyArgs = false
    this._copyReturns = false
    this._copySets = false
    this._copyGets = false

    // Whether arguments passed into this jig should be unified with the jig itself
    this._unifyWorldview = false
    // Whether the jig may only be updated through its own methods
    this._contract = false
    // Whether the jig must only include serializable values
    this._serializable = false
    // Whether to copy the underlying target when the object is updated
    this._cow = false
  }

  static _code () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
    rules._code = true
    rules._privacy = true
    rules._immutable = false
    rules._recordable = true
    rules._actions = true

    rules._copyArgs = true
    rules._copyReturns = true
    rules._copySets = true
    rules._copyGets = true

    rules._contract = true
    rules._serializable = true
    rules._cow = false

    return rules
  }

  static _staticCode () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
    rules._code = true
    rules._privacy = false
    rules._immutable = true
    rules._recordable = true
    rules._actions = false

    rules._copyArgs = false
    rules._copyReturns = false
    rules._copySets = true
    rules._copyGets = true

    rules._contract = false
    rules._serializable = true
    rules._cow = false
    return rules
  }

  static _nativeCode () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
    rules._code = true
    rules._privacy = false
    rules._immutable = true
    rules._recordable = false
    rules._actions = false

    rules._copyArgs = false
    rules._copyReturns = false
    rules._copySets = false
    rules._copyGets = false

    rules._contract = false
    rules._serializable = false
    rules._cow = false
    return rules
  }

  static _jigInstance () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
    rules._code = false
    rules._privacy = true
    rules._immutable = false
    rules._recordable = true
    rules._actions = false

    rules._copyArgs = true
    rules._copyReturns = true
    rules._copySets = true
    rules._copyGets = true

    rules._contract = true
    rules._serializable = true
    rules._cow = false
    return rules
  }

  static _berryInstance () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
    rules._code = false
    rules._privacy = true
    rules._immutable = true
    rules._recordable = true
    rules._actions = false

    rules._copyInputs = false
    rules._copyOutputs = true

    rules._copyArgs = true
    rules._copyReturns = true
    rules._copySets = true
    rules._copyGets = true

    rules._contract = false
    rules._serializable = true
    rules._cow = false
    return rules
  }

  static _childProperty (parentJig, method) {
    const parentHandler = Proxy2._getHandler(parentJig)
    _assert(parentHandler)
    const parentRules = parentHandler._rules
    const rules = new Rules()
    rules._parentJig = parentJig
    rules._admin = parentRules._admin
    rules._errors = parentRules._errors
    rules._bindings = false
    rules._code = false
    rules._privacy = parentRules._privacy
    rules._immutable = parentRules._immutable || method
    rules._recordable = parentRules._recordable
    rules._replayable = false
    rules._contract = false
    rules._serializable = parentRules._serializable
    rules._cow = parentRules._cow
    return rules
  }

  equals (rules) {
    if (Object.keys(rules).length !== Object.keys(this).length) return false
    return Object.keys(rules).every(rule => this[rule] === rules[rule])
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Rules
