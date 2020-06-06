/**
 * jig.js
 *
 * Proxy handler common to all code and object jigs
 */

const { _sourceCode } = require('../../util/misc')
const { _deepClone } = require('../../util/deep')
const Sandbox = require('../../util/sandbox')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const STACK = [] // Array<Jig|Code>

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

class Membrane {
  _init (target, proxy) {
    this._target = target
    this._proxy = proxy
  }

  /**
   * Trap for getting properties
   */
  get (target, prop, receiver) {
    // The toString() on the proxy is not the same as the original.
    // Check _proxy because otherwise we'd override child toStrings()
    if (prop === 'toString' && receiver === this._proxy) {
      return () => _sourceCode(this._target)
    }

    // If we are getting a value from within the membrane, return it directly
    if (this._inside()) return this._target[prop]

    // When calling from OUTSIDE of the membrane, clone any objects and wrap any functions
    if (typeof this._target[prop] === 'function') {
    // Wrap
      return this._target[prop]
    }

    // console.log('get', prop)

    // If we are getting a property from outside the membrane, make a clone of it

    // If we are getting a function prototype ... return the actual thing?
    if (typeof this._target === 'function' && prop === 'prototype') {
      return this._target.prototype
    }

    try {
      const intrinsics = STACK.length ? Sandbox._intrinsics : Sandbox._hostIntrinsics
      return _deepClone(this._target[prop], intrinsics)
    } catch (e) {
      // console.log(this._interior[prop])
      console.log(prop, this._target[prop], e)
      throw new Error('hello')
    }

    // x.y === x.y
    // Clone once, not every time its accessed
  }

  _inside () { return STACK.length && STACK[STACK.length - 1] === this._proxy }
}

// ------------------------------------------------------------------------------------------------

module.exports = Membrane
