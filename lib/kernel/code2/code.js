/**
 * code.js
 *
 * Enables the creation and use of code jigs
 */

const { _sourceCode, _parent } = require('../../util/misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const BASE_SRC = 'function Base() {}'

const CODE_LOOKUP = new WeakMap() // CodeJig -> Code

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * A manager for a code jig that allows it to be ugpraded, deployed, etc.
 */
class Code {
  /**
   * Creates a new local code jig with no functionality
   */
  constructor () {
    const Membrane = require('../membrane')
    const Sandbox = require('./sandbox')

    // Create the unique base class for this code jig
    const BASE = Sandbox._evaluate(BASE_SRC)

    // Delete all methods from the base
    const deleteMethod = method => { delete BASE.prototype[method] }
    Object.getOwnPropertyNames(BASE.prototype).forEach(deleteMethod)

    // Setup a method table that allows us to completely replace the base behavior
    const methodTable = {}
    // TODO
    // const methodAPI = new Proxy(methodTable, new MethodTableHandler())
    const methodAPI = methodTable

    // Insert the method table in between our base and its prototype.
    // Code instances now will have two prototypes, the base and the method table.
    // This is because we can't proxy the base prototype, but we can proxy our insertion.
    const protoproto = Object.getPrototypeOf(BASE.prototype)
    Object.setPrototypeOf(methodTable, protoproto)
    Object.setPrototypeOf(BASE.prototype, methodAPI)

    // Freeze the base prototype to the user
    Object.freeze(BASE.prototype)

    // Create the code jig
    this._membrane = new Membrane()
    this._jig = new Sandbox._intrinsics.Proxy(BASE, this._membrane)

    // Setup the most basic instance
    this._membrane._init(BASE, this._jig)
    this._src = BASE_SRC
    methodTable.constructor = this._jig

    // Store the Code and CodeJig for lookups
    CODE_LOOKUP.set(this._jig, this)
  }

  /**
   * Directly changes the class or function for the code jig
   */
  _setType (T) {
    const CodeJig = require('./code-jig')

    // If this class has no parent, then make it an instance
    if (!_parent(T)) {
      Object.setPrototypeOf(T, CodeJig.prototype)
    }

    // Update properties
    this._src = _sourceCode(T)
    this._membrane._init(T, this._jig)

    // Delete all methods from the method table
    const methodTable = Object.getPrototypeOf(this._jig.prototype)
    const deleteMethod = method => { delete methodTable[method] }
    Object.getOwnPropertyNames(methodTable).forEach(deleteMethod)

    // Copy over the new methods to the method table
    const methods = Object.getOwnPropertyNames(T.prototype)
    methods.forEach(method => {
      const desc = Object.getOwnPropertyDescriptor(T.prototype, method)
      Object.defineProperty(methodTable, method, desc)
    })

    // Make sure to point the constructor back to the code jig
    methodTable.constructor = this._jig
  }

  /**
   * Gets the Code from its CodeJig
   */
  static _lookup (jig) {
    return CODE_LOOKUP.get(jig)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Code
