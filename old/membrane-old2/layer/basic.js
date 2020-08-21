/**
 * basic.js
 *
 * Membrane that allows intrinsics supported by Run to be used in a membrane. Because unless we
 * handle them specially, Set, Map, and TypedArray methods will throw errors that the target is
 * not the of the intrinsic type. We want to allow intrinsics to be used normally but intercepted.
 */

const Membrane = require('./membrane.txt')
const Sandbox = require('../../util/sandbox')
const { _ownGetters, _ownMethods } = require('../../util/misc')
const SI = Sandbox._intrinsics
const HI = Sandbox._hostIntrinsics

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const INTRINSIC_METHODS = new WeakMap() // Method -> Proxy Method

const SET_GETTERS = _ownGetters(Set.prototype)
const MAP_GETTERS = _ownGetters(Map.prototype)
const UINT8ARRAY_GETTERS = _ownGetters(Uint8Array.prototype)
  .concat(_ownGetters(Object.getPrototypeOf(Uint8Array.prototype)))

const SET_METHODS = _ownMethods(Set.prototype)
const MAP_METHODS = _ownMethods(Map.prototype)
const UINT8ARRAY_METHODS = _ownMethods(Uint8Array.prototype)
  .concat(_ownMethods(Object.getPrototypeOf(Uint8Array.prototype)))

// ------------------------------------------------------------------------------------------------
// Basic
// ------------------------------------------------------------------------------------------------

class Basic extends Membrane {
  get (target, prop, receiver) {
    // Run getters on the target
    if (isIntrinsicGetter(target, prop)) return super.get(target, prop, target)

    // If not a getter, get the value.
    const value = super.get(target, prop, receiver)

    // If not a method, then pass through
    if (typeof target[prop] !== 'function') return value

    // If not an intrinsic method, then pass through
    if (!isIntrinsicMethod(target, prop)) return value

    // If we've already wrapped this intrinsic method, then return that
    if (INTRINSIC_METHODS.has(value)) return INTRINSIC_METHODS.get(value)

    // Wrap the intrinsic method and save it for later
    const proxy = new Proxy(value, new IntrinsicMethod())
    INTRINSIC_METHODS.set(value, proxy)
    return proxy
  }
}

// ------------------------------------------------------------------------------------------------
// IntrinsicMethod
// ------------------------------------------------------------------------------------------------

class IntrinsicMethod extends Membrane {
  apply (target, thisArg, args) {
    // Use the underlying target if it exists
    const ogTarget = Membrane._getOGTarget(thisArg) || thisArg

    // Apply the method
    return super.apply(target, ogTarget, args)
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function isIntrinsicGetter (target, prop) {
  if (target instanceof HI.Set || target instanceof SI.Set) {
    return SET_GETTERS.includes(prop)
  }

  if (target instanceof HI.Map || target instanceof SI.Map) {
    return MAP_GETTERS.includes(prop)
  }

  if (target instanceof HI.Uint8Array || target instanceof SI.Uint8Array) {
    return UINT8ARRAY_GETTERS.includes(prop)
  }

  return false
}

function isIntrinsicMethod (target, prop) {
  if (target instanceof HI.Set || target instanceof SI.Set) {
    return SET_METHODS.includes(prop)
  }

  if (target instanceof HI.Map || target instanceof SI.Map) {
    return MAP_METHODS.includes(prop)
  }

  if (target instanceof HI.Uint8Array || target instanceof SI.Uint8Array) {
    return UINT8ARRAY_METHODS.includes(prop)
  }

  return false
}

// ------------------------------------------------------------------------------------------------

module.exports = Basic
