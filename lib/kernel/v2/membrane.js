/**
 * jig.js
 *
 * Proxy handler common to all code and object jigs
 */

const { _sourceCode } = require('../../util/misc')
const { _deepClone } = require('../../util/deep')
const { InstallFailedError } = require('../../util/errors')
const Sandbox = require('../../util/sandbox')
const { Jig } = require('../jig')
const { Berry } = require('../berry')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const STACK = [] // Array<Jig|Code>

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

    if (this._target === 'function' && Object.getOwnPropertyNames(this._target).includes('toString')) {
      throw new InstallFailedError(this._target, 'toString() must not be defined')
    }
  }

  /**
   * Trap for getting properties
   */
  get (target, prop, receiver) {
    const val = this._target[prop]

    // Return function prototypes directly. Never return a proxy. Run already guarantees they
    // are immutable to users. We have to return the prototype before any instanceof checks.
    if (typeof this._target === 'function' && prop === 'prototype') {
      return val
    }

    // Return blockchain objects directly because they are already proxied and safe.
    const Code = require('./code')
    if (val instanceof Code || val instanceof Jig || val instanceof Berry) {
      return val
    }

    // Always return the source code on the current target, not any of its parents.
    if (typeof this._target === 'function' && prop === 'toString' && receiver === this._proxy) {
      return () => this._target.toString()
    }

    // If we are getting a value from within the membrane, return it directly
    if (this._inside()) return val

    // When calling from OUTSIDE of the membrane, clone any objects and wrap any functions
    if (typeof val === 'function') {
    // Wrap
      return val
    }

    if (typeof val === 'object' && val) {
      return new Sandbox._intrinsics.Proxy(val, new Borrow())
    }

    // If we are getting a property from outside the membrane, make a clone of it

    return val
  }

  _inside () { return STACK.length && STACK[STACK.length - 1] === this._proxy }
}

// ------------------------------------------------------------------------------------------------
// Borrow
// ------------------------------------------------------------------------------------------------

class Borrow {
  constructor() {
    console.log('Borrow')
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Membrane
