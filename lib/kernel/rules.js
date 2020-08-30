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
    this._private = false
    // Whether this jig cannot be changed
    this._immutable = false
    // Whether this jig should record reads and updates
    this._record = false
    // Whether calls should be recorded to be replayed
    this._recordCalls = false
  }

  static _code () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
    rules._code = true
    rules._private = true
    rules._immutable = false
    rules._record = true
    rules._recordCalls = false
    return rules
  }

  static _staticCode () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
    rules._code = true
    rules._private = false
    rules._immutable = true
    rules._record = true
    rules._recordCalls = false
    return rules
  }

  static _nativeCode () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
    rules._code = true
    rules._private = false
    rules._immutable = true
    rules._record = true
    rules._recordCalls = false
    return rules
  }

  static _jigInstance () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
    rules._code = false
    rules._private = true
    rules._immutable = false
    rules._record = true
    rules._recordCalls = false
    return rules
  }

  static _berryInstance () {
    const rules = new Rules()
    rules._parentJig = null
    rules._admin = true
    rules._errors = true
    rules._bindings = true
    rules._code = false
    rules._private = true
    rules._immutable = true
    rules._record = true
    rules._recordCalls = false
    return rules
  }

  static _childProperty (parentJig) {
    const parentHandler = Proxy2._getHandler(parentJig)
    _assert(parentHandler)
    const parentRules = parentHandler._rules
    const rules = new Rules()
    rules._parentJig = parentJig
    rules._admin = parentRules._admin
    rules._errors = parentRules._errors
    rules._bindings = false
    rules._code = false
    rules._private = parentRules._private
    rules._immutable = parentRules._immutable
    rules._record = parentRules._record
    return rules
  }

  // TODO: Method

  equals (rules) {
    if (Object.keys(rules).length !== Object.keys(this).length) return false
    return Object.keys(rules).every(rule => this[rule] === rules[rule])
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Rules
