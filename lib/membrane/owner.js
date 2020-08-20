/**
 * owner.js
 *
 * Membrane that allows inner objects to be owned by a parent. These owned objects may only be
 * changed by that parent and objects owned by other parents cannot be assigned as properties.
 */

const Membrane = require('./membrane')
const Proxy = require('../util/proxy')
const { _checkState } = require('../util/misc')
const SI = require('../util/sandbox')._intrinsics

// TODO:
// - Call an inner method that changes ... like Array ... and Set
// - Call a jig method ... what to do with args going in and ret coming out
// - PENDING list when update

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const RECORD = () => require('../kernel/record')._CURRENT_RECORD

const BORROWS = new WeakMap() // Target -> Borrowed Proxy
const OWNERS = new WeakMap() // Borrowed Proxy -> Container

// Borrows that were just created that we shouldn't use quite yet inside the current action
// const PENDING = new WeakMap() // Target -> Action

// ------------------------------------------------------------------------------------------------
// Owner
// ------------------------------------------------------------------------------------------------

class Owner extends Membrane {
  get (target, prop, receiver) {
    const value = super.get(target, prop, receiver)

    const proxy = Proxy._getProxy(target)
    return borrowValue(proxy, target, prop, value)
  }

  getOwnPropertyDescriptor (target, prop) {
    const desc = super.getOwnPropertyDescriptor(target, prop)
    const { value } = desc

    // This immutable membrane does not support getters and setters yet
    _checkState('value' in desc, 'Getters and setters not supported')

    const proxy = Proxy._getProxy(target)
    desc.value = borrowValue(proxy, target, prop, value)
    return desc
  }
}

// ------------------------------------------------------------------------------------------------
// Borrow
// ------------------------------------------------------------------------------------------------

/**
 * Membrane for an inner object that enforces that only its owner may change its properties
 */
class Borrowed extends Membrane {
  constructor (container, changer, inner) {
    super(inner)
    this._container = container
    this._changer = changer
  }

  apply (target, thisArg, args) {
    if (this._changer) checkMutable(this._container)
    return super.apply(target, thisArg, args)
  }

  defineProperty (target, prop, desc) {
    checkMutable(this._container)
    return super.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    checkMutable(this._container)
    return super.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    const value = super.get(target, prop, receiver)

    return borrowValue(this._container, target, prop, value)
  }

  getOwnPropertyDescriptor (target, prop) {
    const desc = super.getOwnPropertyDescriptor(target, prop)
    const { value } = desc

    // This immutable membrane does not support getters and setters yet
    _checkState('value' in desc, 'Getters and setters not supported')

    desc.value = borrowValue(this._container, target, prop, value)
    return desc
  }

  preventExtensions (target) {
    checkMutable(this._container)
    return super.preventExtensions(target)
  }

  set (target, prop, value, receiver) {
    checkMutable(this._container)
    return super.set(target, prop, value, receiver)
  }

  setPrototypeOf (target, prototype) {
    checkMutable(this._container)
    return super.setPrototypeOf(target, prototype)
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function checkMutable (container) {
  const stack = RECORD()._stack
  return stack.length && stack[stack.length - 1]._jig === container
}

// ------------------------------------------------------------------------------------------------

function borrowValue (proxy, target, prop, value) {
  if (typeof value === 'object' || typeof value === 'function') return value

  // Jigs, Code, and Berries have their own ownership rules
  const Jig = require('../kernel/jig')
  const Code = require('../kernel/code')
  const Berry = require('../kernel/berry')
  if (value instanceof Jig || value instanceof Code || value instanceof Berry) return value

  // Check if we've already created a borrowed value
  if (BORROWS.has(value)) return BORROWS.get(value)

  // Create a wrapped version of the object that enforces borrowing rules
  const changer = isChanger(target, prop)
  const handler = new Borrowed(proxy, changer)
  const borrow = new Proxy(value, handler)
  BORROWS.set(value, borrow)
  OWNERS.set(borrow, proxy)
  return borrow
}

// ------------------------------------------------------------------------------------------------

function isChanger (target, prop) {
  if (target instanceof Set || target instanceof SI.Set) {
    // TODO
  }

  if (target instanceof Map || target instanceof SI.Map) {
    // TODO
  }

  // Arrays don't need to be changers because they do sets/deletes on the object.

  // Uint8Array methods don't like to be called on proxies. Need to call on targets.

  // Same for Set.add
}

// ------------------------------------------------------------------------------------------------

function getBorrow (target) {
  return BORROWS.get(target) || target
}

// ------------------------------------------------------------------------------------------------

function getOwner (target) {
  return OWNERS.get(target)
}

// ------------------------------------------------------------------------------------------------

Owner._getBorrow = getBorrow
Owner._getOwner = getOwner

module.exports = Owner
