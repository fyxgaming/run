/**
 * dynamic.js
 *
 * A class or function that can be dynamically changed at run-time
 */

const Sandbox = require('./sandbox')
const { _checkArgument, _isAnonymous } = require('./misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const BASE_SRC = 'function dynamic() {}'

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
    const methodTableHandler = new MethodTableHandler()
    const methodTableProxy = new Proxy(methodTable, methodTableHandler)
    methodTableHandler._init(methodTableProxy)

    // Insert the method table in between our base and its prototype.
    // Dynamic types now will have two prototypes, the base and the method table.
    // We can't proxy the base prototype but we can proxy our insertion.
    const protoproto = Object.getPrototypeOf(Base.prototype)
    Object.setPrototypeOf(methodTable, protoproto)
    Object.setPrototypeOf(Base.prototype, methodTableProxy)

    // Freeze the base prototype to the user. The proxy is already protected.
    Object.freeze(Base.prototype)

    // Return a proxy to the base with our custom dynamic handler
    return new Proxy(Base, new DynamicHandler(Base, methodTable))
  }

  // API reference for real implementations in the DynamicHandler
  get __innerType__ () { /* no-op */ }
  set __innerType__ (T) { /* no-op */ }
}

// ------------------------------------------------------------------------------------------------
// DynamicHandler
// ------------------------------------------------------------------------------------------------

/**
 * Proxy handler for the dynamic type
 */
class DynamicHandler {
  constructor (Base, methodTable) {
    this._baseType = Base
    this._innerType = Base
    this._methodTable = methodTable
  }

  apply (target, thisArg, args) {
    // If the type is a function, call the inner type
    return Reflect.apply(this._innerType, thisArg, args)
  }

  defineProperty (target, prop, desc) {
    // Don't allow __type__ or prototype to be changed directly
    if (prop === '__type__') return false
    if (prop === 'prototype') return false

    // Other properties are defined on the inner type
    Object.defineProperty(this._innerType, prop, desc)

    return true
  }

  get (target, prop, receiver) {
    // Return the inner type directly
    if (prop === '__type__') return this._innerType

    // Proxy prototypes must be returned in the origin target. Always.
    if (prop === 'prototype') return this._baseType.prototype

    if (typeof target[prop] === 'function') {
      // Hijack toString() to return the source of the inner type
      if (prop === 'toString') return this._innerType.toString.bind(this._innerType)

      // Other functions should run on the proxy
      return target[prop].bind(receiver)
    }

    // Return all other value types directly on the inner type
    return this._innerType[prop]
  }

  set (target, prop, value, receiver) {
    // Hijack setting inner types
    if (prop === '__type__') {
      this._setInnerType(value, receiver)
      return true
    }

    // Proxy prototypes cannot be changed
    if (prop === 'prototype') return false

    // All other properties are set on the inner type
    this._innerType[prop] = value

    return true
  }

  // TODO

  _setInnerType (T, proxy) {
    // We can only change dynamic to another function type
    _checkArgument(typeof T === 'function', 'Inner type must be a function type')

    // Classes can only change to classes and functions to functions
    // Why? Because other code might rely on this for example to instantiate.
    const wasClass = this._innerType.toString().startsWith('class')
    const willBeClass = T.toString().startsWith('class')
    const mismatchError = 'Classes can only be changed to classes, and functions to functions'
    _checkArgument(this._innerType === this._baseType || wasClass === willBeClass, mismatchError)

    // The new type must not have a special __type__ property
    _checkArgument(!('__type__' in T), '__type__ is a reserved property')

    // No anonymous classes or functions
    _checkArgument(!_isAnonymous(T), 'Types must not be anonymous')

    // Delete all methods from the method table
    const deleteMethod = method => { delete this._methodTable[method] }
    Object.getOwnPropertyNames(this._methodTable).forEach(deleteMethod)

    // Update the prototype of the method table
    const protoproto = Object.getPrototypeOf(T.prototype)
    Object.setPrototypeOf(this._methodTable, protoproto)

    // Copy over the new methods to the method table
    const methods = Object.getOwnPropertyNames(T.prototype)
    methods.forEach(method => {
      const desc = Object.getOwnPropertyDescriptor(T.prototype, method)
      Object.defineProperty(this._methodTable, method, desc)
    })

    // Make sure to point the constructor back to the code jig
    this._methodTable.constructor = proxy

    // Change the inner type
    this._innerType = T
  }
}

// ------------------------------------------------------------------------------------------------
// MethodTableHandler
// ------------------------------------------------------------------------------------------------

// TODO: Comment
class MethodTableHandler {
  _init (proxy) {
    this._proxy = proxy
  }

  set (target, prop, value, receiver) {
    if (receiver === this._proxy) {
      return false
    }

    const proto = Object.getPrototypeOf(receiver)
    try {
      Object.setPrototypeOf(receiver, Object.getPrototypeOf(Object))
      receiver[prop] = value
      return true
    } catch (e) {
      return false
    } finally {
      Object.setPrototypeOf(receiver, proto)
    }
  }

  defineProperty (target, prop, desc) {
    return false
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Dynamic
