/**
 * dynamic.js
 *
 * A class or function that can be dynamically changed at run-time
 */

const Sandbox = require('./sandbox')
const { _checkArgument, _isAnonymous, _text } = require('./misc')
const SI = Sandbox._intrinsics

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const BASE_SRC = 'function dynamic() {}'

// Dynamic -> DynamicHandler
const HANDLERS = new WeakMap()

function getHandler (D) {
  const handler = HANDLERS.get(D)
  _checkArgument(handler, `Not a dynamic type: ${_text(D)}`)
  return handler
}

// ------------------------------------------------------------------------------------------------
// Dynamic
// ------------------------------------------------------------------------------------------------

/**
 * A container for a class or function that can be swapped at run-time
 *
 * To implement this, we create a proxy base class. We configure its prototype chain so that only
 * the proxy can change its prototypes methods. We allow users to change or get the inner type
 * with special methods outside the type: Dynamic._getInnerType and Dynamic._setInnerType.
 *
 * For the most part, this dynamic type will act the same as its inner type. However, the prototype
 * (and therefore instanceof) and the constructor will be the same even as the underlying type
 * changes. Also, calling Object.getOwnPropertyNames(D.prototype) will return an empty array. The
 * user must call this on the prototype's prototype for its actual methods.
 *
 * Usage:
 *
 *    const D = new Dynamic()
 *    Dynamic._setInnerType(D, class A {})
 *
 *    const instance = new D()
 *    // instance.constructor.name === 'A'
 *
 *    Dynamic._setInnerType(D, class B {})
 *    // instance.constructor.name === 'B'
 *
 * Sometimes when a dynamic is wrapped in a proxy, it is useful to set the outer type - that is,
 * the class returned from A.prototype.constructor and a.constructor for instances. For that,
 * there are two special methods: Dynamic._getOuterType and Dynamic._setOuterType.
 */
class Dynamic {
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
    const dynamicHandler = new DynamicHandler()
    const proxy = new Proxy(Base, dynamicHandler)
    dynamicHandler._init(Base, methodTable, proxy)
    HANDLERS.set(proxy, dynamicHandler)
    return proxy
  }

  static _getInnerType (D) { return getHandler(D)._innerType }
  static _setInnerType (D, T) { getHandler(D)._setInnerType(T) }

  static _getOuterType (D) { return getHandler(D)._outerType }
  static _setOuterType (D, T) { getHandler(D)._setOuterType(T) }
}

// ------------------------------------------------------------------------------------------------
// DynamicHandler
// ------------------------------------------------------------------------------------------------

/**
 * Proxy handler for the dynamic type
 */
class DynamicHandler {
  _init (Base, methodTable, proxy) {
    this._baseType = Base
    this._innerType = Base
    this._outerType = proxy
    this._proxy = proxy
    this._methodTable = methodTable
  }

  apply (target, thisArg, args) {
    // If the type is a function, call the inner type
    return Reflect.apply(this._innerType, thisArg, args)
  }

  construct (target, args, newTarget) {
    // If a child class, newTarget will be the child and outer type should reflect that
    let outerType = newTarget
    try { outerType = Dynamic._getOuterType(newTarget) } catch (e) { }

    // Create an instance of the inner type with the constructor of the outer type
    return Reflect.construct(this._innerType, args, outerType)
  }

  defineProperty (target, prop, desc) {
    // Don't allow special methods to be changed directly
    if (prop === 'prototype') return false
    if (prop === 'toString') return false

    // Prevent non-configurable properties because proxies don't like when they're not
    // present on the base and it becomes a problem when a new inner type is set.
    if (!desc.configurable) return false

    // Other properties are defined on the inner type
    Object.defineProperty(this._innerType, prop, desc)

    return true
  }

  deleteProperty (target, prop) {
    // Don't allow special methods to be deleted
    if (prop === 'prototype') return false
    if (prop === 'toString') return false

    // Delete everything else on the inner type
    delete this._innerType[prop]

    return true
  }

  get (target, prop, receiver) {
    // Proxy prototypes must be returned from the base type. Always.
    if (prop === 'prototype') return this._baseType.prototype

    if (typeof target[prop] === 'function') {
      // toString requires special handling because we change inner types
      if (prop === 'toString') {
        // When user calls toString on us, get source for the inner type
        // When they call on a child class, return prototype of that child class.
        const callingThis = receiver === this._outerType || receiver === this._proxy
        const toStringTarget = callingThis ? this._innerType : receiver
        return Function.prototype.toString.bind(toStringTarget)
      }

      // Other functions should run on the proxy
      return target[prop].bind(receiver)
    }

    // Return all other value types directly on the inner type
    return this._innerType[prop]
  }

  getPrototypeOf (target) {
    return Object.getPrototypeOf(this._innerType)
  }

  getOwnPropertyDescriptor (target, prop) {
    // Proxy prototypes must be returned from the base type. Always.
    if (prop === 'prototype') return Object.getOwnPropertyDescriptor(this._baseType, prop)

    // Get own property describe on the inner type
    return Object.getOwnPropertyDescriptor(this._innerType, prop)
  }

  has (target, prop) {
    // Get has on the inner type
    return prop in this._innerType
  }

  isExtensible (target) {
    // Base type defines whether it is extensible or not
    return Object.isExtensible(this._baseType)
  }

  ownKeys (target) {
    // Get property names of inner type
    return Object.getOwnPropertyNames(this._innerType)
  }

  preventExtensions (target) {
    // Prevent extensions is permanent on both base and inner type
    Object.preventExtensions(this._baseType)
    Object.preventExtensions(this._innerType)
    return true
  }

  set (target, prop, value, receiver) {
    // Proxy prototypes cannot be changed
    if (prop === 'prototype') return false

    // toString cannot be set
    if (prop === 'toString') return false

    // All other properties are set on the inner type
    this._innerType[prop] = value

    return true
  }

  setPrototypeOf (target, prototype) {
    // No changing the prototype! Otherwise, we have to do the above checks.
    return false
  }

  _setInnerType (T) {
    // We can only change dynamic to another function type
    _checkArgument(typeof T === 'function', `Inner type must be a function type: ${T}`)

    // Check all types in the inheritance chain
    let x = T
    while (x) {
      if (x === Function.prototype) break
      if (x === SI.Function.prototype) break

      // The new type must not have a special toString property
      const error = `toString is a reserved property: ${T}`
      _checkArgument(!Object.getOwnPropertyNames(x).includes('toString'), error)

      x = Object.getPrototypeOf(x)
    }

    // If either the base type or new inner type is non-extensible, then so is the other
    // This is because Object.preventExtensions is permanant on the base type.
    if (!Object.isExtensible(this._baseType) || !Object.isExtensible(T)) {
      Object.preventExtensions(this._baseType)
      Object.preventExtensions(T)
    }

    // Classes can only change to classes and functions to functions
    // Why? Because other code might rely on this for example to instantiate.
    const wasClass = this._innerType.toString().startsWith('class')
    const willBeClass = T.toString().startsWith('class')
    const mismatchError = `Classes can only be changed to classes and functions to functions: ${T}`
    const skipMismatchCheck = this._innerType === this._baseType || T === this._baseType
    _checkArgument(skipMismatchCheck || wasClass === willBeClass, mismatchError)

    // No anonymous classes or functions
    _checkArgument(!_isAnonymous(T), `Types must not be anonymous: ${T}`)

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
    this._methodTable.constructor = this._outerType

    // Change the inner type
    this._innerType = T
  }

  _setOuterType (T) {
    this._outerType = T
    this._methodTable.constructor = T
  }
}

// ------------------------------------------------------------------------------------------------
// MethodTableHandler
// ------------------------------------------------------------------------------------------------

/**
 * Intercepts changes to the method table and prevents them
 *
 * The method table is also in the prototype chain for instances, so some parts are tricky!
 */
class MethodTableHandler {
  _init (methodTableProxy) {
    this._proxy = methodTableProxy
  }

  defineProperty (target, prop, desc) {
    return false
  }

  deleteProperty (target, prop) {
    return false
  }

  preventExtensions () {
    return false
  }

  set (target, prop, value, receiver) {
    // Prevent sets on ourselves
    if (receiver === this._proxy) return false

    // We also get called when instances or children of our prototype are set.
    // For these, disable the prototype chain and try again!
    const proto = Object.getPrototypeOf(receiver)
    try {
      Object.setPrototypeOf(receiver, Object.getPrototypeOf(Object))
      receiver[prop] = value
      return true
    } catch (e) {
      // Can't change prototype? It's the frozen base prototype. Disallow.
      return false
    } finally {
      // Set back.
      Object.setPrototypeOf(receiver, proto)
    }
  }

  setPrototypeOf (target, prototype) {
    // No changing the prototype! Method table is off limits
    return false
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Dynamic
