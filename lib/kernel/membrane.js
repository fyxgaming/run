/**
 * membrane.js
 *
 * A flexible proxy handler for jigs, code, berries, and their owned inner objects.
 */

const { _admin, _sudo } = require('../util/admin')
const { _assert, _checkState, _hasOwnProperty, _extendsFrom } = require('../util/misc')
const { _location, _owner, _satoshis } = require('../util/bindings')
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

  constructor (target, parentJig = null) {
    // Jig that owns whatever this proxy's target, which may be the jig itself
    this._jig = null
    // Whether this object should have Code methods on it
    this._codeMethods = false
    // Whether this jig should record reads and updates
    this._record = false
    // Whether this jig cannot be changed
    this._immutable = false
    // Whether this target has bindings that need protection
    this._bindings = false
    // Whether this is static code or object (not supported)
    this._static = false

    // Save the original target
    this._target = target
    // Create the new proxy membrane
    this._proxy = new Proxy2(target, this)
    // Save the parent jig
    this._parentJig = parentJig

    // Setup the proxy for the target
    Membrane._configure(this._proxy)

    return this._proxy
  }

  // --------------------------------------------------------------------------
  // _reconfigure
  // --------------------------------------------------------------------------

  static _configure (jig) {
    const Jig = require('./jig')
    const Berry = require('./berry')

    // Get the membrane
    const m = Proxy2._getHandler(jig)
    _assert(m)

    // Jig code: normal, static, and native
    if (typeof m._target === 'function' && !m._parentJig) {
      m._jig = m._proxy
      m._static = _extendsFrom(m._target, Jig)
      m._native = m._target.location && m._target.location.startsWith('native://')
      m._codeMethods = true
      m._bindings = true
      m._record = true
      return
    }

    // Jig instances
    if (typeof m._target === 'object' && !m._parentJig && _extendsFrom(m._target.constructor, Jig)) {
      m._jig = m._proxy
      m._bindings = true
      m._record = true
      return
    }

    // Berry instances
    if (typeof m._target === 'object' && !m._parentJig && _extendsFrom(m._target.constructor, Berry)) {
      m._jig = m._proxy
      m._immutable = true
      m._record = true
      return
    }

    // Inner objects
    if (typeof m._target === 'object' && m._parentJig) {
      m._jig = m._parentJig
      m._record = true
      return
    }

    // Inner methods
    if (typeof m._target === 'function' && m._parentJig) {
      m._jig = m._parentJig
      m._record = true
      return
    }

    throw new Error('Unsupported membrane target')
  }

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

    // Bindings are not always readable
    this._checkCanReadBinding(target, prop)

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

    // Bindings are not always readable
    this._checkCanReadBinding(target, prop)

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

    const jigTarget = Proxy2._getTarget(this._jig) || this._jig

    // If location is not defined, then we are setting up the jig and not in an error state.
    // For example, toString() should still be allowed to be called when setting up.
    if (!_hasOwnProperty(jigTarget, 'location')) return

    // Undeployed jigs can still be used because they will be deployed after the action completes.
    const { error, undeployed } = _location(jigTarget.location)
    if (error && !undeployed) throw new Error(error)
  }

  // --------------------------------------------------------------------------
  // _throwIfJigErrors
  // --------------------------------------------------------------------------

  _checkCanReadBinding (target, prop) {
    if (!this._bindings) return

    const val = target[prop]

    try {
      if (prop === 'location' || prop === 'origin' || prop === 'nonce') {
        // Treat nonce the same as location for determining readability
        const loc = _location(prop === 'nonce' ? target.location : val)

        _checkState(!loc.undeployed, 'Jig undeployed\n\nHint: Sync the jig')
        _checkState(!loc.error, `A previous error occurred\n\n${loc.error}`)

        // Native code bindings can always be read
        if (loc.nativeid) return

        const hint = `Hint: Sync the jig first to assign ${prop} in a transaction`
        _checkState(loc.txid && ('vout' in loc || 'vdel' in loc), `Value is undetermined\n\n${hint}`)
      }

      if (prop === 'owner' || prop === 'satoshis') {
        const Unbound = require('../util/unbound')

        const hint = `Hint: Sync the jig first to bind ${prop} in a transaction`
        _checkState(!(val instanceof Unbound), `Value is unbound\n\n${hint}`)

        const allowNull = true
        if (prop === 'owner') _owner(val, allowNull)
        if (prop === 'satoshis') _satoshis(val)
      }
    } catch (e) {
      throw new Error(`Cannot read ${prop}\n\n${e.message}`)
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  _isCodeMethod (prop) { return this._codeMethods && CODE_METHOD_NAMES.includes(prop) }
}

// ------------------------------------------------------------------------------------------------

module.exports = Membrane
