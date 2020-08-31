/**
 * membrane.js
 *
 * A flexible proxy handler for jigs, code, berries, and their owned inner objects.
 */

const { _admin, _sudo } = require('../util/admin')
const { _assert, _checkState, _text, _hasOwnProperty, _setOwnProperty, _isSerializable } = require('../util/misc')
const { _location, _owner, _satoshis, _BINDINGS } = require('../util/bindings')
const { _deepClone, _deepVisit } = require('../util/deep')
const Sandbox = require('../util/sandbox')
const SI = Sandbox._intrinsics
const Proxy2 = require('../util/proxy2')
const Rules = require('./rules')
const Universal = require('./universal')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const RECORD = () => require('../kernel/record')._CURRENT_RECORD

// Jigs whose membrane is created but is not yet returned in gets. Naked objects created in a
// method and then assigned to the jig are in this state. They will leave the PENDING_MEMBRANES
// set once the current method completes.
let PENDING_MEMBRANES = new Set()

// ------------------------------------------------------------------------------------------------
// Code Methods
// ------------------------------------------------------------------------------------------------

// Methods that may be attached to objects via a membrane. This is used for all code jigs,
// including normal, static, and native ones. The method come from Code.prototype but are wrapped
// here for use in sandboxed code. They are immutable by design.
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

  constructor (target, rules = new Rules()) {
    // See if we've already created a membrane around this target
    const prevProxy = Proxy2._getTarget(target) ? target : Proxy2._getProxy(target)
    if (prevProxy) return prevProxy

    // Store the rules for the membrane. We'll use them later.
    this._rules = rules

    // Create the new proxy with this instance as a membrane
    this._proxy = new Proxy2(target, this)

    // Determine the jig
    this._jig = this._rules._parentJig || this._proxy

    // Return the proxy, not the handler/membrane, to the user
    return this._proxy
  }

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  _apply (target, thisArg, args) {
    if (this._isAdmin()) return Reflect.apply(target, thisArg, args)

    return this._trap(() => {
      const errorMessage = `Cannot call ${target.name} on ${_text(thisArg)}`
      const allowed = !thisArg || (thisArg[target.name] === this._proxy && thisArg instanceof Universal)
      _checkState(allowed, errorMessage)

      // Calling a function requires a read of the code jig being called
      if (this._rules._recordReads) RECORD()._read(this._jig)

      // If not recording, then pass the method call through. This is used for static code.
      // Arguments will not be cloned. The call will not be recorded anywhere. It becomes a helper.
      if (!this._rules._recordCalls) return Reflect.apply(target, thisArg, args)

      // TODO: Clone the args
      const methodArgs = args

      // Placeholder return value
      let ret

      // Push a call action onto the stack
      const Action = require('./action')
      Action._call(thisArg, target.name, methodArgs, () => {
        // Call the method
        const savedPendingMembranes = PENDING_MEMBRANES
        try {
          PENDING_MEMBRANES = new Set()
          ret = Reflect.apply(target, thisArg, methodArgs)
        } finally {
          PENDING_MEMBRANES = savedPendingMembranes
        }
      })

      return ret
    })
  }

  // --------------------------------------------------------------------------

  _construct (target, args, newTarget) {
    if (this._isAdmin()) return Reflect.construct(target, args, newTarget)

    return this._trap(() => {
      // Constructing an instances requires a read of all code jigs being instantiated
      if (this._rules._recordReads) {
        const Universal = require('./universal')
        let T = this._jig
        while (T instanceof Universal) {
          RECORD()._read(T)
          T = Object.getPrototypeOf(T)
        }
      }

      // If not recording, then pass the construct through. This is used for static code.
      // Arguments will not be cloned. The call will not be recorded anywhere. It's a helper.
      return Reflect.construct(target, args, newTarget)
    })
  }

  // --------------------------------------------------------------------------

  _defineProperty (target, prop, desc) {
    if (this._isAdmin()) return Reflect.defineProperty(target, prop, desc)

    return this._trap(() => {
      // Defining a property requires an update to the jig
      if (this._rules._recordUpdates) RECORD()._update(this._jig)

      // Copy the old descriptor if it exists
      const oldDesc = Object.getOwnPropertyDescriptor(target, prop)
      desc = Object.assign({}, oldDesc, desc)

      // Only allow configurable, writable, enumerable value properties
      _checkState('value' in desc, 'Descriptor must have a value')
      _checkState(!('get' in desc), 'Getters are not supported')
      _checkState(!('set' in desc), 'Getters are not supported')
      _checkState(desc.configurable, 'Descriptor must be configurable')
      _checkState(desc.writable, 'Descriptor must be writable')
      _checkState(desc.enumerable, 'Descriptor must be enumerable')

      // Code methods are permanent
      if (this._isCodeMethod(prop)) throw new Error(`Cannot define ${prop}`)

      // Only some bindings may be set by jig code
      this._checkCanSetBinding(target, prop, desc.value)

      // Updates must be performed in one of the jig's methods
      this._checkIfBreakContract()

      // Ensure the the property can be stored in transactions and the state cache
      this._checkSerializable(prop, desc.value)

      // Check that the value is not owned by another jig
      this._checkOwnership(desc.value)

      // Check if we can set a private property
      if (!this._hasPrivateAccess(prop)) {
        throw new Error(`Cannot define private property ${prop}`)
      }

      // Clone the target if necessary
      target = this._copyOnWriteIfNecessary() || target

      // When bindings are set, they are unbound until the record is committed
      const Unbound = require('../util/unbound')
      if (this._isBinding(prop) && !(desc.value instanceof Unbound)) {
        desc.value = new Unbound(desc.value)
      }

      // Enforce immutability
      if (this._rules._immutable) throw new Error('defineProperty disabled')

      // Remove the membrane if there is one
      desc.value = Proxy2._getTarget(desc.value) || desc.value

      // Define the property
      return Reflect.defineProperty(target, prop, desc)
    })
  }

  // --------------------------------------------------------------------------

  _deleteProperty (target, prop) {
    if (this._isAdmin()) return Reflect.deleteProperty(target, prop)

    return this._trap(() => {
      // Deleting a property requires an update to the jig
      if (this._rules._recordUpdates) RECORD()._update(this._jig)

      // Code methods are permanent by design
      if (this._isCodeMethod(prop)) throw new Error(`Cannot delete ${prop}`)

      // Bindings cannot be deleted by design
      if (this._isBinding(prop)) throw new Error(`Cannot delete binding ${prop}`)

      // Updates must be performed in one of the jig's methods
      this._checkIfBreakContract()

      // Clone the target if necessary
      target = this._copyOnWriteIfNecessary() || target

      // Private properties can only be deleted if we have access
      if (!this._hasPrivateAccess(prop)) {
        throw new Error(`Cannot delete private property ${prop}`)
      }

      // Enforce immutability
      if (this._rules._immutable) throw new Error('delete disabled')

      return Reflect.deleteProperty(target, prop)
    })
  }

  // --------------------------------------------------------------------------

  _get (target, prop, receiver) {
    if (this._isAdmin()) return Reflect.get(target, prop, receiver)

    return this._trap(() => {
      // Code methods are specially handled. They are not reads since they don't change.
      if (this._isCodeMethod(prop)) return CODE_METHODS[prop]

      // Function prototypes and constructors must be returned directly. No wrapping.
      // Symbol properties too, because they aren't settable by the user.
      // They are also not reads because they are all permanant immutable properties.
      const isFunctionPrototype = typeof target === 'function' && prop === 'prototype'
      const isConstructor = prop === 'constructor'
      const isSymbolProperty = typeof prop === 'symbol'
      const isDirectReturn = isFunctionPrototype || isConstructor || isSymbolProperty
      if (isDirectReturn) return Reflect.get(target, prop, receiver)

      // Record this read
      if (this._rules._recordReads) RECORD()._read(this._jig)

      // Bindings are not always readable
      this._checkCanGetBinding(target, prop)

      // Check if we can access if it is a private property
      if (!this._hasPrivateAccess(prop)) {
        throw new Error(`Cannot access private property ${prop}`)
      }

      // Read the value
      let value = Reflect.get(target, prop, receiver)

      // Basic types are returned directly
      if (this._isBasicType(value)) return value

      // Jigs are returned directly
      if (value instanceof Universal) return value

      // If this is an unbound binding, return its actual inner value
      const Unbound = require('../util/unbound')
      const isUnboundBinding = this._isBinding(prop) && value instanceof Unbound
      if (isUnboundBinding) value = value._value

      // Add a membrane if this is an object type
      if (this._isObjectType(value)) {
        // Determine the owner. The owner may be on a prototype.
        const Universal = require('./universal')
        let parentJig = this._jig
        let container = target

        // Walk up the prototype chain to find our prop
        while (!_hasOwnProperty(container, prop)) {
          container = Object.getPrototypeOf(container)

          // Get the jig class if we are on its prototype
          parentJig = typeof container === 'object' ? container.constructor : container

          // Make sure it is a jig! If not, it's an intrinsic.
          if (!(parentJig instanceof Universal)) { parentJig = null }

          // Record this read
          if (this._rules._recordReads && parentJig) RECORD()._read(parentJig)
        }

        // If the child property is an object owned by a jig, mark it as such
        if (parentJig && !PENDING_MEMBRANES.has(value)) {
          const method = typeof value === 'function'
          const rules = Rules._childProperty(parentJig, method)
          value = new Membrane(value, rules)
        }
      }

      return value
    })
  }

  // --------------------------------------------------------------------------

  _getOwnPropertyDescriptor (target, prop) {
    if (this._isAdmin()) return Reflect.getOwnPropertyDescriptor(target, prop)

    return this._trap(() => {
      // Record this read
      if (this._rules._recordReads) RECORD()._read(this._jig)

      // Function prototypes and constructors must be returned directly. No wrapping.
      // Symbol properties too because they aren't settable by the user.
      const isFunctionPrototype = typeof target === 'function' && prop === 'prototype'
      const isConstructor = prop === 'constructor'
      const isSymbolProperty = typeof prop === 'symbol'
      const isDirectReturn = isFunctionPrototype || isConstructor || isSymbolProperty
      if (isDirectReturn) return Reflect.getOwnPropertyDescriptor(target, prop)

      // Code methods are not owned properties and are not overrideable
      if (this._isCodeMethod(prop)) return undefined

      // Bindings are not always readable
      this._checkCanGetBinding(target, prop)

      // Check if we can access if it is a private property
      if (!this._hasPrivateAccess(prop)) {
        throw new Error(`Cannot access private property ${prop}`)
      }

      // Read the descriptor
      const desc = Reflect.getOwnPropertyDescriptor(target, prop)
      if (!desc) return

      // Basic types are returned directly
      if (this._isBasicType(desc.value)) return desc

      // Jigs are returned directly
      if (desc.value instanceof Universal) return desc

      // If this is an unbound binding, return its actual inner value
      const Unbound = require('../util/unbound')
      const isUnboundValue = this._isBinding(prop) && desc.value instanceof Unbound
      if (isUnboundValue) desc.value = desc.value._value

      // Add a membrane if this is an object type
      if (this._isObjectType(desc.value) && !PENDING_MEMBRANES.has(desc.value)) {
        const method = typeof desc.value === 'function'
        const rules = Rules._childProperty(this._jig, method)
        desc.value = new Membrane(desc.value, rules)
      }

      return desc
    })
  }

  // --------------------------------------------------------------------------

  _getPrototypeOf (target) {
    if (this._isAdmin()) return Reflect.getPrototypeOf(target)

    return this._trap(() => {
      // Getting a prototype is a read
      if (this._rules._recordReads) RECORD()._read(this._jig)

      return Reflect.getPrototypeOf(target)
    })
  }

  // --------------------------------------------------------------------------

  _has (target, prop) {
    if (this._isAdmin()) return Reflect.has(target, prop)

    return this._trap(() => {
      // Checking a property is a read
      if (this._rules._recordReads) RECORD()._read(this._jig)

      // Code methods are part of the object, but not owned properties
      if (this._isCodeMethod(prop)) return true

      // Check if we can access private properties
      if (!this._hasPrivateAccess(prop)) {
        throw new Error(`Cannot access private property ${prop}`)
      }

      return Reflect.has(target, prop)
    })
  }

  // --------------------------------------------------------------------------

  _isExtensible (target) {
    if (this._isAdmin()) return Reflect.isExtensible(target)

    return this._trap(() => {
      // Membrane targets are marked extensible by design. Immutability, if enabled, is enforced
      // in the membrane, not JavaScript, because non-extensibility can make JavaScript annoying.
      return true
    })
  }

  // --------------------------------------------------------------------------

  _ownKeys (target) {
    if (this._isAdmin()) return Reflect.ownKeys(target)

    return this._trap(() => {
      // Getting key values is a read
      if (this._rules._recordReads) RECORD()._read(this._jig)

      // Filter out private keys if we are not able to view them
      return Reflect.ownKeys(target).filter(key => this._hasPrivateAccess(key))
    })
  }

  // --------------------------------------------------------------------------

  _preventExtensions (target) {
    if (this._isAdmin()) return Reflect.preventExtensions(target)

    return this._trap(() => {
      // This membrane does not support freezing the underlying object
      throw new Error('preventExtensions disabled')
    })
  }

  // --------------------------------------------------------------------------

  _set (target, prop, value, receiver) {
    if (this._isAdmin()) return Reflect.set(target, prop, value, receiver)

    return this._trap(() => {
      // A parent jig may be trying to override a non-jig child class's sets
      if (receiver !== this._proxy) {
        _setOwnProperty(receiver, prop, value)
        return true
      }

      // Setting a value is an update
      if (this._rules._recordUpdates) RECORD()._update(this._jig)

      // Code methods are permanent
      if (this._isCodeMethod(prop)) throw new Error(`Cannot set ${prop}`)

      // Only some bindings may be set by jig code
      this._checkCanSetBinding(target, prop, value)

      // Set must be called in a jig method
      this._checkIfBreakContract()

      // Ensure the the property can be stored in transactions and the state cache
      this._checkSerializable(prop, value)

      // Check that the value is not owned by another jig
      this._checkOwnership(value)

      // Check if we can set a private property
      if (!this._hasPrivateAccess(prop)) throw new Error(`Cannot set private property ${prop}`)

      // Clone the target if necessary
      target = this._copyOnWriteIfNecessary() || target

      // When bindings are set, they are unbound until the record is committed
      const Unbound = require('../util/unbound')
      if (this._isBinding(prop) && !(value instanceof Unbound)) {
        value = new Unbound(value)
      }

      // Enforce immutability
      if (this._rules._immutable) throw new Error('set disabled')

      // Remove the membrane if there is one
      value = Proxy2._getTarget(value) || value

      // Reflect.set will call defineProperty and getOwnPropertyDescriptor so we do sudo
      return _sudo(() => Reflect.set(target, prop, value, receiver))
    })
  }

  // --------------------------------------------------------------------------

  _setPrototypeOf (target, prototype) {
    if (this._isAdmin()) return Reflect.setPrototypeOf(target, prototype)

    return this._trap(() => {
      // Changing prototypes is something only Run can do by design
      throw new Error('setPrototypeOf disabled')
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicGetMethod () {
    if (this._isAdmin()) return

    return this._trap(() => {
      // Getting a method, even on an intrinsic, is a read
      if (this._rules._recordReads) RECORD()._read(this._jig)
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicOut (value) {
    if (this._isAdmin()) return value

    return this._trap(() => {
      // Basic types are returned directly
      if (this._isBasicType(value)) return value

      // Jigs are returned directly
      if (value instanceof Universal) return value

      // Add a membrane if this is an object type and not pending
      if (!PENDING_MEMBRANES.has(value)) {
        const rules = Rules._childProperty(this._jig, false)
        return new Membrane(value, rules)
      }

      return value
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicIn (value) {
    if (this._isAdmin()) return value

    return this._trap(() => {
      // Jigs are set directly
      if (value instanceof Universal) return value

      // Check if not a jig, that the value is not owned by another jig
      this._checkOwnership(value)

      // Remove the membrane if there is one
      value = Proxy2._getTarget(value) || value

      return value
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicRead () {
    if (this._isAdmin()) return

    return this._trap(() => {
      // Getting a inner stored value, even on an intrinsic, is a read
      if (this._rules._recordReads) RECORD()._read(this._jig)
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicUpdate () {
    if (this._isAdmin()) return

    return this._trap(() => {
      // Updating a inner stored value, even on an intrinsic, is an update
      if (this._rules._recordUpdates) RECORD()._update(this._jig)

      // Updates must be performed in one of the jig's methods
      this._checkIfBreakContract()

      if (this._rules._immutable) throw new Error('Immutable')

      // Clone the target if necessary
      this._copyOnWriteIfNecessary()
    })
  }

  // --------------------------------------------------------------------------
  // _throwIfJigErrors
  // --------------------------------------------------------------------------

  // Every jig trap checks if the jig in an error state from a prior action. A jig will go into
  // an error state if the user fails to sync and there was an error while publishing.
  _throwIfJigErrors () {
    if (!this._rules._errors) return

    const jigTarget = Proxy2._getTarget(this._jig)

    // If location is not defined, then we are setting up the jig and not in an error state.
    // For example, toString() should still be allowed to be called when setting up.
    if (!_hasOwnProperty(jigTarget, 'location')) return

    // Undeployed jigs can still be used because they will be deployed after the action completes.
    const { error, undeployed } = _location(jigTarget.location)
    if (error && !undeployed) throw new Error(error)
  }

  // --------------------------------------------------------------------------
  // _trap
  // --------------------------------------------------------------------------

  // Standard wrapper for all traps
  _trap (f) {
    return RECORD()._capture(() => {
      return this._captureErrors(() => {
        this._throwIfJigErrors()
        return f()
      })
    })
  }

  // --------------------------------------------------------------------------
  // _captureErrors
  // --------------------------------------------------------------------------

  // Handler errors should not be caught by internal jig code because they are not part of
  // consensus. If they happen, we detect them ourselves to prevent them from being swallowed
  // and always rethrow them within the current action.
  _captureErrors (f) {
    const CURRENT_RECORD = RECORD()
    try {
      const ret = f()
      // Check if there is an error again after the action to rethrow
      if (CURRENT_RECORD._error) throw CURRENT_RECORD._error
      // No error. Return the return value
      return ret
    } catch (e) {
      // If we're in an action and don't already have an error, save this one
      if (CURRENT_RECORD._stack.length && !CURRENT_RECORD._error) {
        CURRENT_RECORD._error = e
      }
      // Throw this error up to the outer action if there is one
      throw e
    }
  }

  // --------------------------------------------------------------------------
  // _checkIfContract
  // --------------------------------------------------------------------------

  _checkIfBreakContract () {
    if (!this._rules._contract) return
    const stack = RECORD()._stack
    if (stack.length && stack[stack.length - 1]._jig === this._proxy) return
    throw new Error('Updates must be performed in this jig\'s methods')
  }

  // --------------------------------------------------------------------------
  // _checkSerializable
  // --------------------------------------------------------------------------

  _checkSerializable (prop, value) {
    if (!this._rules._serializable) return
    _checkState(typeof prop !== 'symbol', 'Symbol names are not serializable')
    _checkState(_isSerializable(value), `Not serializable: ${_text(value)}`)
    _deepVisit(value, x => _checkState(_isSerializable(x), `Not serializable: ${_text(x)}`))
  }

  // --------------------------------------------------------------------------
  // _checkCanGetBinding
  // --------------------------------------------------------------------------

  _checkCanGetBinding (target, prop) {
    // Inner objects don't have bindings. Berry locations aren't mutable.
    if (!this._rules._bindings) return

    try {
      // Check location, origin, or nonce. These are assigned by Run.
      if (prop === 'location' || prop === 'origin' || prop === 'nonce') {
        const val = Reflect.get(target, prop)

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
        const val = Reflect.get(target, prop)

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
    if (!this._rules._bindings) return

    // Only Run can set the origin, location and nonce.
    _checkState(prop !== 'origin', 'Must not set origin')
    _checkState(prop !== 'location', 'Must not set location')
    _checkState(prop !== 'nonce', 'Must not set nonce')

    // Setting owner or satoshis requires the owner to be bound because the owner must be able to
    // to approve of the change. We don't allow changing these bound properties twice in a tx.
    const Unbound = require('../util/unbound')
    const unboundHint = 'Hint: Sync the jig to bind it in a transaction'
    const unboundError = `Cannot set binding ${prop} again\n\n${unboundHint}`
    const isUnbound = this._isBinding(prop) && target[prop] instanceof Unbound && target[prop]._value
    _checkState(!isUnbound, unboundError)

    // Check the value being set is valid. Users cannot set owners to null, only Run.
    const allowNull = false
    if (prop === 'owner') _owner(value, allowNull)
    if (prop === 'satoshis') _satoshis(value)
  }

  // --------------------------------------------------------------------------
  // _checkOwnership
  // --------------------------------------------------------------------------

  _checkOwnership (value) {
    if (!this._rules._ownership) return

    const membrane = Proxy2._getHandler(value)

    // If this is a newly created object and we're in a method, it is a pending membranes
    // because gets within this method, to be consistent, should return the target.
    if (!membrane && RECORD()._stack.length) PENDING_MEMBRANES.add(value)

    // If there is no membrane, then there is no existing owner
    if (!membrane) return

    // If this a COW object, then make a copy here because we want to assign us as owner
    membrane._copyOnWriteIfNecessary()

    // Assign us as owners if the objects does not already have an owner
    membrane._assignParentJigIfNecessary(this._jig)

    // Check that we own this object then
    const error = `Ownership violation: ${_text(value)}`
    _checkState(membrane._jig === this._jig, error)
  }

  // --------------------------------------------------------------------------
  // _hasPrivateAccess
  // --------------------------------------------------------------------------

  _hasPrivateAccess (prop) {
    // Targets without private properties are always accessible
    if (!this._rules._private) return true

    // If this doesn't start with an unscore, its accessible
    if (typeof prop !== 'string' || !prop.startsWith('_')) return true

    const Jig = require('./jig')
    const stack = RECORD()._stack

    // Outside of a jig, private properties are inaccessible
    if (!stack.length) return false

    // Get the top of the stack
    const accessor = stack[stack.length - 1]._jig

    // For jig code, only the current class may access its private properties.
    if (typeof this._jig === 'function') {
      return accessor === this._jig
    }

    // Handle jig instances. Other kinds of proxies should not be here
    _assert(this._jig instanceof Jig)

    // For jig instances, jigs of the same jig class may access the private properties.
    // Also, the jig class may access private properties of its instances.
    return accessor.constructor === this._jig.constructor ||
      accessor === this._jig.constructor
  }

  // --------------------------------------------------------------------------
  // _copyOnWriteIfNecessary
  // --------------------------------------------------------------------------

  _copyOnWriteIfNecessary () {
    // If don't need to copy, then return
    if (!this._rules._cow) return

    // The the old target that we will clone
    const oldTarget = Proxy2._getTarget(this._proxy)

    // deepClone will ensure serializability. It also will clone many internal objects,
    // which will decouple them from their former membranes, since only targets are
    // stored inside other targets.
    const clonedTarget = _deepClone(oldTarget, SI)

    // Set the new target to this proxy
    Proxy2._setTarget(this._proxy, clonedTarget)

    // Disable COW. The jig is no longer copy-on-write since we just copied it
    this._rules._cow = false

    // Return the new target to use in handlers
    return clonedTarget
  }

  // --------------------------------------------------------------------------
  // _assignParentJigIfNecessary
  // --------------------------------------------------------------------------

  // When a value is assigned to a jig and it doesn't have a parent jig, it becomes owned
  _assignParentJigIfNecessary (parentJig) {
    // If this is a top-level jig, then it can't be owned as an inner object
    if (this._proxy instanceof Universal) return

    // If there is already a parent jig, then do nothing
    if (this._rules._parentJig) return

    // Set parent jig
    this._jig = parentJig

    // Setup the new rules, which is inherited from the parent
    const method = typeof this._proxy === 'function'
    this._rules = Rules._childProperty(parentJig, method)
  }

  // --------------------------------------------------------------------------
  // Misc Helpers
  // --------------------------------------------------------------------------

  _isAdmin () { return this._rules._admin && _admin() }
  _isCodeMethod (prop) { return this._rules._code && CODE_METHOD_NAMES.includes(prop) }
  _isBinding (prop) { return this._rules._bindings && _BINDINGS.includes(prop) }
  _isObjectType (prop) { return prop && (typeof prop === 'object' || typeof prop === 'function') }
  _isBasicType (value) {
    const basicTypes = ['undefined', 'boolean', 'number', 'string', 'symbol']
    return basicTypes.includes(typeof value) || value === null
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Membrane
