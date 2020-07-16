/**
 * jig.js
 *
 * Proxy handler common to all code and object jigs
 */

const Bindings = require('../util/bindings')
const Sandbox = require('../util/sandbox')
const { _assert } = require('../util/misc')
const SI = Sandbox._intrinsics
const {
  _isBasicObject, _isBasicArray, _isBasicMap, _isBasicSet, _isBasicUint8Array,
  _isArbitraryObject
} = require('../util/misc')

const { _deepClone } = require('../util/deep')

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
let ERROR = null // The error that happened while calling a method
let RECORD = null // Active record when STACK is non-empty
let ADMIN = false // Whether the normal jig safety checks for users are bypassed

/**
 * Possessed principles for inner non-jig objects:
 *
 *    Possession is ownership of non-jig objects by jigs
 *    Possession is determined upon first assignment to a jig
 *    Possession is permanent
 *    Possession is enforced with proxies
 *
 * There is a finalization
 *
 *    Finalization of possession
 *    Possession proxies are returned from get (except when non-final to the jig)
 *    Possession proxies are converted in args (except when non-final to the ig)
 *    Original objects are used within the assignment method, even from gets and returns
 */

// const POSSESSION_JIGS = new WeakMap() // Object | Proxy -> Jig
// const POSSESSION_PROXIES = new WeakMap() // Object | Proxy -> Proxy
// const POSSESSION_OBJECTS = new WeakMap() // Object | Proxy -> Object

const PROXY_METHODS = new WeakMap() // Function | Proxy -> Proxy
const PROXY_OWNERS = new WeakMap() // Proxy -> Jig | Code

// ------------------------------------------------------------------------------------------------
// MethodHandler
// ------------------------------------------------------------------------------------------------

class MethodHandler {
  _init (name, target, proxy) {
    this._name = name
    this._target = target
    this._proxy = proxy
  }

  apply (target, thisArg, args) {
    const Jig = require('./jig')
    const Code = require('./code')
    const File = require('./file')
    const Command = require('./command')
    const { _recordMultiple, _record } = require('./record')

    // Function.toString is special. It should be allowed to run on extended classes before they are code.
    if (typeof thisArg === 'function' && this._name === 'toString') {
      return Reflect.apply(target, thisArg, args)
    }

    // Check that the user isn't doing something they shouldn't
    _assert(thisArg instanceof Jig || thisArg instanceof Code, `Jig methods must only be called on jigs: ${this._name}`)
    _assert(thisArg[this._name] === this._proxy, `Jig methods must only be applied to their instances: ${this._name}`)

    // If this is a built-in Jig or Code function, then return it directly. No wrapping.
    const builtin = (thisArg instanceof Code &&
      Object.getOwnPropertyNames(Code.prototype).includes(this._name)) ||
      (thisArg instanceof Jig &&
        Object.getOwnPropertyNames(Jig.prototype).includes(this._name))
    if (builtin) return Reflect.apply(target, thisArg, args)

    // If this is a non-jig code static method, call it without this
    let isJig = thisArg instanceof Jig
    if (thisArg instanceof Code) {
      let parent = Object.getPrototypeOf(thisArg)
      while (parent) {
        if (parent === Jig) { isJig = true; break }
        parent = Object.getPrototypeOf(parent)
      }
    }
    if (!isJig) return Reflect.apply(target, undefined, args)

    // Crossing a membrane into a different jig will clone all args. Why? The outside jig may
    // have a reference to one of the objects passed and could change it after the method.
    // There is no way to prevent, so we clone the args. This also gives the membrane its name.
    const clonedArgs = _deepClone(args, SI, x => {
      // No deploying inside
      if (STACK.length) return

      // Deploy from the top-level
      if (typeof x === 'function' && !(x instanceof Code)) {
        const file = new File(x)
        file._deploy()
        return file._jig
      }
    })

    // If inside, call directly
    if (STACK.length) return this._call(target, thisArg, clonedArgs)

    // Record the call as a top-level action
    return _recordMultiple(() => {
      let clonedArgs = null

      // Deploy arbitrary code and other classes as params
      clonedArgs = _deepClone(args, SI, x => {
        if (typeof x === 'function' && !(x instanceof Code)) {
          const file = new File(x)
          file._deploy()
          return file._jig
        }
      })

      // Call the method
      return _record(record => {
        RECORD = record
        try {
          const ret = this._call(target, thisArg, clonedArgs)

          if (!STACK.length) Command._call(RECORD, thisArg, this._name, clonedArgs)

          return ret
        } finally {
          RECORD = null
        }
      })
    })
  }

  _call (target, thisArg, clonedArgs) {
    STACK.push(thisArg)

    let ret = null

    try {
      ret = Reflect.apply(target, thisArg, clonedArgs)
    } catch (e) {
      ERROR = e
    } finally {
      STACK.pop()
    }

    // If there was an error in any inner jig, throw the error
    if (ERROR) {
      const e = ERROR
      if (!STACK.length) ERROR = null
      throw e
    }

    // If are returning to the user, clone the args for the host
    if (!STACK.length) {
      ret = _deepClone(ret)
    }

    return ret
  }

  construct (target, args, newTarget) { throw new Error('Cannot construct non-jig code') }
  defineProperty (target, prop, desc) { throw new Error('Cannot define properties on methods') }
  deleteProperty (target, prop, receiver) { throw new Error('Cannot delete properties on methods') }
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

    if (!this._privateAccess() && typeof prop === 'string' && prop.startsWith('_')) {
      throw new Error(`Cannot get ${prop} because it is private`)
    }

    // Mark this jig as read just be accessing get.
    if (STACK.length) RECORD._read(this._proxy)

    // Return function prototypes directly. Never return a proxy. Run already guarantees they
    // are immutable to users. We have to return the prototype before any instanceof checks.
    if (typeof this._target === 'function' && prop === 'prototype') return target[prop]

    // Get the value. The class or parent class might be read in the process.
    const val = this._target[prop]

    // Detect errors when reading bindings in non-admin mode
    this._checkGettable(prop, val)

    // Return primitive types directly. These will look the same in every realm.
    const primitives = ['undefined', 'boolean', 'number', 'string', 'symbol']
    if (primitives.includes(typeof val)) return val

    // Return jigs directly because they are already proxied and safe.
    const Jig = require('./jig')
    const Code = require('./code')
    const Berry = require('./berry')
    if (val instanceof Code || val instanceof Jig || val instanceof Berry) {
      return val
    }

    // Wrap instance and static class methods with a proxy
    if (typeof val === 'function') {
      if (PROXY_METHODS.has(val)) return PROXY_METHODS.get(val)

      const methodHandler = new MethodHandler()
      const proxy = new SI.Proxy(val, methodHandler)
      methodHandler._init(prop, val, proxy)

      PROXY_METHODS.set(val, proxy)
      PROXY_METHODS.set(proxy, proxy)

      return proxy
    }

    // Always return the source code on the current target, not any of its parents.
    // if (typeof this._target === 'function' && prop === 'toString' && receiver === this._proxy) {
    // return this._target.toString.bind(this._target)
    // }

    if (typeof val === 'object') {
    // If we are getting an object from within the membrane, return it directly
      if (this._inside()) return val

      // Same for null
      if (val === null) return val

      // TODO: Borrow
      return val
    }

    throw new Error('Unknown value: ' + val)
  }

  // --------------------------------------------------------------------------

  _checkGettable (prop, val) {
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
        const Unbound = require('../util/unbound')

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

  // --------------------------------------------------------------------------
  // getOwnPropertyDescriptor
  // --------------------------------------------------------------------------

  getOwnPropertyDescriptor (target, prop) {
    this._checkNotErrored()

    // Prototypes must always be retrieved on the original target
    if (typeof this._target === 'function' && prop === 'prototype') {
      return Reflect.getOwnPropertyDescriptor(target, prop)
    }

    if (!this._privateAccess() && typeof prop === 'string' && prop.startsWith('_')) {
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

    if (!this._privateAccess() && typeof prop === 'string' && prop.startsWith('_')) {
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

    // Stop proxy parent classes from intercepting sets on children. It doesn't make sense!
    if (typeof this._target === 'function') {
      const proto = Object.getPrototypeOf(this._target)
      try {
        Object.setPrototypeOf(this._target, Object.getPrototypeOf(Object))
        return this._setInternal(target, prop, value, receiver)
      } finally {
        Object.setPrototypeOf(this._target, proto)
      }
    }

    return this._setInternal(target, prop, value, receiver)
  }

  // --------------------------------------------------------------------------

  _setInternal (target, prop, value, receiver) {
    // Check that the property is settable
    this._checkSettable(prop, value)

    // All sets become spends, even if the value doesn't change
    // The user likely intended this value to change, and it saves us a deep traverse later.
    if (STACK.length) RECORD._spend(this._proxy)

    this._target[prop] = value

    return true
  }

  // --------------------------------------------------------------------------

  _checkSettable (prop, value) {
    if (ADMIN) return true

    const Code = require('./code')
    const Jig = require('./jig')

    _assert(this._inside(), 'Only the jig may set properties')
    _assert(prop !== 'origin', 'Must not set origin')
    _assert(prop !== 'location', 'Must not set location')
    _assert(prop !== 'nonce', 'Must not set nonce')
    _assert(typeof prop === 'string', 'Must only set string keys')

    if (this._proxy instanceof Code) {
      const reserved = Object.getOwnPropertyNames(Code.prototype)
      _assert(!reserved.includes(prop), `Must not set a reserved property: ${prop}`)
    }

    if (this._proxy instanceof Jig) {
      const reserved = Object.getOwnPropertyNames(Jig.prototype)
      _assert(!reserved.includes(prop), `Must not set a reserved property: ${prop}`)
    }

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
    _assert(!PROXY_OWNERS.has(value) || PROXY_OWNERS.get(value) === this._proxy,
      'Cannot set properties belonging to another jig')
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
