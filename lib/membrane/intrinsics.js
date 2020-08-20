/**
 * intrinsics
 *
 * Membrane that allows intrinsics supported by Run to be used in proxy. Because unless we handle
 * them specially, Set, Map, and TypedArray methods will throw errors that the target is not the
 * of the intrinsic type. We want to allow intrinsics to be used normally, but tracked.
 */

const Membrane = require('./membrane')
const Proxy = require('../util/proxy')
const Sandbox = require('../util/sandbox')
const SI = Sandbox._intrinsics
const HI = Sandbox._hostIntrinsics

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const INTRINSIC_METHODS = new WeakMap() // Method -> Proxy Method

const SET_GETTERS = ['size', Symbol.species]

const MAP_GETTERS = ['size', Symbol.toStringTag, Symbol.species]

const UINT8ARRAY_GETTERS = ['buffer', 'byteLength', 'byteOffset', 'length', Symbol.species]

const SET_METHODS = ['add', 'clear', 'delete', 'entries', 'forEach', 'has', 'values',
  Symbol.iterator]

const MAP_METHODS = ['clear', 'delete', 'entries', 'forEach', 'get', 'has', 'keys', 'set',
  'values', Symbol.iterator]

const UINT8ARRAY_METHODS = ['copyWithin', 'entries', 'every', 'fill', 'filter', 'find',
  'findIndex', 'forEach', 'includes', 'indexOf', 'join', 'keys', 'lastIndexOf', 'map', 'reduce',
  'reduceRight', 'reverse', 'set', 'slice', 'some', 'sort', 'subarray', 'toLocaleString',
  'toString', 'values', Symbol.iterator]

// ------------------------------------------------------------------------------------------------
// Intrinsics
// ------------------------------------------------------------------------------------------------

class Intrinsics extends Membrane {
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
    const thisArgTarget = Proxy._getTarget(thisArg) || thisArg

    // Apply the method
    return super.apply(target, thisArgTarget, args)
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

Intrinsics._SET_GETTERS = SET_GETTERS
Intrinsics._SET_METHODS = SET_METHODS
Intrinsics._MAP_GETTERS = MAP_GETTERS
Intrinsics._MAP_METHODS = MAP_METHODS
Intrinsics._UINT8ARRAY_GETTERS = UINT8ARRAY_GETTERS
Intrinsics._UINT8ARRAY_METHODS = UINT8ARRAY_METHODS

module.exports = Intrinsics
