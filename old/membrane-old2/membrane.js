/**
 * jig.js
 *
 * Proxy handler common to all code and object jigs
 */

const Sandbox = require('../../lib/util/sandbox')
const { _checkState } = require('../../lib/util/misc')
const SI = Sandbox._intrinsics

const { _deepClone } = require('../../lib/util/deep')

// TODO:
// - native code
// - code functions
// Membrane ... native code cannot change
// Membrane ... native code does not have code methods
// No, code methods are not callable
// Reserved properties

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
// const ADMIN = false // Whether the normal jig safety checks for users are bypassed

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

// const PROXY_OWNERS = new WeakMap() // Proxy -> Jig | Code

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
    const Jig = require('../../lib/kernel/jig')
    const Code = require('../../lib/kernel/code')
    const Action = require('../../lib/kernel/action')
    const { _recordMultiple, _record } = require('../../lib/kernel/commit')

    // Function.toString is special. It should be allowed to run on extended classes before they are code.
    if (typeof thisArg === 'function' && this._name === 'toString') {
      return Reflect.apply(target, thisArg, args)
    }

    // Check that the user isn't doing something they shouldn't
    _checkState(thisArg instanceof Jig || thisArg instanceof Code, `Jig methods must only be called on jigs: ${this._name}`)
    _checkState(thisArg[this._name] === this._proxy, `Jig methods must only be applied to their instances: ${this._name}`)

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
        const C = new Code(x)
        // TODO: Do in a multiple? Also what if in a method? Uh oh.
        // Note: This will be top-level! Check this.
        Code._editor(C)._deploy()
        return C
      }
    })

    // If inside, call directly
    if (STACK.length) return this._call(target, thisArg, clonedArgs)

    // Record the call as a top-level action
    return _recordMultiple(() => {
      let clonedArgs = null

      // Deploy jig classes and static code as params
      clonedArgs = _deepClone(args, SI, x => {
        if (typeof x === 'function' && !(x instanceof Code)) {
          const C = new Code(x)
          // TODO: Do in a multiple? Also what if in a method? Uh oh.
          // Note: This will be top-level! Check this.
          Code._editor(C)._deploy()
          return C
        }
      })

      // Call the method
      return _record(record => {
        // RECORD = record
        try {
          const ret = this._call(target, thisArg, clonedArgs)

          if (!STACK.length) Action._call(thisArg, this._name, clonedArgs)

          return ret
        } finally {
          // RECORD = null
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

  construct (target, args, newTarget) { throw new Error('construct disabled') }
  defineProperty (target, prop, desc) { throw new Error('defineProperty disabled') }
  deleteProperty (target, prop, receiver) { throw new Error('deleteProperty disabled') }
  preventExtensions (target) { throw new Error('preventExtensions disabled') }
  set (target, prop, value, receiver) { throw new Error('set disabled') }
  setPrototypeOf (target, prototype) { throw new Error('setPrototypeOf disabled') }
}

// ------------------------------------------------------------------------------------------------

module.exports = MethodHandler
