/**
 * jig.js
 *
 * Proxy handler common to all code and object jigs
 */

const Bindings = require('./bindings')
const Sandbox = require('./sandbox')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const STACK = [] // Array<Jig|Code>

let ADMIN = false // Whether the normal jig safety checks for users are bypassed

// When syncing, a jig cannot be used except by the sync user
const SYNCING = new Set()
let SYNC_USER = 0

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
    authorizeDuringSync(this._proxy)

    const val = this._target[prop]

    // Return function prototypes directly. Never return a proxy. Run already guarantees they
    // are immutable to users. We have to return the prototype before any instanceof checks.
    if (typeof this._target === 'function' && prop === 'prototype') {
      return val
    }

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
    if (typeof this._target === 'function' && prop === 'toString' && receiver === this._proxy) {
      return this._target.toString.bind(this._target)
    }

    // Detect errors when reading bindings in non-admin mode
    authorizeRead(prop, val)

    // If we are getting a value from within the membrane, return it directly
    if (this._inside()) return val

    // When calling from OUTSIDE of the membrane, clone any objects and wrap any functions
    if (typeof val === 'function') {
    // Wrap
      return val

      // If owner is a new owner, and calling from the outside, can't call anymore.
    }

    if (typeof val === 'object' && val) {
      return new Sandbox._intrinsics.Proxy(val, new Borrow(prop))
    }

    // If we are getting a property from outside the membrane, make a clone of it

    return val
  }

  set (target, prop, value, receiver) {
    authorizeDuringSync(this._proxy)

    // console.log('set', prop, value)
    // Proxied parent classes really don't like you setting properties on their children.
    // They try to intercept them! It doesn't make sense. We can stop this.
    if (typeof this._target === 'function') {
      const prevPrototype = Object.getPrototypeOf(this._target)
      try {
        Object.setPrototypeOf(this._target, Object.getPrototypeOf(Object))
        this._target[prop] = value
      } finally {
        Object.setPrototypeOf(this._target, prevPrototype)
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

  getPrototyoeOf (target) {
    authorizeDuringSync(this._proxy)

    return Object.getPrototypeOf(this._target)
  }

  ownKeys (target) {
    authorizeDuringSync(this._proxy)

    return Reflect.ownKeys(this._target)
  }

  getOwnPropertyDescriptor (target, prop) {
    authorizeDuringSync(this._proxy)

    return Reflect.getOwnPropertyDescriptor(this._target, prop)
  }

  has (target, prop) {
    authorizeDuringSync(this._proxy)

    return prop in this._target
  }

  isExtensible (target) {
    authorizeDuringSync(this._proxy)

    return Reflect.isExtensible(this._target)
  }

  defineProperty (...args) {
    authorizeDuringSync(this._proxy)

    console.log('DP')
    throw new Error()
  }

  _inside () { return STACK.length && STACK[STACK.length - 1] === this._proxy }

  _bind (prop, value, network) { this._target[prop] = value }

  construct (target, args, newTarget) {
    authorizeDuringSync(this._proxy)

    // console.log('construct')
    return Reflect.construct(target, args, newTarget)
    // const obj = {}
    // Object.setPrototypeOf(obj, this._target.prototype)
    // return obj
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

function authorizeRead (prop, val) {
  if (ADMIN) return

  if (prop === 'location' || prop === 'origin') {
    try {
      const { error } = Bindings._location(val)
      if (error) throw new Error(error)

      Bindings._location(val, Bindings._USER | Bindings._JIG)
    } catch (e) {
      throw new Error(`Cannot read ${prop}: ${e.message}`)
    }
  }

  if (prop === 'owner' || prop === 'satoshis') {
    try {
      const Unbound = require('./unbound')
      if (val instanceof Unbound) {
        const hint = `Hint: Sync the jig first to bind the ${prop} to a transaction`
        throw new Error(`Not bound\n\n${hint}`)
      }

      if (prop === 'owner') Bindings._owner(val)
      if (prop === 'satoshis') Bindings._satoshis(val)
    } catch (e) {
      throw new Error(`Cannot read ${prop}: ${e.message}`)
    }
  }
}

// ------------------------------------------------------------------------------------------------

function enterSync (jig) {
  console.log('ENTER')
  const entered = !SYNCING.has(jig)
  SYNCING.add(jig)
  return entered
}

// ------------------------------------------------------------------------------------------------

function leaveSync (jig) {
  console.log('LEAVE')
  SYNCING.delete(jig)
}

// ------------------------------------------------------------------------------------------------

function runAsSyncUser (callback) {
  try {
    SYNC_USER++
    callback()
  } finally {
    SYNC_USER--
  }
}

// ------------------------------------------------------------------------------------------------

function authorizeDuringSync (jig) {
  if (ADMIN) return
  if (!SYNCING.has(jig) || SYNC_USER) return
  throw new Error('Cannot use jig during sync')
}

// ------------------------------------------------------------------------------------------------

Membrane._sudo = sudo
Membrane._enterSync = enterSync
Membrane._leaveSync = leaveSync
Membrane._runAsSyncUser = runAsSyncUser

module.exports = Membrane
