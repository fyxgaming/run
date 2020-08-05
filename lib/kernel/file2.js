/**
 * file.js
 *
 * A class or function that can be changed at run-time
 */

const Sandbox = require('../util/sandbox')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const BASE_SRC = 'function Base() {}'

// ------------------------------------------------------------------------------------------------
// File
// ------------------------------------------------------------------------------------------------

/**
 * A container for a class or function that can be swapped at run-time
 *
 * To implement this, we create a base class that is actually proxy, and setup its prototype
 * chain so that the File, and only the File, can change the source code and prototype functions
 * at will. The class will behave like the original class in most places. The only difference
 * is that calling Object.getOwnPropertyNames on the prototype will return an empty array. If
 * the user calls this on the object prototype of the class prototype, then the real values will
 * be returned.
 */
class File {
  /**
   * Will use Sandbox base if not specified
   */
  constructor (Base = undefined) {
    // Create the base class for this file type
    Base = Base || Sandbox._evaluate(BASE_SRC)[0]

    // Delete all methods from the base
    const deleteMethod = method => { delete Base.prototype[method] }
    Object.getOwnPropertyNames(Base.prototype).forEach(deleteMethod)

    // Setup a method table that allows us to completely replace the base behavior
    const methodTable = {}
    const methodAPI = new Proxy(methodTable, {})

    // Insert the method table in between our base and its prototype.
    // File types now will have two prototypes, the base and the method table.
    // This is because we can't proxy the base prototype, but we can proxy our insertion.
    const protoproto = Object.getPrototypeOf(Base.prototype)
    // Object.setPrototypeOf(methodTable, protoproto)
    Object.setPrototypeOf(methodAPI, protoproto)
    Object.setPrototypeOf(Base.prototype, methodAPI)

    // Freeze the base prototype to the user
    Object.freeze(Base.prototype)

    // this._membrane = new Membrane()
    // this._jig = new Sandbox._intrinsics.Proxy(BASE, this._membrane)

    this._Base = Base
    this._Inner = Base
    this._Outer = new Proxy(Base, new OuterHandler(this))
  }

  _setInnerType (T) {
    // Delete all methods from the method table
    const methodTable = Object.getPrototypeOf(this._Base.prototype)
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
    methodTable.constructor = this._Outer
  }
}

// ------------------------------------------------------------------------------------------------

/**
 * TODO
 */
class OuterHandler {
  constructor (file) {
    this._file = file
  }

  get (target, prop, receiver) {
    // Prototype must be returned in the original class. Always.
    if (prop === 'prototype') return target[prop]

    // toString() is hijacked to return on the inner type
    if (prop === 'toString') return this._file._Inner[prop].bind(this._file._Inner)

    // Other functions should run on the proxy
    if (typeof target[prop] === 'function') return target[prop].bind(receiver)

    // All other values are returned directly
    return target[prop]
  }
  // TODO
}

// A jig is a sandboxed proxy around a file _type
// Does the innerType need to be a proxy? Get string

// ------------------------------------------------------------------------------------------------

module.exports = File
