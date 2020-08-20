/**
 * intrinsics
 *
 * Membrane that allows intrinsics supported by Run to be used in proxy. Because unless we handle
 * them specially, Set, Map, and TypedArray methods will throw errors that the target is not the
 * of the intrinsic type. We want to allow intrinsics to be used normally, but tracked.
 */

const Membrane = require('./membrane')
const Proxy = require('../util/proxy')
// const Sandbox = require('../util/sandbox')
// const SI = Sandbox._intrinsics

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const INTRINSIC_METHODS = new WeakMap() // Method -> Proxy Method

// ------------------------------------------------------------------------------------------------
// Intrinsics
// ------------------------------------------------------------------------------------------------

class Intrinsics extends Membrane {
  get (target, prop, receiver) {
    console.log('get', prop)

    // If this is a getter...

    const value = super.get(target, prop, receiver)

    // If not an intrinsic method, then pass through
    if (!isIntrinsicMethod(target, prop)) return value

    // If we've already wrapped this intrinsic method, then return that
    if (INTRINSIC_METHODS.get(value)) return INTRINSIC_METHODS.get(value)

    // Wrap the intrinsic method and save it for later
    const proxy = new Proxy(value, new IntrinsicMethod())
    INTRINSIC_METHODS.set(value, proxy)
    return proxy
  }

  getOwnPropertyDescriptor (target, prop) {
    console.log('desc', prop)

    const value = super.getOwnPropertyDescriptor(target, prop)
    return value

    // TODO
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

function isIntrinsicMethod (target, prop) {
  if (typeof target[prop] !== 'function') return false

  // TODO
  return true
}

// ------------------------------------------------------------------------------------------------

module.exports = Intrinsics
