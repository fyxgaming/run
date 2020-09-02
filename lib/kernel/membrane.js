/**
 * membrane.js
 *
 * A flexible proxy handler for jigs, code, berries, and their arguments and owned inner objects.
 */

const { _admin, _sudo } = require('../util/admin')
const {
  _assert, _checkState, _text, _hasOwnProperty, _setOwnProperty, _isSerializable,
  _RESERVED_PROPS
} = require('../util/misc')
const { _location, _owner, _satoshis, _BINDINGS } = require('../util/bindings')
const { _deepClone, _deepVisit, _deepReplace } = require('../util/deep')
const Sandbox = require('../util/sandbox')
const SI = Sandbox._intrinsics
const Proxy2 = require('../util/proxy2')
const Rules = require('./rules')
const Universal = require('./universal')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const RECORD = () => require('../kernel/record')._CURRENT_RECORD

// Inner properties so that we don't create the same membrane twice
const CHILD_MEMBRANES = new WeakMap() // ParentProxy -> (Target -> Proxy)

// Jigs whose membrane is created but is not yet returned in gets. Naked objects created in a
// method and then assigned to the jig are in this state. They will leave the PENDING_MEMBRANES
// set once the current jig's methods complete. The goal is to allow a consistent worldview where
// after setting a new object, if you get that newly set object it will be the same as the object.
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

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Static functions clear thisArg. It appears to be set by the sandbox.
      if (this._rules._thisless) thisArg = undefined

      // Calling a function requires a read of the code jig being called
      if (this._shouldRecord()) RECORD()._read(this._jig)

      // If this object isn't replayable, then we run it directly. This is used for
      // static code and inner methods. They don't need special handling. For inner
      // property methods, like a.arr.find(...), any gets will be handled by get and
      // intrinsicOut which will have the COW wrapping when returning externally.
      const membrane = Proxy2._getHandler(thisArg)
      const replayable = membrane && membrane._rules._replayable
      if (!replayable) return Reflect.apply(target, thisArg, args)

      // Detect when we are entering this jig from outside the sandbox or another jig
      const stack = RECORD()._stack
      const crossing = !stack.length || thisArg !== stack[stack.length - 1]._jig

      return RECORD()._capture(() => {
        // If entering the jig from outside, deep clone the args and unify worldview
        // We only need to do this at the top level. Inner args will already be sandboxed.
        if (!stack.length) {
          // Clone the value using sandbox intrinsics, deploying new code along the way
          args = _deepClone(args, SI, x => {
            if (typeof x === 'function' && !(x instanceof Universal)) {
              const Code = require('./code')
              const C = new Code(x)
              Code._editor(C)._deploy()
              return C
            }
          })

          // Unify the worldview so that the called jig is in harmony with the args
          membrane._unifyWorldview(thisArg, args)
        }

        // Even internal method args need to be serializable
        if (stack.length) membrane._checkSerializable('', args)

        // We will wrap the return value at the end
        let ret = null

        // COW the args. Even if they are from the outside. This protects our action args.
        const callArgs = this._wrapForImport(membrane, args)

        // Push a call action onto the stack and then call the method
        const Action = require('./action')
        Action._call(thisArg, target.name, args, () => {
          // Check if this function is available to our thisArg by its name
          const errorMessage = `Cannot call ${target.name} on ${_text(thisArg)}`
          const allowed = !thisArg || (thisArg[target.name] === this._proxy && thisArg instanceof Universal)
          _checkState(allowed, errorMessage)

          // Calling a function requires a read of the code jig being called
          // We perform this again in case it wasn't captured above.
          if (this._shouldRecord()) RECORD()._read(this._jig)

          // The pending membranes get cleared every time we cross a membrane to a different jig.
          // The current jig will use the newly created objects until the current jig changes.
          const saved = PENDING_MEMBRANES
          try {
            // Change pending membranes when we change jigs
            if (crossing) PENDING_MEMBRANES = new Set()

            // Perform the method
            ret = Reflect.apply(target, thisArg, callArgs)
          } finally {
            PENDING_MEMBRANES = saved
          }
        })

        // Async is not supported in membranes
        _checkState(!(ret instanceof Promise || ret instanceof SI.Promise), 'Async methods not supported')

        // Check that the return value is serializable as a precaution before wrapping
        // The method may be returning anything. Wrappers won't catch it all right away.
        _checkState(_isSerializable(ret), 'Return value not serializable')

        // Wrap the return value so the caller knows we own it
        const owned = false
        return this._wrapForExport(ret, thisArg, owned)
      })
    })
  }

  // --------------------------------------------------------------------------

  _construct (target, args, newTarget) {
    if (this._isAdmin()) return Reflect.construct(target, args, newTarget)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Constructing an instances requires a read of all code jigs being instantiated
      if (this._shouldRecord()) {
        const Universal = require('./universal')
        let T = this._jig
        while (T instanceof Universal) {
          RECORD()._read(T)
          T = Object.getPrototypeOf(T)
        }
      }

      // Construct is passed through. We do not record constructions for replayability.
      // That is left up to the individual classes being created to record. For example,
      // the buit-in Jig class records the creation of new jigs, not this membrane.
      return Reflect.construct(target, args, newTarget)
    })
  }

  // --------------------------------------------------------------------------

  _defineProperty (target, prop, desc) {
    if (this._isAdmin()) return Reflect.defineProperty(target, prop, desc)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Defining a property requires an update to the jig
      if (this._shouldRecord()) RECORD()._update(this._jig)

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

      // Ensure the the property can be stored in transactions and the state cache
      this._checkSerializable(prop, desc.value)

      // Only some bindings may be set by jig code
      this._checkCanSetBinding(target, prop, desc.value)

      // Some property names may be reserved for later
      this._checkReserved(prop)

      // Check if we can set a private property
      if (!this._hasPrivateAccess(prop)) throw new Error(`Cannot define private property ${prop}`)

      // Updates must be performed in one of the jig's methods
      this._checkIfSetInMethod()

      // Clone ourselves if necessary since this is a change
      target = this._copyOnWriteIfNecessary() || target

      // Wrap this value for use in this jig
      desc.value = this._wrapForImport(this, desc.value)

      // Claim ownership of this value
      this._claimOwnership(desc.value)

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

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Deleting a property requires an update to the jig
      if (this._shouldRecord()) RECORD()._update(this._jig)

      // Code methods are permanent by design
      if (this._isCodeMethod(prop)) throw new Error(`Cannot delete ${prop}`)

      // Bindings cannot be deleted by design
      if (this._isBinding(prop)) throw new Error(`Cannot delete binding ${prop}`)

      // Private properties can only be deleted if we have access
      if (!this._hasPrivateAccess(prop)) throw new Error(`Cannot delete private property ${prop}`)

      // Updates must be performed in one of the jig's methods
      this._checkIfSetInMethod()

      // Clone ourselves if necessary since this is a change
      target = this._copyOnWriteIfNecessary() || target

      // Enforce immutability
      if (this._rules._immutable) throw new Error('delete disabled')

      return Reflect.deleteProperty(target, prop)
    })
  }

  // --------------------------------------------------------------------------

  _get (target, prop, receiver) {
    if (this._isAdmin()) return Reflect.get(target, prop, receiver)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

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
      if (this._shouldRecord()) RECORD()._read(this._jig)

      // Bindings are not always readable
      this._checkCanGetBinding(target, prop)

      // Check if we can access if it is a private property
      if (!this._hasPrivateAccess(prop)) throw new Error(`Cannot access private property ${prop}`)

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

      // Get the parent jig for this property is on. This will trigger reads.
      const parentJig = this._getParentJig(prop)

      // Wrap this object with a membrane that enforces parent rules
      const owned = parentJig === this._jig
      value = this._wrapForExport(value, parentJig, owned)

      return value
    })
  }

  // --------------------------------------------------------------------------

  _getOwnPropertyDescriptor (target, prop) {
    if (this._isAdmin()) return Reflect.getOwnPropertyDescriptor(target, prop)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Record this read
      if (this._shouldRecord()) RECORD()._read(this._jig)

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
      if (!this._hasPrivateAccess(prop)) throw new Error(`Cannot access private property ${prop}`)

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

      // Wrap this object with a membrane that enforces parent rules
      const owned = true
      desc.value = this._wrapForExport(desc.value, this._jig, owned)

      return desc
    })
  }

  // --------------------------------------------------------------------------

  _getPrototypeOf (target) {
    if (this._isAdmin()) return Reflect.getPrototypeOf(target)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Getting a prototype is a read
      if (this._shouldRecord()) RECORD()._read(this._jig)

      return Reflect.getPrototypeOf(target)
    })
  }

  // --------------------------------------------------------------------------

  _has (target, prop) {
    if (this._isAdmin()) return Reflect.has(target, prop)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Checking a property is a read
      if (this._shouldRecord()) RECORD()._read(this._jig)

      // Code methods are part of the object, but not owned properties
      if (this._isCodeMethod(prop)) return true

      // Check if we can access private properties
      if (!this._hasPrivateAccess(prop)) throw new Error(`Cannot access private property ${prop}`)

      return Reflect.has(target, prop)
    })
  }

  // --------------------------------------------------------------------------

  _isExtensible (target) {
    if (this._isAdmin()) return Reflect.isExtensible(target)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Membrane targets are marked extensible by design. Immutability, if enabled, is enforced
      // in the membrane, not JavaScript, because non-extensibility can make JavaScript annoying.
      return true
    })
  }

  // --------------------------------------------------------------------------

  _ownKeys (target) {
    if (this._isAdmin()) return Reflect.ownKeys(target)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Getting key values is a read
      if (this._shouldRecord()) RECORD()._read(this._jig)

      // Filter out private keys if we are not able to view them
      return Reflect.ownKeys(target).filter(key => this._hasPrivateAccess(key))
    })
  }

  // --------------------------------------------------------------------------

  _preventExtensions (target) {
    if (this._isAdmin()) return Reflect.preventExtensions(target)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // This membrane does not support freezing the underlying object
      throw new Error('preventExtensions disabled')
    })
  }

  // --------------------------------------------------------------------------

  _set (target, prop, value, receiver) {
    if (this._isAdmin()) return Reflect.set(target, prop, value, receiver)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // A parent jig may be trying to override a non-jig child class's sets
      if (receiver !== this._proxy) {
        _setOwnProperty(receiver, prop, value)
        return true
      }

      // Setting a value is an update
      if (this._shouldRecord()) RECORD()._update(this._jig)

      // Code methods are permanent
      if (this._isCodeMethod(prop)) throw new Error(`Cannot set ${prop}`)

      // Ensure the the property can be stored in transactions and the state cache
      this._checkSerializable(prop, value)

      // Only some bindings may be set by jig code
      this._checkCanSetBinding(target, prop, value)

      // Some property names may be reserved for later
      this._checkReserved(prop)

      // Check if we can set a private property
      if (!this._hasPrivateAccess(prop)) throw new Error(`Cannot set private property ${prop}`)

      // Set must be called in a jig method
      this._checkIfSetInMethod()

      // Clone ourselves if necessary since this is a change
      target = this._copyOnWriteIfNecessary() || target

      // Wrap this value for use in this jig
      value = this._wrapForImport(this, value)

      // Assign ownership of this value to ourselves
      this._claimOwnership(value)

      // When bindings are set, they are unbound until the record is committed
      const Unbound = require('../util/unbound')
      if (this._isBinding(prop) && !(value instanceof Unbound)) {
        value = new Unbound(value)
      }

      // Enforce immutability
      if (this._rules._immutable) throw new Error('set disabled')

      // Remove the membrane if there is one
      value = Proxy2._getTarget(value) || value

      // Using Reflect.set doesn't work. Parent proxies will intercept for classes.
      _sudo(() => _setOwnProperty(target, prop, value))

      return true
    })
  }

  // --------------------------------------------------------------------------

  _setPrototypeOf (target, prototype) {
    if (this._isAdmin()) return Reflect.setPrototypeOf(target, prototype)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Changing prototypes is something only Run can do by design
      throw new Error('setPrototypeOf disabled')
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicGetMethod () {
    if (this._isAdmin()) return

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Getting a method, even on an intrinsic, is a read
      if (this._shouldRecord()) RECORD()._read(this._jig)
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicOut (value) {
    if (this._isAdmin()) return value

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Basic types are returned directly
      if (this._isBasicType(value)) return value

      // Jigs are returned directly
      if (value instanceof Universal) return value

      // Wrap this object with a membrane that enforces parent rules
      const owned = true
      value = this._wrapForExport(value, this._jig, owned)

      return value
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicIn (value) {
    if (this._isAdmin()) return value

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Jigs are set directly
      if (value instanceof Universal) return value

      // Check that the value is serializable
      this._checkSerializable('', value)

      // Wrap this value for use in this jig
      value = this._wrapForImport(this, value)

      // Assign ownership of this value to ourselves
      this._claimOwnership(value)

      // Remove the membrane if there is one
      value = Proxy2._getTarget(value) || value

      return value
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicRead () {
    if (this._isAdmin()) return

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Getting a inner stored value, even on an intrinsic, is a read
      if (this._shouldRecord()) RECORD()._read(this._jig)
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicUpdate () {
    if (this._isAdmin()) return

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Updating a inner stored value, even on an intrinsic, is an update
      if (this._shouldRecord()) RECORD()._update(this._jig)

      // Updates must be performed in one of the jig's methods
      this._checkIfSetInMethod()

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
    if (!jigTarget) return

    // If location is not defined, then we are setting up the jig and not in an error state.
    // For example, toString() should still be allowed to be called when setting up.
    if (!_hasOwnProperty(jigTarget, 'location')) return

    // Undeployed jigs can still be used because they will be deployed after the action completes.
    const { error, undeployed } = _location(jigTarget.location)
    if (error && !undeployed) throw new Error(error)
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
  // _checkIfSetInMethod
  // --------------------------------------------------------------------------

  _checkIfSetInMethod () {
    if (!this._rules._replayable) return
    const stack = RECORD()._stack
    if (stack.length && stack[stack.length - 1]._jig === this._proxy) return
    throw new Error('Updates must be performed in this jig\'s methods')
  }

  // --------------------------------------------------------------------------
  // _checkSerializable
  // --------------------------------------------------------------------------

  _checkSerializable (prop, value) {
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

        _checkState(!loc.undeployed, 'Hint: Sync the jig to deploy it')
        _checkState(!loc.error, `A previous error occurred\n\n${loc.error}`)

        // Native code bindings can always be read
        if (loc.nativeid) return

        // If no txid, then the location is not determined. The jig in a pending commit.
        // Jig code won't encounter this but it protects users from getting temp locs.
        const undeterminedError = 'Hint: Sync the jig to assign it in a transaction'
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
  // _checkCanSetBinding
  // --------------------------------------------------------------------------

  _checkReserved (prop) {
    if (!this._rules._reserved) return
    _checkState(!_RESERVED_PROPS.includes(prop), `${prop} is reserved`)
  }

  // --------------------------------------------------------------------------
  // _hasPrivateAccess
  // --------------------------------------------------------------------------

  _hasPrivateAccess (prop) {
    // Targets without private properties are always accessible
    if (!this._rules._privacy) return true

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
  // _wrapForExport
  // --------------------------------------------------------------------------

  _wrapForExport (value, parentJig, owned) {
    // If there is no parent, then it doesn't need to be wrapped. No protection. This might
    // happen if the value is an intrinsic method. For example, Object.prototype.toString.
    if (!parentJig) return value

    // If this is a primitive type, it can't have a membrane
    if (!this._isObjectType(value)) return value

    // If this is a universal, it needs no wrapping
    if (value instanceof Universal) return value

    // Check if we are within one of our own methods
    const stack = RECORD()._stack
    const inside = stack.length && stack[stack.length - 1]._jig === this._jig

    // If this object is used in the method it was created, just return it
    if (inside && PENDING_MEMBRANES.has(value)) return value

    // Add parent rules no matter whether returning to us or them
    // Parent rules handle reads and writes. Only exception is PENDING_MEMBRANE,
    // which means this jig is already a write if a value is in it.
    value = this._addParentRules(value, parentJig, owned)

    // Only add a cow membrane if returning outside
    if (!inside) value = this._addCowPropMembrane(value)

    return value
  }

  // --------------------------------------------------------------------------
  // _addParentRules
  // --------------------------------------------------------------------------

  _addParentRules (value, parentJig, owned) {
    // If this value is already wrapped, then we won't wrap it again
    if (Proxy2._getTarget(value)) return value

    // If we've already created a membrane for this jig, return that one
    if (!CHILD_MEMBRANES.has(parentJig)) CHILD_MEMBRANES.set(parentJig, new WeakMap())
    if (CHILD_MEMBRANES.get(parentJig).has(value)) return CHILD_MEMBRANES.get(parentJig).get(value)

    // Create a new membrane for this value
    const method = typeof value === 'function'
    const rules = Rules._childProperty(parentJig, method, owned)
    const membrane = new Membrane(value, rules)

    // Save the membrane to avoid dedups
    CHILD_MEMBRANES.get(parentJig).set(value, membrane)

    return membrane
  }

  // --------------------------------------------------------------------------
  // _addCowPropMembrane
  // --------------------------------------------------------------------------

  _addCowPropMembrane (value) {
    // If not using cow prop rules, then simply return
    if (!this._rules._cowProps) return value

    // Methods are not COWs ever because they can't be cloned
    if (typeof value === 'function') return value

    // If inside a method of the current jig, don't add a cow membrane
    const stack = RECORD()._stack
    if (stack.length && stack[stack.length - 1]._jig === this._jig) return value

    // Create a COW membrane
    const rules = Rules._cow()
    const membrane = new Membrane(value, rules)

    return membrane
  }

  // --------------------------------------------------------------------------
  // _wrapForImport
  // --------------------------------------------------------------------------

  _wrapForImport (thisMembrane, value) {
    // Non-replayable membranes don't need wrapping because their state does not
    // depend on secure inputs and outputs.
    if (!thisMembrane._rules._replayable) return value

    // Determine if we are crossing a boundary from another jig to this one
    const stack = RECORD()._stack
    const crossing = !stack.length || stack[stack.length - 1]._jig !== thisMembrane._jig

    // If not crossing, then we're an internal method calling ourself. No import.
    if (!crossing) return value

    // If this is a primitive type, it needs no wrapping
    if (!thisMembrane._isObjectType(value)) return value

    // If this is a universal, it also needs no wrapping
    if (value instanceof Universal) return value

    // Otherwise, COW-wrap the import so that any changes clone it for us
    const rules = Rules._cow()
    const membrane = new Membrane(value, rules)
    return membrane
  }

  // --------------------------------------------------------------------------
  // _claimOwnership
  // --------------------------------------------------------------------------

  _claimOwnership (value) {
    _deepVisit(value, value => {
      // If this is a top-level jig, then it has its own owner
      if (value instanceof Universal) return

      const membrane = Proxy2._getHandler(value)
      if (membrane) {
        // If we already own it, nothing to do
        if (membrane._rules._parentJig === this._jig) return

        // If there is a membrane, we can only claim it if it is unowned
        _checkState(!membrane._rules._parentJig, 'Ownership violation')

        // If this a COW object, then make a copy now
        membrane._copyOnWriteIfNecessary()

        // Assign ourself as owner with all our rules
        const method = typeof value === 'function'
        const owned = true
        membrane._rules = Rules._childProperty(this._jig, method, owned)
      } else {
        // If there is no membrane, then we're dealing with a newly created object
        // in a jig method or an object passed in from the user realm.
        if (RECORD()._stack.length) PENDING_MEMBRANES.add(value)
      }
    })
  }

  // --------------------------------------------------------------------------
  // _unifyWorldview
  // --------------------------------------------------------------------------

  _unifyWorldview (...args) {
    const worldview = new Map() // Location -> Universal
    _sudo(() => _deepReplace(args, x => {
      if (!(x instanceof Universal)) return
      const y = worldview.get(x.location) || x
      worldview.set(x.location, y)
      return y
    }))
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
  // _getParentJig
  // --------------------------------------------------------------------------

  // Determines the owner. The owner may be on a prototype. Assumes it exists.
  _getParentJig (prop) {
    let parentJig = this._jig
    let target = this._proxy

    // Walk up the prototype chain to find our prop
    while (!_hasOwnProperty(target, prop)) {
      target = Object.getPrototypeOf(target)

      // The property should always exist if we are in this method
      _assert(target)

      // Get the jig class if we are on its prototype
      parentJig = typeof target === 'object' ? target.constructor : target

      // Make sure it is a jig. If not, it's an intrinsic like Object or Function, not a jig.
      if (!(parentJig instanceof Universal)) parentJig = null

      // Because the prototype chain is not membraned, we record reads manually
      if (parentJig && this._shouldRecord()) RECORD()._read(parentJig)
    }

    return parentJig
  }

  // --------------------------------------------------------------------------
  // Misc Helpers
  // --------------------------------------------------------------------------

  _isAdmin () { return this._rules._admin && _admin() }
  _isCodeMethod (prop) { return this._rules._code && CODE_METHOD_NAMES.includes(prop) }
  _shouldRecord () { return this._rules._recordable && RECORD()._stack.length }
  _isBinding (prop) { return this._rules._bindings && _BINDINGS.includes(prop) }
  _isObjectType (prop) { return prop && (typeof prop === 'object' || typeof prop === 'function') }
  _isBasicType (value) {
    const basicTypes = ['undefined', 'boolean', 'number', 'string', 'symbol']
    return basicTypes.includes(typeof value) || value === null
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Membrane
