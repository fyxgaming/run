/**
 * dynamic.js
 *
 * A class or function that can be dynamically changed at run-time
 */

const Sandbox = require('./sandbox')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const BASE_SRC = 'function Base() {}'

// ------------------------------------------------------------------------------------------------
// Dynamic
// ------------------------------------------------------------------------------------------------

/**
 * A container for a class or function that can be swapped at run-time
 *
 * To implement this, we create a proxy base class. We configure its prototype chain so that only
 * the proxy can change its prototype functions. We allow users to change or get the inner type
 * via __type__.
 *
 * For the most part, this dynamic type will perform the same as its original type. However,
 * instanceof and constructor will persist even as the underlying type changes. Also, calling
 * Object.getOwnPropertyNames on dynamic.prototype will return an empty array. The user must
 * call this on the prototype's prototype for the real methods.
 */
class Dynamic {
  /**
   * Will use Sandbox base if not specified
   */
  constructor () {
    // Create the base class that gets proxied
    const Base = Sandbox._evaluate(BASE_SRC)[0]

    // Delete all methods from the base to remove its functionality
    const deleteMethod = method => { delete Base.prototype[method] }
    Object.getOwnPropertyNames(Base.prototype).forEach(deleteMethod)

    // Setup a method table that allows us to replace the base behavior
    const methodTable = {}
    const methodAPI = new Proxy(methodTable, {})

    // Insert the method table in between our base and its prototype.
    // Dynamic types now will have two prototypes, the base and the method table.
    // We can't proxy the base prototype but we can proxy our insertion.
    const protoproto = Object.getPrototypeOf(Base.prototype)
    // Object.setPrototypeOf(methodTable, protoproto)
    Object.setPrototypeOf(methodAPI, protoproto)
    Object.setPrototypeOf(Base.prototype, methodAPI)

    // Freeze the base prototype to the user. The proxy is already protected.
    Object.freeze(Base.prototype)

    // Return a proxy to the base with our custom dynamic handler
    return new Proxy(Base, new DynamicHandler(Base))
  }

  // API reference for real implementations in the DynamicHandler
  get __innerType__ () { /* no-op */ }
  set __innerType__ (T) { /* no-op */ }
}

// ------------------------------------------------------------------------------------------------

/**
 * TODO
 */
class DynamicHandler {
  constructor (Base) {
    this._baseType = Base
    this._innerType = Base
  }

  get (target, prop, receiver) {
    // Return the inner type directly
    if (prop === '__type__') return this._innerType

    // Proxy prototypes must be returned in the origin target. Always.
    if (prop === 'prototype') return this._baseType.prototype

    // Hijack toString() to return the source of the inner type
    if (prop === 'toString') return this._innerType.toString.bind(this._innerType)

    // Other functions should run on the proxy
    if (typeof target[prop] === 'function') return target[prop].bind(receiver)

    // Return all other value types directly on the inner type
    return this._innerType[prop]
  }

  set (target, prop, value, receiver) {
    if (prop === '__type__') {
      this._setInnerType(value)
      return true
    }
    // TODO
  }

  // TODO

  _setInnerType (T) {
    // Check doesn't have __type__ or toString()
    // Classes to classes, functions to functions

    // Delete all methods from the method table
    const methodTable = Object.getPrototypeOf(this._baseType.prototype)
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

module.exports = Dynamic
