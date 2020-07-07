/**
 * jig.js
 *
 * Proxy handler common to all code and object jigs
 */

const Bindings = require('./bindings')
const Sandbox = require('./sandbox')
const { _assert } = require('./misc')
const SI = Sandbox._intrinsics

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

  /**
   * Trap for getting properties
   */
  get (target, prop, receiver) {
    const val = this._target[prop]

    // Return function prototypes directly. Never return a proxy. Run already guarantees they
    // are immutable to users. We have to return the prototype before any instanceof checks.
    if (typeof this._target === 'function' && prop === 'prototype') {
      return target[prop]
    }

    // Detect errors when reading bindings in non-admin mode
    this._authorizeRead(prop, val)

    // Return primitive types directly. These will look the same in every realm.
    const primitives = ['undefined', 'boolean', 'number', 'string', 'symbol']
    if (primitives.includes(typeof val)) return val

    const Code = require('./code')
    const Jig = require('./jig')
    const Berry = require('./berry')

    // Return blockchain objects directly because they are already proxied and safe.
    if (val instanceof Code || val instanceof Jig || val instanceof Berry) {
      return val
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

  set (target, prop, value, receiver) {
    // Stop proxy parent classes from intercepting sets on children. It doesn't make sense!
    if (typeof this._target === 'function') {
      const proto = Object.getPrototypeOf(this._target)
      try {
        Object.setPrototypeOf(this._target, Object.getPrototypeOf(Object))
        this._target[prop] = value
      } finally {
        Object.setPrototypeOf(this._target, proto)
      }
      return true
    }

    // if (receiver === this._proxy || receiver === this._target) {
    // console.log('1')
    this._target[prop] = value
    // } else {
    // console.log('2')
    // Reflect.set(receiver, prop, value, receiver)
    // }

    return true
  }

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
  // setPrototypeOf
  // --------------------------------------------------------------------------

  setPrototypeOf (target, prototype) {
    this._checkNotErrored()

    _assert(ADMIN, 'setPrototypeOf disallowed')

    Object.setPrototypeOf(this._target, prototype)

    return true
  }

  construct (target, args, newTarget) {
    // console.log('construct')
    return Reflect.construct(target, args, newTarget)
    // const obj = {}
    // Object.setPrototypeOf(obj, this._target.prototype)
    // return obj
  }

  apply (target, thisArg, args) {
    return this._target(...args)
  }

  // --------------------------------------------------------------------------
  // _privateAccess
  // --------------------------------------------------------------------------

  _privateAccess () {
    if (ADMIN) return true

    // If external, then no problem. Eh, maybe same thing.

    // This works for objects ... but for classes?
    // return STACK.length && STACK[STACK.length - 1].constructor !== this._proxy.constructor

    // When on a static method, target is function, and must be a jig too

    // Class extends jig, it gets the static jig rules

    // How to tell if a class extends a jig?
    // Object.getPrototypeOf(x) === Jig eventually
  }

  // --------------------------------------------------------------------------
  // _checkNotErrored
  // --------------------------------------------------------------------------

  _checkNotErrored () {
    if (ADMIN) return
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

  _bind (prop, value, network) { this._target[prop] = value }

  _authorizeRead (prop, val) {
    if (ADMIN) return

    try {
      if (prop === 'location' || prop === 'origin' || prop === 'nonce') {
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
