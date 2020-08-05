/**
 * file.js
 *
 * A code wrapper that can be upgraded
 */

const Sandbox = require('../util/sandbox')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const BASE_SRC = 'function Base() {}'

// ------------------------------------------------------------------------------------------------
// File
// ------------------------------------------------------------------------------------------------

class File {
  /**
   * Will use Sandbox base if not specified
   */
  constructor (BASE = undefined) {
    // Create the base class for this file type
    BASE = BASE || Sandbox._evaluate(BASE_SRC)[0]

    // Delete all methods from the base
    const deleteMethod = method => { delete BASE.prototype[method] }
    Object.getOwnPropertyNames(BASE.prototype).forEach(deleteMethod)

    // Setup a method table that allows us to completely replace the base behavior
    const methodTable = {}
    // TODO
    const methodAPI = new Proxy(methodTable, {
      ownKeys (target) {
        console.log('ownkeys')
        return Object.getOwnPropertyNames(target)
      }
    })
    // const methodAPI = methodTable

    // Insert the method table in between our base and its prototype.
    // File types now will have two prototypes, the base and the method table.
    // This is because we can't proxy the base prototype, but we can proxy our insertion.
    const protoproto = Object.getPrototypeOf(BASE.prototype)
    // Object.setPrototypeOf(methodTable, protoproto)
    Object.setPrototypeOf(methodAPI, protoproto)
    Object.setPrototypeOf(BASE.prototype, methodAPI)

    // Freeze the base prototype to the user
    Object.freeze(BASE.prototype)

    // this._membrane = new Membrane()
    // this._jig = new Sandbox._intrinsics.Proxy(BASE, this._membrane)

    this._type = BASE
  }

  _set (T) {
    console.log('SET')

    // Delete all methods from the method table
    const methodTable = Object.getPrototypeOf(this._type.prototype)
    const deleteMethod = method => { delete methodTable[method] }
    Object.getOwnPropertyNames(methodTable).forEach(deleteMethod)

    // Update the prototype of the method table
    const protoproto = Object.getPrototypeOf(T.prototype)
    Object.setPrototypeOf(methodTable, protoproto)

    // Copy over the new methods to the method table
    const methods = Object.getOwnPropertyNames(T.prototype)
    methods.forEach(method => {
      const desc = Object.getOwnPropertyDescriptor(T.prototype, method)
      Object.defineProperty(methodTable, method, desc)
    })

    // Make sure to point the constructor back to the code jig
    methodTable.constructor = this._type
  }
}

// A jig is a sandboxed proxy around a file _type
// Does the innerType need to be a proxy? Get string

// ------------------------------------------------------------------------------------------------

module.exports = File
