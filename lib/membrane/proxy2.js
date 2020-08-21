/**
 * proxy2.js
 *
 * A proxy that supports intrinsics supported by Run including:
 *
 *    Set
 *    Map
 *    Uint8Array
 *
 * These intrinsics have methods that modify their internal state that proxies don't naturally
 * handle. This is unlike Object and Array instances where every method, even complex ones
 * like sort(), calls proxy handlers. Proxy2 creates new traps for these new intrinsics.
 *
 * Proxy2 also assumes and enforces that every target may only have a single proxy, and that the
 * proxy must be an instance of the sandbox proxy. These requirements are unique to Run and are
 * not expected to be useful outside of this library.
 *
 * The following handler methods are supported in Proxy2:
 *
 *    Standard traps:           // With underscore prefix
 *
 *      _apply (target, thisArg, args)
 *      _construct (target, args, newTarget)
 *      _defineProperty (target, prop, desc)
 *      _deleteProperty (target, prop)
 *      _get (target, prop, receiver)
 *      _getOwnPropertyDescriptor (target, prop)
 *      _getPrototypeOf (target)
 *      _has (target, prop)
 *      _isExtensible (target)
 *      _ownKeys (target)
 *      _preventExtensions (target)
 *      _set (target, prop, value, receiver)
 *      _setPrototypeOf (target, prototype)
 *
 *    New traps:                // For Set, Map, and Uint8Array targets
 *
 *      _nativeGetMethod ()     // Get intrinsic method
 *      _nativeOut (value)      // ex. get(), forEach(): object -> object
 *      _nativeIn (value)       // ex. add(), set(): object -> object
 *      _nativeRead ()          // ex. has(), includes()
 *      _nativeUpdate ()        // ex. clear(), delete(), sort()
 */

const {
  _isBasicSet, _isBasicMap, _isBasicUint8Array, _ownGetters, _ownMethods, _assert
} = require('../util/misc')
const Sandbox = require('../util/sandbox')
const SI = Sandbox._intrinsics

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const PROXIES = new WeakMap() // Target -> Proxy
const TARGETS = new WeakMap() // Proxy -> Target
const HANDLERS = new WeakMap() // Target | Proxy -> Handler

const INTRINSIC_METHODS = new WeakMap() // Target Method -> Proxy Method

const SET_GETTERS = _ownGetters(Set.prototype)
const MAP_GETTERS = _ownGetters(Map.prototype)
const UINT8ARRAY_GETTERS = _ownGetters(Uint8Array.prototype)
  .concat(_ownGetters(Object.getPrototypeOf(Uint8Array.prototype)))

const SET_METHODS = _ownMethods(Set.prototype)
const MAP_METHODS = _ownMethods(Map.prototype)
const UINT8ARRAY_METHODS = _ownMethods(Uint8Array.prototype)
  .concat(_ownMethods(Object.getPrototypeOf(Uint8Array.prototype)))

const UPDATE_METHODS = ['add', 'clear', 'copyWithin', 'delete', 'fill', 'reverse', 'set', 'sort']
const READ_METHODS = ['entries', 'every', 'filter', 'find', 'findIndex', 'forEach', 'get',
  'has', 'includes', 'indexOf', 'join', 'keys', 'lastIndexOf', 'map', 'reduce', 'reduceRight',
  'slice', 'some', 'subarray', 'toLocaleString', 'toString', 'values', Symbol.iterator]

// Find

// ------------------------------------------------------------------------------------------------
// Proxy2
// ------------------------------------------------------------------------------------------------

class Proxy2 {
  constructor (target, handler) {
    _assert(!PROXIES.has(target))

    const proxy = new SI.Proxy(target, this)

    PROXIES.set(target, proxy)
    TARGETS.set(proxy, target)
    HANDLERS.set(target, handler)
    HANDLERS.set(proxy, handler)

    this._handler = handler

    return proxy
  }

  // Standard proxy handlers
  apply (...args) { return this._handler._apply ? this._handler._apply(...args) : Reflect.apply(...args) }
  construct (...args) { return this._handler._construct ? this._handler._construct(...args) : Reflect.construct(...args) }
  defineProperty (...args) { return this._handler._defineProperty ? this._handler._defineProperty(...args) : Reflect.defineProperty(...args) }
  deleteProperty (...args) { return this._handler._deleteProperty ? this._handler._deleteProperty(...args) : Reflect.deleteProperty(...args) }
  getPrototypeOf (...args) { return this._handler._getPrototypeOf ? this._handler._getPrototypeOf(...args) : Reflect.getPrototypeOf(...args) }
  has (...args) { return this._handler._has ? this._handler.has(...args) : Reflect._has(...args) }
  isExtensible (...args) { return this._handler._isExtensible ? this._handler._isExtensible(...args) : Reflect.isExtensible(...args) }
  ownKeys (...args) { return this._handler._ownKeys ? this._handler._ownKeys(...args) : Reflect.ownKeys(...args) }
  preventExtensions (...args) { return this._handler._preventExtensions ? this._handler._preventExtensions(...args) : Reflect.preventExtensions(...args) }
  set (...args) { return this._handler.set ? this._handler._set(...args) : Reflect.set(...args) }
  setPrototypeOf (...args) { return this._handler._setPrototypeOf ? this._handler._setPrototypeOf(...args) : Reflect.setPrototypeOf(...args) }

  // Modify get to handle all intrinsic methods using the special traps
  get (target, prop, receiver) {
    // Determine the type of target
    const isSet = _isBasicSet(target)
    const isMap = _isBasicMap(target)
    const isUint8Array = _isBasicUint8Array(target)

    // Determine if this prop is a getter on an intrinsic type
    const isIntrinsicGetter =
      (isSet && SET_GETTERS.includes(prop)) ||
      (isMap && MAP_GETTERS.includes(prop)) ||
      (isUint8Array && UINT8ARRAY_GETTERS.includes(prop))

    // Run intrinsic getters directly on target. Otherwise, they fail.
    if (isIntrinsicGetter) {
      // Notify on getting a native method
      if (this._handler._nativeGetMethod) this._handler._nativeGetMethod()

      // Convert the native value if necessary
      const nativeValue = Reflect.get(target, prop, target)
      return this._handler._nativeGet ? this._handler._nativeGet(nativeValue) : nativeValue
    }

    // Get the underlying property value
    const value = Reflect.get(target, prop, receiver)

    // Determine if this is a method on an intrinsic type
    const isIntrinsicMethod =
      (isSet && SET_METHODS.includes(prop)) ||
      (isMap && MAP_METHODS.includes(prop)) ||
      (isUint8Array && UINT8ARRAY_METHODS.includes(prop))

    // Wrap intrinsic methods
    if (isIntrinsicMethod) {
      // Notify on getting a native method
      if (this._handler._nativeGetMethod) this._handler._nativeGetMethod()

      // If already wrapped, return directly
      if (INTRINSIC_METHODS.has(value)) return INTRINSIC_METHODS.get(value)

      const methodHandler = new IntrinsicMethodHandler(isSet, isMap, isUint8Array, prop)
      const methodProxy = new Proxy(value, methodHandler)
      INTRINSIC_METHODS.set(value, methodProxy)
      return methodProxy
    }

    // Otherwise, use the handler's get
    return this._handler._get ? this._handler._get(target, prop, receiver) : value
  }

  getOwnPropertyDescriptor (target, prop) {
    // TODO
  }

  // Set to set the non-proxy
  // Or is that the role of the membrane?

  static _getHandler (x) { return HANDLERS.get(x) }
  static _getProxy (x) { return PROXIES.get(x) }
  static _getTarget (x) { return TARGETS.get(x) }
}

// ------------------------------------------------------------------------------------------------
// IntrinsicMethodHandler
// ------------------------------------------------------------------------------------------------

// Assumes intrinsic methods are already immutable and require no special handling
class IntrinsicMethodHandler {
  constructor (isSet, isMap, isUint8Array, prop) {
    this._isSet = isSet
    this._isMap = isMap
    this._isBasicUint8Array = isUint8Array

    this._prop = prop

    this._read = READ_METHODS.includes(prop)
    this._update = UPDATE_METHODS.includes(prop)

    this._returnsThis =
      (isSet && ['add'].includes(prop)) ||
      (isMap && ['set'].includes(prop)) ||
      (isUint8Array && ['copyWithin', 'fill', 'reverse', 'sort'].includes(prop))

    // Uint8Array instances don't need a proxy iterator because their values are primitives
    this._returnsWrappedIterator =
      (isSet && ['entries', 'values', Symbol.iterator].includes(prop)) ||
      (isMap && ['entries', 'keys', 'values', Symbol.iterator].includes(prop))

    // Most iterators return a single value each time. Pair iterators return two.
    this._pairIterator = this._returnsWrappedIterator && prop === 'entries'

    // Uint8Array instances don't need find to return a proxy value because it is a primitive
    this._returnsValue = isMap && prop === 'get'

    this._passesInFirstValue =
      (isSet && ['add', 'delete', 'has'].includes(prop)) ||
      (isMap && ['delete', 'get', 'has', 'set'].includes(prop))

    this._passesInSecondValue =
      (isMap && ['set'].includes(prop))
  }

  apply (target, thisArg, args) {
    const proxy = Proxy2._getProxy(thisArg) || thisArg
    const handler = Proxy2._getHandler(thisArg)

    // Record inner reads and inner updates based on the method
    if (handler) {
      if (handler._nativeRead && this._read) handler._nativeRead()
      if (handler._nativeUpdate && this._update) handler._nativeUpdate()
    }

    // TODO: Wrap function args going in to convert

    // Convert the first argument going in if necessary
    if (this._passesInFirstValue && args[0] && handler && handler._nativeIn) {
      args[0] = handler._nativeIn(args[0])
    }

    // Convert the second argument going in if necessary
    if (this._passesInSecondValue && args[1] && handler && handler._nativeIn) {
      args[1] = handler._nativeIn(args[1])
    }

    // The the underlying intrinsic type if it exists
    const thisArgTarget = Proxy2._getTarget(thisArg) || thisArg

    // Run the function with the modified args on the original target
    const ret = Reflect.apply(target, thisArgTarget, args)

    // If this method is supposed to return self, return it
    if (this._returnsThis) return proxy

    // If this method returns a single value, convert and return it
    if (this._returnsValue) return handler && handler._nativeOut && ret ? handler._nativeOut(ret) : ret

    // Iterator need to be specially handled
    if (this._returnsWrappedIterator) {
      return new SandboxedWrappedIterator(ret, handler, this._pairIterator)
    }

    // Otherwise, return the original return value, which is some non-inner object
    return ret
  }
}

// ------------------------------------------------------------------------------------------------
// SandboxedWrappedIterator
// ------------------------------------------------------------------------------------------------

// Iterator that can replace every value using a handler's _nativeOut method
class WrappedIterator {
  constructor (it, handler, pair) {
    this._it = it
    this._handler = handler
    this._pair = pair
  }

  next () {
    const n = this._it.next()

    const ret = {}
    ret.done = n.done
    ret.value = n.value

    if (this._handler && this._handler._nativeOut) {
      if (this._pair && ret.value) {
        const a = ret.value[0] ? this._handler._nativeOut(ret.value[0]) : ret.value[0]
        const b = ret.value[1] ? this._handler._nativeOut(ret.value[1]) : ret.value[1]
        ret.value = [a, b]
      } else {
        ret.value = ret.value ? this._handler._nativeOut(ret.value) : ret.value
      }
    }

    return ret
  }

  [Symbol.iterator] () { return this }
}

const SandboxedWrappedIterator = Sandbox._sandboxType(WrappedIterator)[0]

// ------------------------------------------------------------------------------------------------

module.exports = Proxy2
