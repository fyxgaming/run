/**
 * file.js
 *
 * A code wrapper that can be upgraded
 */

const Sandbox = require('../util/sandbox')

// ------------------------------------------------------------------------------------------------
// File
// ------------------------------------------------------------------------------------------------

class File {
  constructor () {
    // Create the base class for this file type
    const BASE_SRC = 'function Base() {}'
    const [BASE] = Sandbox._evaluate(BASE_SRC)

    // Delete all methods from the base
    const deleteMethod = method => { delete BASE.prototype[method] }
    Object.getOwnPropertyNames(BASE.prototype).forEach(deleteMethod)

    // Setup a method table that allows us to completely replace the base behavior
    const methodTable = {}
    // TODO
    // const methodAPI = new Proxy(methodTable, new MethodTableHandler())
    const methodAPI = methodTable

    // Insert the method table in between our base and its prototype.
    // File types now will have two prototypes, the base and the method table.
    // This is because we can't proxy the base prototype, but we can proxy our insertion.
    const protoproto = Object.getPrototypeOf(BASE.prototype)
    Object.setPrototypeOf(methodTable, protoproto)
    Object.setPrototypeOf(BASE.prototype, methodAPI)

    // Freeze the base prototype to the user
    Object.freeze(BASE.prototype)

    // this._membrane = new Membrane()
    // this._jig = new Sandbox._intrinsics.Proxy(BASE, this._membrane)

    this._type = BASE
  }

  _set (T) {
  /*
    // Native code cannot change their type
    _assert(!this._native)

    // Update properties
    this._src = _sandboxSourceCode(T.toString(), T)
    this._membrane._init(T, this._jig)

    // We insert the Code prototype at the top of the food chain to give it jig behavior
    const Code = require('./code')
    if (!_parent(T) && !this._internal) Object.setPrototypeOf(T, Code.prototype)

    // Delete all methods from the method table
    const methodTable = Object.getPrototypeOf(this._jig.prototype)
    const deleteMethod = method => { delete methodTable[method] }
    Object.getOwnPropertyNames(methodTable).forEach(deleteMethod)

    // Update the prototype of the method table
    const parentPrototype = Object.getPrototypeOf(T.prototype)
    Object.setPrototypeOf(methodTable, parentPrototype)

    // Copy over the new methods to the method table
    const methods = Object.getOwnPropertyNames(T.prototype)
    methods.forEach(method => {
      const desc = Object.getOwnPropertyDescriptor(T.prototype, method)
      Object.defineProperty(methodTable, method, desc)
    })

    // Make sure to point the constructor back to the code jig
    methodTable.constructor = this._jig
  */
  }
}

// A jig is a sandboxed proxy around a file _type
// Does the innerType need to be a proxy? Get string

// ------------------------------------------------------------------------------------------------

module.exports = File
