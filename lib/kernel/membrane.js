/**
 * jig.js
 *
 * Proxy handler common to all code and object jigs
 */

const Bindings = require('./bindings')
const Sandbox = require('./sandbox')
const { _assert } = require('./misc')
const SI = Sandbox._intrinsics
const {
  _isBasicObject, _isBasicArray, _isBasicMap, _isBasicSet, _isBasicUint8Array,
  _isArbitraryObject
} = require('./misc')

// TODO
//
// Public API ... prototype own names
// Set is part of the public API
// Get might also be part of the public API

// Getters can change state. So how does proxy handle?
// The outer get is the initiating action. Everything else is secondary.
// Any way to prevent his? Only if I disable setting properties.

// Meaning => I need to solve methods sooner than I'd hoped

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const STACK = [] // Array<Jig|Code>

const RECORD = null // Active record when STACK is non-empty

let ADMIN = false // Whether the normal jig safety checks for users are bypassed

const INNER_PROXIES = new WeakMap() // Object|Function|Proxy -> Proxy

// ------------------------------------------------------------------------------------------------
// MethodMembrane
// ------------------------------------------------------------------------------------------------

class MethodMembrane {
  apply (target, thisArg, args) {
    // console.log('Calling', target.name)

    // Make sure args do not conflict
    // Deploy arbitrary objects

    // TODO
    return Reflect.apply(target, thisArg, args)
  }

  construct (target, args, newTarget) { throw new Error('Cannot construct non-jig code') }
  defineProperty (target, prop, desc) { throw new Error('Cannot define properties on methods') }
  deleteProperty (target, prop, receiver) { throw new Error('Cannot delete properties on methods') }
  get (target, prop, receiver) { throw new Error('Cannot get properties on methods') }
  getOwnPropertyDescriptor (target, prop) { throw new Error('Cannot get property descriptors on jig methods') }
  getPrototypeOf (target) { return Object.getPrototypeOf(target) }
  has (target, prop) { throw new Error('Cannot check properties on jig methods') }
  isExtensible (target) { return false }
  ownKeys (target) { throw new Error('Cannot get keys of jig methods') }
  preventExtensions (target) { throw new Error('preventExtensions disallowed on jig methods') }
  set (target, prop, value, receiver) { throw new Error('Cannot set properties on jig methods') }
  setPrototypeOf (target, prototype) { throw new Error('Cannot change prototype of jig methods') }
}

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

/**
 * Proxy handler for all jigs
 *
 * Guarantees
 *    - Properties cannot be changed except through methods
 *    - Methods are atomic. Errors will be rolled back
 *    - Arguments passed to methods will be cloned for safety
 *    - toString on code will return the actual source code
 *    - Prototypes cannot be changed
 */
class Membrane {
  _init (target, proxy) {
    this._target = target
    this._proxy = proxy
  }

  // --------------------------------------------------------------------------
  // apply
  // --------------------------------------------------------------------------

  apply (target, thisArg, args) {
    this._checkNotErrored()

    if (STACK.length) RECORD._read(this._proxy)

    // Function jigs can run directly. No need to wrap args. No need to record.
    // They are essentially transparent helpers that can be upgraded.
    return Reflect.apply(this._target, undefined, args)
  }

  // --------------------------------------------------------------------------
  // construct
  // --------------------------------------------------------------------------

  construct (target, args, newTarget) {
    this._checkNotErrored()

    if (STACK.length) RECORD._read(this._proxy)

    return Reflect.construct(target, args, newTarget)
  }

  // --------------------------------------------------------------------------
  // defineProperty
  // --------------------------------------------------------------------------

  defineProperty (target, prop, desc) {
    this._checkNotErrored()

    if (!ADMIN) throw new Error('defineProperty disallowed')

    Reflect.defineProperty(this._target, prop, desc)

    return true
  }

  // --------------------------------------------------------------------------
  // deleteProperty
  // --------------------------------------------------------------------------

  deleteProperty (target, prop, receiver) {
    this._checkNotErrored()

    if (!ADMIN) {
      _assert(this._inside(), 'Only the jig may delete properties')
      _assert(!Bindings._BINDINGS.includes(prop), 'Must not delete bindings')
      _assert(Object.getOwnPropertyNames(this._target).includes(prop), 'Must only delete own properties')
      _assert(typeof prop !== 'symbol', 'Must not delete symbols')
    }

    if (STACK.length) RECORD._spend(this._proxy)

    delete this._target[prop]

    return true
  }

  get (target, prop, receiver) {
    this._checkNotErrored()

    if (!this._privateAccess() && prop.startsWith('_')) {
      throw new Error(`Cannot get ${prop} because it is private`)
    }

    if (STACK.length) RECORD._read(this._proxy)

    const hasOwnProp = Object.getOwnPropertyNames(this._target).includes(prop)
    if (!hasOwnProp && STACK.length) {
      const prototype = Object.getPrototypeOf(this._target)
      const Code = require('./code')
      if (prototype instanceof Code) RECORD._read(prototype)
    }

    // Read symbols?

    const val = this._target[prop]

    // Return function prototypes directly. Never return a proxy. Run already guarantees they
    // are immutable to users. We have to return the prototype before any instanceof checks.
    if (typeof this._target === 'function' && prop === 'prototype') {
      return target[prop]
    }

    // Detect errors when reading bindings in non-admin mode
    this._checkReadBindings(prop, val)

    // Return primitive types directly. These will look the same in every realm.
    const primitives = ['undefined', 'boolean', 'number', 'string', 'symbol']
    if (primitives.includes(typeof val)) return val

    const Code = require('./code')
    const Jig = require('./jig')
    const Berry = require('./berry')

    // Return jigs directly because they are already proxied and safe.
    if (val instanceof Code || val instanceof Jig || val instanceof Berry) {
      return val
    }

    // Wrap instance and static class methods with a proxy
    if (typeof val === 'function') {
      if (INNER_PROXIES.has(val)) return INNER_PROXIES.get(val)

      const methodMembrane = new MethodMembrane()
      const proxy = new SI.Proxy(val, methodMembrane)

      INNER_PROXIES.set(val, proxy)
      INNER_PROXIES.set(proxy, proxy)

      return proxy
    }

    // Always return the source code on the current target, not any of its parents.
    // if (typeof this._target === 'function' && prop === 'toString' && receiver === this._proxy) {
    // return this._target.toString.bind(this._target)
    // }

    // If we are getting a value from within the membrane, return it directly
    if (this._inside()) return val

    // When calling from OUTSIDE of the membrane, clone any objects and wrap any functions
    if (typeof val === 'function') {
    // Wrap
      return val

      // If owner is a new owner, and calling from the outside, can't call anymore.
    }

    if (typeof val === 'object' && val) {
      if (!global) console.log(Sandbox, Borrow)
      return val
      // return new Sandbox._intrinsics.Proxy(val, new Borrow(prop))
    }

    // If we are getting a property from outside the membrane, make a clone of it

    return val
  }

  // --------------------------------------------------------------------------
  // getOwnPropertyDescriptor
  // --------------------------------------------------------------------------

  getOwnPropertyDescriptor (target, prop) {
    this._checkNotErrored()

    // Prototypes must always be retrieved on the original target
    if (typeof this._target === 'function' && prop === 'prototype') {
      return Reflect.getOwnPropertyDescriptor(target, prop)
    }

    if (!this._privateAccess() && prop.startsWith('_')) {
      throw new Error(`Cannot check ${prop} because it is private`)
    }

    const hasOwnProp = Object.getOwnPropertyNames(this._target).includes(prop)
    const desc = SI.Reflect.getOwnPropertyDescriptor(this._target, prop)

    if (!hasOwnProp && STACK.length) {
      const prototype = Object.getPrototypeOf(this._target)
      const Code = require('./code')
      if (prototype instanceof Code) RECORD._read(prototype)
    }

    // TODO: Wrap the value
    return desc
  }

  // --------------------------------------------------------------------------
  // getPrototypeOf
  // --------------------------------------------------------------------------

  getPrototypeOf (target) {
    this._checkNotErrored()

    return Object.getPrototypeOf(this._target)
  }

  // --------------------------------------------------------------------------
  // has
  // --------------------------------------------------------------------------

  has (target, prop) {
    this._checkNotErrored()

    if (!this._privateAccess() && prop.startsWith('_')) {
      throw new Error(`Cannot check ${prop} because it is private`)
    }

    if (STACK.length) RECORD._read(this._proxy)

    const hasOwnProp = Object.getOwnPropertyNames(this._target).includes(prop)
    if (!hasOwnProp && STACK.length) {
      const prototype = Object.getPrototypeOf(this._target)
      const Code = require('./code')
      if (prototype instanceof Code) RECORD._read(prototype)
    }

    return prop in this._target
  }

  // --------------------------------------------------------------------------
  // isExtensible
  // --------------------------------------------------------------------------

  isExtensible (target) {
    this._checkNotErrored()

    return true
  }

  // --------------------------------------------------------------------------
  // ownKeys
  // --------------------------------------------------------------------------

  ownKeys (target) {
    this._checkNotErrored()

    if (STACK.length) RECORD._read(this._proxy)

    const allKeys = Reflect.ownKeys(this._target)

    if (this._privateAccess()) {
      return allKeys
    } else {
      return allKeys.filter(key => key[0] !== '_')
    }
  }

  // --------------------------------------------------------------------------
  // preventExtensions
  // --------------------------------------------------------------------------

  preventExtensions (target) {
    this._checkNotErrored()

    throw new Error('preventExtensions disallowed')
  }

  // --------------------------------------------------------------------------
  // set
  // --------------------------------------------------------------------------

  set (target, prop, value, receiver) {
    this._checkNotErrored()

    const setInternal = () => {
      const Code = require('./code')

      if (!ADMIN) {
        _assert(this._inside(), 'Only the jig may set properties')
        _assert(prop !== 'origin', 'Must not set origin')
        _assert(prop !== 'location', 'Must not set location')
        _assert(prop !== 'nonce', 'Must not set nonce')
        _assert(Object.getOwnPropertyNames(this._target).includes(prop),
          'Must only set own properties')
        _assert(typeof prop !== 'symbol', 'Must not set symbols')
      }

      // Check property name is not a symbol
      _assert(typeof prop === 'string', 'Must only set string keys')

      // Check property value is serializable
      _assert(typeof value !== 'symbol', 'Must not set symbols as values')
      _assert(typeof value !== 'function' || value instanceof Code,
        'Must not set non-jig functions as values')
      _assert(typeof value !== 'object' ||
        value === null ||
        _isBasicObject(value) ||
        _isBasicArray(value) ||
        _isBasicSet(value) ||
        _isBasicMap(value) ||
        _isBasicUint8Array(value) ||
        _isArbitraryObject(value), 'Must only set serializable objects')

      // Check the value being set does not belong to another jig

      if (STACK.length) RECORD._spend(this._proxy)

      this._target[prop] = value

      return true
    }

    // Stop proxy parent classes from intercepting sets on children. It doesn't make sense!
    if (typeof this._target === 'function') {
      const proto = Object.getPrototypeOf(this._target)
      try {
        Object.setPrototypeOf(this._target, Object.getPrototypeOf(Object))
        return setInternal()
      } finally {
        Object.setPrototypeOf(this._target, proto)
      }
    }

    return setInternal()
  }

  // --------------------------------------------------------------------------
  // setPrototypeOf
  // --------------------------------------------------------------------------

  setPrototypeOf (target, prototype) {
    this._checkNotErrored()

    _assert(ADMIN, 'setPrototypeOf disallowed')

    Object.setPrototypeOf(this._target, prototype)

    return true
  }

  // --------------------------------------------------------------------------
  // _privateAccess
  // --------------------------------------------------------------------------

  _privateAccess () {
    if (ADMIN) return true

    if (typeof this._target === 'function') {
      const Jig = require('./jig')

      // Private access is granted to all non-jig code
      let extendsJig = false
      let prototype = Object.getPrototypeOf(this._target)
      while (prototype) {
        if (prototype === Jig) { extendsJig = true; break }
        prototype = Object.getPrototypeOf(prototype)
      }
      if (!extendsJig) return true

      // Jig code can only access its own private properties
      return STACK.length && STACK[STACK.length - 1] !== this._proxy
    }

    // Jigs can only access properties from the same class
    return STACK.length && STACK[STACK.length - 1].constructor !== this._proxy.constructor
  }

  // --------------------------------------------------------------------------
  // _checkNotErrored
  // --------------------------------------------------------------------------

  _checkNotErrored () {
    if (ADMIN) return
    if (!Object.getOwnPropertyNames(this._target).includes('location')) return
    const { error, undeployed } = Bindings._location(this._target.location)
    if (error && !undeployed) throw new Error(error)
  }

  // --------------------------------------------------------------------------
  // _inside
  // --------------------------------------------------------------------------

  _inside () {
    return STACK.length && STACK[STACK.length - 1] === this._proxy
  }

  // --------------------------------------------------------------------------
  // _checkReadBindings
  // --------------------------------------------------------------------------

  _checkReadBindings (prop, val) {
    if (ADMIN) return

    try {
      if (prop === 'location' || prop === 'origin' || prop === 'nonce') {
        // Treat nonce the same as location for readability
        if (prop === 'nonce') val = this._target.location

        const loc = Bindings._location(val)
        _assert(!loc.undeployed, 'Undeployed. Please sync.')
        _assert(!loc.error, `An previous error occurred\n\n${loc.error}`)

        const hint = `Hint: Sync the jig first to assign ${prop} in a transaction`
        _assert(loc.txid && ('vout' in loc || 'vdel' in loc), `undetermined\n\n${hint}`)
      }

      if (prop === 'owner' || prop === 'satoshis') {
        const Unbound = require('./unbound')

        if (val instanceof Unbound) {
          const hint = `Hint: Sync the jig first to bind ${prop} in a transaction`
          throw new Error(`unbound\n\n${hint}`)
        }

        if (prop === 'owner') Bindings._owner(val)
        if (prop === 'satoshis') Bindings._satoshis(val)
      }
    } catch (e) {
      throw new Error(`Cannot read ${prop}: ${e.message}`)
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Borrow
// ------------------------------------------------------------------------------------------------

class Borrow {
  constructor (prop) {
    console.log('Borrow', prop)
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function sudo (f) {
  const prev = ADMIN
  try {
    ADMIN = true
    return f()
  } finally {
    ADMIN = prev
  }
}

// ------------------------------------------------------------------------------------------------

Membrane._sudo = sudo

module.exports = Membrane
