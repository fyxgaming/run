/**
 * membrane.js
 *
 * A flexible proxy handler for jigs, code, berries, and their owned inner objects.
 */

const { _admin, _sudo } = require('../util/admin')
const { _assert, _checkState, _hasOwnProperty, _extendsFrom } = require('../util/misc')
const { _location, _owner, _satoshis, _BINDINGS } = require('../util/bindings')
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
  // _configure
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
  // Handlers
  // --------------------------------------------------------------------------

  _apply (target, thisArg, args) {
    if (_admin()) return Reflect.apply(target, thisArg, args)
    this._throwIfJigErrors()

    return Reflect.apply(target, thisArg, args)
  }

  // --------------------------------------------------------------------------

  _construct (target, args, newTarget) {
    if (_admin()) return Reflect.construct(target, args, newTarget)
    this._throwIfJigErrors()

    return Reflect.construct(target, args, newTarget)
  }

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

  _deleteProperty (target, prop) {
    if (_admin()) return Reflect.deleteProperty(target, prop)
    this._throwIfJigErrors()

    // Code methods are permanent by design
    if (this._isCodeMethod(prop)) throw new Error(`Cannot delete ${prop}`)

    // Bindings cannot be deleted by design
    if (this._bindings && _BINDINGS.includes(prop)) {
      throw new Error(`Cannot delete binding ${prop}`)
    }

    // Private properties can only be deleted if we have access
    if (prop.startsWith('_') && !this._hasPrivateAccess()) {
      throw new Error(`Cannot delete private property ${prop}`)
    }

    // Enforce immutability
    if (this._immutable) throw new Error('delete disabled')

    return Reflect.deleteProperty(target, prop)
  }

  // --------------------------------------------------------------------------

  _get (target, prop, receiver) {
    if (_admin()) return Reflect.get(target, prop, receiver)
    this._throwIfJigErrors()

    // Code methods are specially handled
    if (this._isCodeMethod(prop)) return CODE_METHODS[prop]

    // Bindings are not always readable
    this._checkCanGetBinding(target, prop)

    // Check if we can access if it is a private property
    if (prop.startsWith('_') && !this._hasPrivateAccess()) {
      throw new Error(`Cannot access private property ${prop}`)
    }

    // Read the value
    let value = Reflect.get(target, prop, receiver)

    // If this is an unbound binding, return its actual inner value
    const Unbound = require('../util/unbound')
    const isUnboundBinding = _BINDINGS.includes(prop) && value instanceof Unbound
    if (isUnboundBinding) value = value._value

    return value
  }

  // --------------------------------------------------------------------------

  _getOwnPropertyDescriptor (target, prop) {
    if (_admin()) return Reflect.getOwnPropertyDescriptor(target, prop)
    this._throwIfJigErrors()

    // Code methods are not owned properties and are not overrideable
    if (this._isCodeMethod(prop)) return undefined

    // Bindings are not always readable
    this._checkCanGetBinding(target, prop)

    // Check if we can access if it is a private property
    if (prop.startsWith('_') && !this._hasPrivateAccess()) {
      throw new Error(`Cannot access private property ${prop}`)
    }

    // Read the descriptor
    const desc = Reflect.getOwnPropertyDescriptor(target, prop)

    // If this is an unbound binding, return its actual inner value
    const Unbound = require('../util/unbound')
    if (desc.value instanceof Unbound) desc.value = desc.value._value

    return desc
  }

  // --------------------------------------------------------------------------

  _getPrototypeOf (target) {
    if (_admin()) return Reflect.getPrototypeOf(target)
    this._throwIfJigErrors()

    return Reflect.getPrototypeOf(target)
  }

  // --------------------------------------------------------------------------

  _has (target, prop) {
    if (_admin()) return Reflect.has(target, prop)
    this._throwIfJigErrors()

    // Code methods are part of the object, but not owned properties
    if (this._isCodeMethod(prop)) return true

    // Check if we can access private properties
    if (prop.startsWith('_') && !this._hasPrivateAccess()) {
      throw new Error(`Cannot access private property ${prop}`)
    }

    return Reflect.has(target, prop)
  }

  // --------------------------------------------------------------------------

  _isExtensible (target) {
    if (_admin()) return Reflect.isExtensible(target)
    this._throwIfJigErrors()

    // Membrane targets are marked extensible by design. Immutability, if enabled, is enforced
    // in the membrane, not JavaScript, because non-extensibility can make JavaScript annoying.
    return true
  }

  // --------------------------------------------------------------------------

  _ownKeys (target) {
    if (_admin()) return Reflect.ownKeys(target)
    this._throwIfJigErrors()

    let keys = Reflect.ownKeys(target)

    // Filter out private keys if we are not able to view them
    if (!this._hasPrivateAccess()) {
      keys = keys.filter(key => key.startsWith('_'))
    }

    return keys
  }

  // --------------------------------------------------------------------------

  _preventExtensions (target) {
    if (_admin()) return Reflect.preventExtensions(target)
    this._throwIfJigErrors()

    // This membrane does not support freezing the underlying object
    throw new Error('preventExtensions disabled')
  }

  // --------------------------------------------------------------------------

  _set (target, prop, value, receiver) {
    if (_admin()) return Reflect.set(target, prop, value, receiver)
    this._throwIfJigErrors()

    // Code methods are permanent
    if (this._isCodeMethod(prop)) throw new Error(`Cannot set ${prop}`)

    // Only some bindings may be set by jig code
    this._checkCanSetBinding(target, prop, value)

    // Check if we can set a private property
    if (prop.startsWith('_') && !this._hasPrivateAccess()) {
      throw new Error(`Cannot set private property ${prop}`)
    }

    // When bindings are set, they are unbound until the record is committed
    if (this._bindings && _BINDINGS.includes(prop)) {
      const Unbound = require('../util/unbound')
      _assert(!(value instanceof Unbound))
      value = new Unbound(value)
    }

    // Enforce immutability
    if (this._immutable) throw new Error('set disabled')

    // Sudo required because Reflect.set calls defineProperty which is disabled
    return _sudo(() => Reflect.set(target, prop, value, receiver))
  }

  // --------------------------------------------------------------------------

  _setPrototypeOf (target, prototype) {
    if (_admin()) return Reflect.setPrototypeOf(target, prototype)
    this._throwIfJigErrors()

    // Changing prototypes is something only Run can do by design
    throw new Error('setPrototypeOf disabled')
  }

  // --------------------------------------------------------------------------

  _intrinsicGetMethod () {
    if (_admin()) return
    this._throwIfJigErrors()
  }

  // --------------------------------------------------------------------------

  _intrinsicOut (value) {
    if (_admin()) return value
    this._throwIfJigErrors()

    return value
  }

  // --------------------------------------------------------------------------

  _intrinsicIn (value) {
    if (_admin()) return value
    this._throwIfJigErrors()

    return value
  }

  // --------------------------------------------------------------------------

  _intrinsicRead () {
    if (_admin()) return
    this._throwIfJigErrors()
  }

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
  // _checkCanGetBinding
  // --------------------------------------------------------------------------

  _checkCanGetBinding (target, prop) {
    // Inner objects don't have bindings. Berry locations aren't mutable.
    if (!this._bindings) return

    const val = target[prop]

    try {
      // Check location, origin, or nonce. These are assigned by Run.
      if (prop === 'location' || prop === 'origin' || prop === 'nonce') {
        // Treat nonce the same as location for determining readability
        const loc = _location(prop === 'nonce' ? target.location : val)

        _checkState(!loc.undeployed, 'Jig undeployed\n\nHint: Sync the jig')
        _checkState(!loc.error, `A previous error occurred\n\n${loc.error}`)

        // Native code bindings can always be read
        if (loc.nativeid) return

        // If no txid, then the location is not determined. The jig in a pending commit.
        // Jig code won't encounter this but it protects users from getting temp locs.
        const undeterminedHint = 'Hint: Sync the jig to assign it in a transaction'
        const undeterminedError = `${prop} is undetermined\n\n${undeterminedHint}`
        _checkState(loc.txid, undeterminedError)
      }

      // Check owner or satoshis. These are assigned by users and by Run.
      if (prop === 'owner' || prop === 'satoshis') {
        const Unbound = require('../util/unbound')

        // Allow reads even if the value has been changed and is unbound. This is OK
        // because we do not allow it to be changed again, nor deleted, so it will be
        // assigned this value at the end of the transaction and so code can rely on it.
        const undetermined = val instanceof Unbound && typeof val._value === 'undefined'
        const undeterminedHint = 'Hint: Sync the jig to assign it in a transaction'
        const undeterminedError = `${prop} is undetermined\n\n${undeterminedHint}`
        _checkState(!undetermined, undeterminedError)
      }
    } catch (e) {
      throw new Error(`Cannot read ${prop}\n\n${e.message}`)
    }
  }

  // --------------------------------------------------------------------------
  // _checkCanSetBinding
  // --------------------------------------------------------------------------

  _checkCanSetBinding (target, prop, value) {
    // Inner objects can have properties with binding names set
    if (!this._bindings) return

    // Only Run can set the origin, location and nonce.
    _checkState(prop !== 'origin', 'Must not set origin')
    _checkState(prop !== 'location', 'Must not set location')
    _checkState(prop !== 'nonce', 'Must not set nonce')

    // Setting owner or satoshis requires the owner to be bound because the owner must be able to
    // to approve of the change. We don't allow changing these bound properties twice in a tx.
    const Unbound = require('../util/unbound')
    const unboundHint = 'Hint: Sync the jig to bind it in a transaction'
    const unboundError = `Cannot set binding ${prop} again\n\n${unboundHint}`
    const isUnbound = _BINDINGS.includes(prop) && target[prop] instanceof Unbound && target[prop]._value
    _checkState(!isUnbound, unboundError)

    // Check the value being set is valid. Users cannot set owners to null, only Run.
    const allowNull = false
    if (prop === 'owner') _owner(value, allowNull)
    if (prop === 'satoshis') _satoshis(value)
  }

  // --------------------------------------------------------------------------
  // _hasPrivateAccess
  // --------------------------------------------------------------------------

  _hasPrivateAccess (target) {
    const Code = require('./code')
    const Jig = require('./jig')
    const Record = require('./record')
    const stack = Record._CURRENT_RECORD._stack

    // Outside of a jig, private properties are inaccessible
    if (!stack.length) return false

    // Get the top of the stack
    const accessor = stack[stack.length - 1]._jig

    // For jig code only the current class may access its private properties.
    // Arbitrary code does not use this membrane.
    if (this._jig instanceof Code) {
      return accessor === this._jig
    }

    // For jig instances, jigs of the same jig class may access its private properties. Also,
    // the jig class may access private properties of its instances.
    if (this._jig instanceof Jig) {
      return accessor.constructor === this._jig.constructor ||
        accessor === this._jig.constructor
    }

    // Other kinds of proxies should not be here
    _assert(false)
  }

  // --------------------------------------------------------------------------
  // Misc Helpers
  // --------------------------------------------------------------------------

  _isCodeMethod (prop) { return this._codeMethods && CODE_METHOD_NAMES.includes(prop) }
}

// ------------------------------------------------------------------------------------------------

module.exports = Membrane
