/**
 * membrane.js
 *
 * A flexible proxy handler for jigs, code, berries, and their owned inner objects.
 */

const { _admin, _sudo } = require('../util/admin')
const { _hasOwnProperty } = require('../util/misc')
const { _location } = require('../util/bindings')
const Sandbox = require('../util/sandbox')
const Proxy2 = require('../util/proxy2')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// const RECORD = () => require('../kernel/record')._CURRENT_RECORD

// ------------------------------------------------------------------------------------------------
// Code Methods
//
// Methods that may be attached to objects via a membrane. This is used for all code jigs,
// including normal, static, and native ones. The method come from Code.prototype but are wrapped
// here for use in sandboxed code. They are immutable by design.
// ------------------------------------------------------------------------------------------------

function makeCodeMethod (name) {
  const Code = require('./code')
  const script = `function ${name} (...args) { return Code.prototype.${name}.apply(this, args) }`
  const method = Sandbox._evaluate(script, { Code })[0]
  return Object.freeze(method)
}

const CODE_METHODS = {
  toString: makeCodeMethod('toString'),
  sync: makeCodeMethod('sync'),
  upgrade: makeCodeMethod('upgrade'),
  destroy: makeCodeMethod('destroy'),
  auth: makeCodeMethod('auth')
}

const CODE_METHOD_NAMES = Object.keys(CODE_METHODS)

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

class Membrane {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  constructor (target, kind) {
    // Jig that owns whatever this proxy's target, which may be the jig itself
    this._jig = null
    // Whether this object should have Code methods on it
    this._codeMethods = false
    // Whether this jig should record reads and updates
    this._recording = false
    // Whether this jig cannot be changed
    this._immutable = false

    // Create the new proxy membrane
    const proxy = new Proxy2(target, this)

    // Configure for the kind
    if (kind === 'code' || kind === 'jig' || kind === 'berry') this._jig = proxy
    if (kind === 'code' || kind === 'jig' || kind === 'berry') this._recording = true
    if (kind === 'code') this._codeMethods = true

    return proxy
  }

  // --------------------------------------------------------------------------
  // _makeImmutable
  // --------------------------------------------------------------------------

  static _makeImmutable (C) { Proxy2._getHandler(C)._immutable = true }

  // --------------------------------------------------------------------------
  // _apply
  // --------------------------------------------------------------------------

  _apply (target, thisArg, args) {
    if (_admin()) return Reflect.apply(target, thisArg, args)
    this._throwIfJigErrors()

    return Reflect.apply(target, thisArg, args)
  }

  // --------------------------------------------------------------------------
  // _construct
  // --------------------------------------------------------------------------

  _construct (target, args, newTarget) {
    if (_admin()) return Reflect.construct(target, args, newTarget)
    this._throwIfJigErrors()

    return Reflect.construct(target, args, newTarget)
  }

  // --------------------------------------------------------------------------
  // _defineProperty
  // --------------------------------------------------------------------------

  _defineProperty (target, prop, desc) {
    if (_admin()) return Reflect.defineProperty(target, prop, desc)
    this._throwIfJigErrors()

    // Disable defineProperty because we don't support everything it allows,
    // including getters, setters, or some of the special descriptors like
    // non-configurability and non-enumerability.
    throw new Error('defineProperty disabled')
  }

  // --------------------------------------------------------------------------
  // _deleteProperty
  // --------------------------------------------------------------------------

  _deleteProperty (target, prop) {
    if (_admin()) return Reflect.deleteProperty(target, prop)
    this._throwIfJigErrors()

    // Code methods are permanent by design
    if (this._isCodeMethod(prop)) throw new Error(`Cannot delete ${prop}`)

    // Enforce immutability
    if (this._immutable) throw new Error('delete disabled')

    return Reflect.deleteProperty(target, prop)
  }

  // --------------------------------------------------------------------------
  // _get
  // --------------------------------------------------------------------------

  _get (target, prop, receiver) {
    if (_admin()) return Reflect.get(target, prop, receiver)
    this._throwIfJigErrors()

    // Code methods are specially handled
    if (this._isCodeMethod(prop)) return CODE_METHODS[prop]

    return Reflect.get(target, prop, receiver)
  }

  // --------------------------------------------------------------------------
  // _getOwnPropertyDescriptor
  // --------------------------------------------------------------------------

  _getOwnPropertyDescriptor (target, prop) {
    if (_admin()) return Reflect.getOwnPropertyDescriptor(target, prop)
    this._throwIfJigErrors()

    // Code methods are not owned properties and are not overrideable
    if (this._isCodeMethod(prop)) return undefined

    return Reflect.getOwnPropertyDescriptor(target, prop)
  }

  // --------------------------------------------------------------------------
  // _getPrototypeOf
  // --------------------------------------------------------------------------

  _getPrototypeOf (target) {
    if (_admin()) return Reflect.getPrototypeOf(target)
    this._throwIfJigErrors()

    return Reflect.getPrototypeOf(target)
  }

  // --------------------------------------------------------------------------
  // _has
  // --------------------------------------------------------------------------

  _has (target, prop) {
    if (_admin()) return Reflect.has(target, prop)
    this._throwIfJigErrors()

    // Code methods are part of the object, but not owned properties
    if (this._isCodeMethod(prop)) return true

    return Reflect.has(target, prop)
  }

  // --------------------------------------------------------------------------
  // _isExtensible
  // --------------------------------------------------------------------------

  _isExtensible (target) {
    if (_admin()) return Reflect.isExtensible(target)
    this._throwIfJigErrors()

    // Membrane targets are marked extensible by design. Immutability, if enabled, is enforced
    // in the membrane, not JavaScript, because non-extensibility can make JavaScript annoying.
    return true
  }

  // --------------------------------------------------------------------------
  // _ownKeys
  // --------------------------------------------------------------------------

  _ownKeys (target) {
    if (_admin()) return Reflect.ownKeys(target)
    this._throwIfJigErrors()

    return Reflect.ownKeys(target)
  }

  // --------------------------------------------------------------------------
  // _preventExtensions
  // --------------------------------------------------------------------------

  _preventExtensions (target) {
    if (_admin()) return Reflect.preventExtensions(target)
    this._throwIfJigErrors()

    // This membrane does not support freezing the underlying object
    throw new Error('preventExtensions disabled')
  }

  // --------------------------------------------------------------------------
  // _set
  // --------------------------------------------------------------------------

  _set (target, prop, value, receiver) {
    if (_admin()) return Reflect.set(target, prop, value, receiver)
    this._throwIfJigErrors()

    // Code methods are permanent
    if (this._isCodeMethod(prop)) throw new Error(`Cannot set ${prop}`)

    // Enforce immutability
    if (this._immutable) throw new Error('set disabled')

    // Sudo required because Reflect.set calls defineProperty which is disabled
    return _sudo(() => Reflect.set(target, prop, value, receiver))
  }

  // --------------------------------------------------------------------------
  // _setPrototypeOf
  // --------------------------------------------------------------------------

  _setPrototypeOf (target, prototype) {
    if (_admin()) return Reflect.setPrototypeOf(target, prototype)
    this._throwIfJigErrors()

    // Changing prototypes is something only Run can do by design
    throw new Error('setPrototypeOf disabled')
  }

  // --------------------------------------------------------------------------
  // _intrinsicGetMethod
  // --------------------------------------------------------------------------

  _intrinsicGetMethod () {
    if (_admin()) return
    this._throwIfJigErrors()
  }

  // --------------------------------------------------------------------------
  // _intrinsicOut
  // --------------------------------------------------------------------------

  _intrinsicOut (value) {
    if (_admin()) return value
    this._throwIfJigErrors()

    return value
  }

  // --------------------------------------------------------------------------
  // _intrinsicIn
  // --------------------------------------------------------------------------

  _intrinsicIn (value) {
    if (_admin()) return value
    this._throwIfJigErrors()

    return value
  }

  // --------------------------------------------------------------------------
  // _intrinsicRead
  // --------------------------------------------------------------------------

  _intrinsicRead () {
    if (_admin()) return
    this._throwIfJigErrors()
  }

  // --------------------------------------------------------------------------
  // _intrinsicUpdate
  // --------------------------------------------------------------------------

  _intrinsicUpdate () {
    if (_admin()) return
    this._throwIfJigErrors()
    if (this._immutable) throw new Error('Immutable')
  }

  // --------------------------------------------------------------------------
  // _throwIfJigErrors
  // --------------------------------------------------------------------------

  // Every jig trap checks if the jig in an error state from a prior action. A jig will go into
  // an error state if the user fails to sync and there was an error while publishing.
  _throwIfJigErrors () {
    if (!this._jig) return
    const jigTarget = Proxy2._getTarget(this._jig)

    // If location is not defined, then we are setting up the jig and not in an error state.
    // For example, toString() should still be allowed to be called when setting up.
    if (!_hasOwnProperty(jigTarget, 'location')) return

    // Undeployed jigs can still be used because they will be deployed after the action completes.
    const { error, undeployed } = _location(jigTarget.location)
    if (error && !undeployed) throw new Error(error)
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  _isCodeMethod (prop) { return this._codeMethods && CODE_METHOD_NAMES.includes(prop) }
  _isTopLevel (target) { return Proxy2._getTarget(this._jig) === target }
}

// ------------------------------------------------------------------------------------------------

module.exports = Membrane
