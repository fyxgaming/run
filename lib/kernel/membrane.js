/**
 * membrane.js
 *
 * A flexible proxy handler for jigs, code, berries, and their arguments and owned inner objects.
 */

const { _admin, _sudo } = require('../util/admin')
const {
  _assert, _text, _hasOwnProperty, _setOwnProperty, _isSerializable,
  _RESERVED_PROPS, _RESERVED_CODE_METHODS, _RESERVED_JIG_METHODS, _RESERVED_BERRY_METHODS,
  _getOwnProperty, _deterministicCompareKeys, _isBasicSet, _isBasicMap
} = require('../util/misc')
const { _location, _owner, _satoshis, _CREATION_BINDINGS, _UTXO_BINDINGS } = require('../util/bindings')
const { _deepClone, _deepVisit } = require('../util/deep')
const Sandbox = require('../sandbox/sandbox')
const SI = Sandbox._intrinsics
const Proxy2 = require('../util/proxy2')
const { _unifyForMethod } = require('./unify')
const Rules = require('./rules')
const Creation = require('./creation')
const Editor = require('./editor')
const { StateError } = require('../util/errors')

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
const CODE_METHODS = new Map()
function getCodeMethod (name) {
  const prev = CODE_METHODS.get(name)
  if (prev) return prev
  const Code = require('./code')
  const funcname = name === Symbol.hasInstance ? 'hasInstance' : name
  const script = `function ${funcname} (...args) { return method.apply(this, args) }`
  const method = _sudo(() => Object.getPrototypeOf(Code.prototype)[name])
  const sandboxedMethod = Sandbox._evaluate(script, { method })[0]
  CODE_METHODS.set(name, sandboxedMethod)
  return Object.freeze(sandboxedMethod)
}

const CODE_METHOD_NAMES = ['toString', 'sync', 'upgrade', 'destroy', 'auth', Symbol.hasInstance]

const PROTECTED_JIG_METHOD_NAMES = ['init', 'sync'] // destroy and auth are not protected

const PROTECTED_BERRY_METHOD_NAMES = ['init']

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

class Membrane {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  constructor (target, rules = new Rules()) {
    // Create the new proxy with this instance as a membrane
    this._proxy = new Proxy2(target, this)

    // Store the rules for the membrane. We'll use them later.
    this._rules = rules

    // Determine the jig that the target is owned by, which may be itself
    this._jig = rules._parentJig || this._proxy

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
      if (this._shouldRecordRead()) RECORD()._read(this._jig)

      // Check that this method isn't disabled for this jig
      let targetMembrane = Proxy2._getHandler(thisArg)
      const disabledMethods = targetMembrane && targetMembrane._rules._disabledMethods
      const disabled = disabledMethods && disabledMethods.includes(target.name)
      if (disabled) throw new StateError(`${target.name} disabled`)

      // The base init() method on jig does not record calls. However, the target (jig) is
      // recordable, and any init() methods on derived jig classes record calls. That is to say,
      // if there's no init() method on a jig, then init() is pass-through and the top-level
      // action is the "new" action. The same is true for init() on berries and the pluck action.
      let passThrough = !targetMembrane || !targetMembrane._rules._recordableTarget || !this._rules._recordCalls

      // If pass through, see if we can make it not pass through. Check both if thisArg is
      // a function and whether it is not a Jig instance to support mocks in tests.
      const Jig = require('./jig')
      if (passThrough && typeof thisArg === 'function' && !(thisArg instanceof Jig)) {
        thisArg = Editor._newCode(thisArg)
        targetMembrane = Proxy2._getHandler(thisArg)
        passThrough = !targetMembrane || !targetMembrane._rules._recordableTarget || !this._rules._recordCalls
      }

      // If this method is pass through, then we run it directly. This is used for
      // sidekick code and inner methods. They don't need special handling. For inner
      // property methods, like a.arr.find(...), any gets will be handled by get and
      // intrinsicOut which will have the COW wrapping when returning externally.
      if (passThrough) return Reflect.apply(target, thisArg, args)

      // Detect when we are entering this jig from outside the sandbox or another jig
      const stack = RECORD()._stack
      const crossing = !stack.length || thisArg !== stack[stack.length - 1]._jig

      // Save the pending membranes used in this call for afterward
      let methodPendingMembranes = PENDING_MEMBRANES

      return RECORD()._capture(() => {
        // If entering the jig from outside, deep clone the args and unify worldview
        // We only need to do this at the top level. Inner args will already be sandboxed.
        if (!stack.length) {
          args = prepareArgs(thisArg, args)
        }

        // Even internal method args need to be serializable
        if (stack.length) targetMembrane._checkSerializable('', args)

        // We will wrap the return value at the end
        let ret = null

        // COW the args. Even if they are from the outside. This protects our action args.
        const callArgs = this._wrapForImport(targetMembrane, args)

        // Check that we have access. Private methods cannot be called even from outside.
        const noAccess = !targetMembrane._hasPrivateAccess(target.name, true)
        if (noAccess) throw new Error(`Cannot call private method ${target.name}`)

        // Push a call action onto the stack and then call the method
        const Action = require('./action')
        Action._call(thisArg, target.name, args, () => {
          // Get the method on the target object from its name. This also checks that the target
          // method is the same. We do this to allow for class unification on jig objects. As
          // long as a function with the same name exists, we allow it to be called.
          const [latestTarget, latestTargetJig] = getLatestMethod(thisArg, target, this._proxy, this._jig)
          if (!latestTarget) throw new StateError(`Cannot call ${target.name} on ${_text(thisArg)}`)

          // Calling a function requires a read of the code jig being called
          // We perform this again in case it wasn't captured above.
          if (this._shouldRecordRead()) RECORD()._read(latestTargetJig)

          // The pending membranes get cleared every time we cross a membrane to a different jig.
          // The current jig will use the newly created objects until the current jig changes.
          const saved = PENDING_MEMBRANES
          try {
            // Change pending membranes when we change jigs
            if (crossing) methodPendingMembranes = new Set()
            PENDING_MEMBRANES = methodPendingMembranes

            // Perform the method
            ret = Reflect.apply(latestTarget, thisArg, callArgs)
          } finally {
            PENDING_MEMBRANES = saved
          }
        })

        // Async is not supported in membranes
        if (ret instanceof Promise || ret instanceof SI.Promise) throw new StateError('async methods not supported')

        // Check that the return value is serializable as a precaution before wrapping
        // The method may be returning anything. Wrappers won't catch it all right away.
        if (!_isSerializable(ret)) throw new StateError('Return value not serializable')

        // Wrap the return value so the caller knows we own it
        const owned = false
        const returned = true
        return this._wrapForExport(ret, thisArg, owned, returned, methodPendingMembranes)
      })
    })
  }

  // --------------------------------------------------------------------------

  _construct (target, args, newTarget) {
    if (this._isAdmin()) return Reflect.construct(target, args, newTarget)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Constructing an instance (a jig, a berry, or an arbitrary object), requires a read
      // of the class being constructed. If that constructor calls super, then it will read
      // the parent too, but to instantiate we only need to read the current class.
      if (this._shouldRecordRead()) RECORD()._read(this._jig)

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

      // Prototype cannot be set directly
      if (prop === '__proto__') throw new Error('define __proto__ disabled')

      // Defining a property requires an update to the jig
      if (this._shouldRecordUpdate()) RECORD()._update(this._jig)

      // On Chrome and Firefox, properties are copied from their existing descriptor.
      // On Safari, properties must be specified. We require Safari's behavior.

      // Only allow configurable, writable, enumerable value properties
      if (!('value' in desc)) throw new StateError('Descriptor must have a value')
      if ('get' in desc) throw new StateError('Getters are not supported')
      if ('set' in desc) throw new StateError('Getters are not supported')
      if (!desc.configurable) throw new StateError('Descriptor must be configurable')
      if (!desc.writable) throw new StateError('Descriptor must be writable')
      if (!desc.enumerable) throw new StateError('Descriptor must be enumerable')

      // Code, jig, and berry methods are permanent and cannot be overridden
      if (this._isCodeMethod(prop)) throw new Error(`Cannot define ${prop}`)
      if (this._isCodeDeps(prop)) throw new Error(`Cannot define ${prop}`)
      if (this._isProtectedJigMethod(prop)) throw new Error(`Cannot define ${prop}`)
      if (this._isProtectedBerryMethod(prop)) throw new Error(`Cannot define ${prop}`)

      // Ensure the the property can be stored in transactions and the state cache
      this._checkSerializable(prop, desc.value)

      // If this is a code option, check that it is a valid value
      this._checkCanSetCodeOption(prop, desc.value)

      // Only some bindings may be set by jig code
      this._checkCanSetCreationBinding(target, prop, desc.value)
      this._checkCanSetUtxoBinding(target, prop, desc.value)

      // Some property names may be reserved for later
      this._checkReserved(prop, 'define')

      // Check if we can set a private property
      if (!this._hasPrivateAccess(prop)) throw new Error(`Cannot define private property ${prop}`)

      // Enforce immutability for static and native code
      if (this._rules._immutable) throw new Error('defineProperty disabled')

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
      if (this._isUtxoBinding(prop) && !(desc.value instanceof Unbound)) {
        desc.value = new Unbound(desc.value)
      }

      // Remove the membrane if there is one
      if (!(desc.value instanceof Creation)) {
        desc.value = Proxy2._getTarget(desc.value) || desc.value
      }

      // Define the property
      return Reflect.defineProperty(target, prop, desc)
    })
  }

  // --------------------------------------------------------------------------

  _deleteProperty (target, prop) {
    if (this._isAdmin()) return Reflect.deleteProperty(target, prop)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      if (prop === '__proto__') throw new Error('delete __proto__ disabled')

      // Deleting a property requires an update to the jig
      if (this._shouldRecordUpdate()) RECORD()._update(this._jig)

      // Code, jig, and berry methods are permanent by design
      if (this._isCodeMethod(prop)) throw new Error(`Cannot delete ${prop}`)
      if (this._isCodeDeps(prop)) throw new Error(`Cannot delete ${prop}`)
      if (this._isProtectedJigMethod(prop)) throw new Error(`Cannot delete ${prop}`)
      if (this._isProtectedBerryMethod(prop)) throw new Error(`Cannot delete ${prop}`)

      // Bindings cannot be deleted by design
      if (this._isCreationBinding(prop)) throw new Error(`Cannot delete ${prop}`)
      if (this._isUtxoBinding(prop)) throw new Error(`Cannot delete ${prop}`)

      // Private properties can only be deleted if we have access
      if (!this._hasPrivateAccess(prop)) throw new Error(`Cannot delete private property ${prop}`)

      // Enforce immutability for static and native code
      if (this._rules._immutable) throw new Error('delete disabled')

      // Updates must be performed in one of the jig's methods
      this._checkIfSetInMethod()

      // Clone ourselves if necessary since this is a change
      target = this._copyOnWriteIfNecessary() || target

      return Reflect.deleteProperty(target, prop)
    })
  }

  // --------------------------------------------------------------------------

  _get (target, prop, receiver) {
    if (this._isAdmin()) return Reflect.get(target, prop, receiver)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Code methods are specially handled. They are not reads since they don't change.
      const hasInstanceOverride = prop === Symbol.hasInstance &&
        target[Symbol.hasInstance] !== SI.Function.prototype[Symbol.hasInstance]
      if (this._isCodeMethod(prop) && !hasInstanceOverride) return getCodeMethod(prop)

      // Unoverridable jig methods (sync and load) are not counted as reads
      if (this._isProtectedJigMethod(prop) && _RESERVED_JIG_METHODS.includes(prop)) {
        const Jig = require('./jig')
        let method = Reflect.get(target, prop, receiver)
        method = this._addParentRules(method, Jig, true)
        return method
      }

      // Unoverridable berry methods (load) are not counted as reads
      if (this._isProtectedBerryMethod(prop) && _RESERVED_BERRY_METHODS.includes(prop)) {
        const Berry = require('./berry')
        let method = Reflect.get(target, prop, receiver)
        method = this._addParentRules(method, Berry, true)
        return method
      }

      // Function prototypes and constructors must be returned directly. No wrapping.
      // Symbol properties too, because they aren't settable by the user.
      // They are also not reads because they are all permanant immutable properties.
      const isFunctionPrototype = typeof target === 'function' && prop === 'prototype'
      const isConstructor = prop === 'constructor'
      const isSymbolProperty = typeof prop === 'symbol'
      const isDirectReturn = isFunctionPrototype || isConstructor || isSymbolProperty
      if (isDirectReturn) return Reflect.get(target, prop, receiver)

      // Record this read
      if (this._shouldRecordRead()) RECORD()._read(this._jig)

      // Bindings are not always readable
      this._checkCanGetCreationBinding(target, prop)
      this._checkCanGetUtxoBinding(target, prop)

      // Check if we can access if it is a private property
      if (!this._hasPrivateAccess(prop)) throw new Error(`Cannot access private property ${prop}`)

      // Read the value
      let value = Reflect.get(target, prop, receiver)

      // Basic types are returned directly
      if (this._isBasicType(value)) return value

      // Jigs are returned directly
      if (value instanceof Creation) return value

      // If this is an unbound binding, return its actual inner value
      const Unbound = require('../util/unbound')
      const isUnboundBinding = this._isUtxoBinding(prop) && value instanceof Unbound
      if (isUnboundBinding) value = value._value

      // Get the parent jig for this property is on. This will trigger reads.
      const parentJig = this._getParentJig(prop)

      // Wrap this object with a membrane that enforces parent rules
      const owned = parentJig === this._jig
      const returned = false
      value = this._wrapForExport(value, parentJig, owned, returned)

      return value
    })
  }

  // --------------------------------------------------------------------------

  _getOwnPropertyDescriptor (target, prop) {
    if (this._isAdmin()) return Reflect.getOwnPropertyDescriptor(target, prop)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Record this read
      if (this._shouldRecordRead()) RECORD()._read(this._jig)

      // Function prototypes and constructors must be returned directly. No wrapping.
      // Symbol properties too because they aren't settable by the user.
      const isFunctionPrototype = typeof target === 'function' && prop === 'prototype'
      const isConstructor = prop === 'constructor'
      const isSymbolProperty = typeof prop === 'symbol'
      const isDirectReturn = isFunctionPrototype || isConstructor || isSymbolProperty
      if (isDirectReturn) return Reflect.getOwnPropertyDescriptor(target, prop)

      // Code, jig, and berry methods are not owned properties and are not overrideable
      if (this._isCodeMethod(prop)) return undefined
      if (this._isProtectedJigMethod(prop)) return undefined
      if (this._isProtectedBerryMethod(prop)) return undefined

      // Bindings are not always readable
      this._checkCanGetCreationBinding(target, prop)
      this._checkCanGetUtxoBinding(target, prop)

      // Check if we can access if it is a private property
      if (!this._hasPrivateAccess(prop)) throw new Error(`Cannot access private property ${prop}`)

      // Read the descriptor
      const desc = Reflect.getOwnPropertyDescriptor(target, prop)
      if (!desc) return

      // Basic types are returned directly
      if (this._isBasicType(desc.value)) return desc

      // Jigs are returned directly
      if (desc.value instanceof Creation) return desc

      // If this is an unbound binding, return its actual inner value
      const Unbound = require('../util/unbound')
      const isUnboundValue = this._isUtxoBinding(prop) && desc.value instanceof Unbound
      if (isUnboundValue) desc.value = desc.value._value

      // Wrap this object with a membrane that enforces parent rules
      const owned = true
      const returned = false
      desc.value = this._wrapForExport(desc.value, this._jig, owned, returned)

      return desc
    })
  }

  // --------------------------------------------------------------------------

  _getPrototypeOf (target) {
    if (this._isAdmin()) return Reflect.getPrototypeOf(target)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Getting a prototype is a read
      if (this._shouldRecordRead()) RECORD()._read(this._jig)

      return Reflect.getPrototypeOf(target)
    })
  }

  // --------------------------------------------------------------------------

  _has (target, prop) {
    if (this._isAdmin()) return Reflect.has(target, prop)

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Checking a property is a read
      if (this._shouldRecordRead()) RECORD()._read(this._jig)

      // Code, jig, and berry methods are part of the object, but not owned properties
      if (this._isCodeMethod(prop)) return true
      if (this._isProtectedJigMethod(prop)) return true
      if (this._isProtectedBerryMethod(prop)) return true

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
      if (this._shouldRecordRead()) RECORD()._read(this._jig)

      let keys = Reflect.ownKeys(target)

      // Always sort keys deterministically inside the membrane.
      keys = keys.sort(_deterministicCompareKeys)

      // Filter out private keys if we are not able to view them
      keys = keys.filter(key => this._hasPrivateAccess(key))

      return keys
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
    // Using Reflect.set doesn't work. Parent proxies will intercept for classes.
    if (this._isAdmin()) { _setOwnProperty(target, prop, value); return true }

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Prototype cannot be set directly
      if (prop === '__proto__') throw new Error('set __proto__ disabled')

      // A parent jig may be trying to override a non-jig child class's sets
      if (receiver !== this._proxy) {
        _setOwnProperty(receiver, prop, value)
        return true
      }

      // Setting a value causes a spend
      if (this._shouldRecordUpdate()) RECORD()._update(this._jig)

      // Code, jig, and berry methods are permanent
      if (this._isCodeMethod(prop)) throw new Error(`Cannot set ${prop}`)
      if (this._isCodeDeps(prop)) throw new Error(`Cannot set ${prop}`)
      if (this._isProtectedJigMethod(prop)) throw new Error(`Cannot set ${prop}`)
      if (this._isProtectedBerryMethod(prop)) throw new Error(`Cannot set ${prop}`)

      // Ensure the the property can be stored in transactions and the state cache
      this._checkSerializable(prop, value)

      // If this is a code option, check that it is a valid value
      this._checkCanSetCodeOption(prop, value)

      // Only some bindings may be set by jig code
      this._checkCanSetCreationBinding(target, prop, value)
      this._checkCanSetUtxoBinding(target, prop, value)

      // Some property names may be reserved for later
      this._checkReserved(prop, 'set')

      // Check if we can set a private property
      if (!this._hasPrivateAccess(prop)) throw new Error(`Cannot set private property ${prop}`)

      // Enforce immutability for static and native code
      if (this._rules._immutable) throw new Error('set disabled')

      // Set must be called in a jig method
      this._checkIfSetInMethod()

      // Clone ourselves if necessary since this is a change
      target = this._copyOnWriteIfNecessary() || target

      // Wrap this value for use in this jig
      value = this._wrapForImport(this, value)

      // Assign ownership this  to ourselves if its unowned
      this._claimOwnership(value)

      // When bindings are set, they are unbound until the record is committed
      const Unbound = require('../util/unbound')
      if (this._isUtxoBinding(prop) && !(value instanceof Unbound)) {
        value = new Unbound(value)
      }

      // Remove the membrane if there is one and it's not a jig
      if (!(value instanceof Creation)) {
        value = Proxy2._getTarget(value) || value
      }

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
      if (this._shouldRecordRead()) RECORD()._read(this._jig)
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
      if (value instanceof Creation) return value

      // Wrap this object with a membrane that enforces parent rules
      const owned = true
      const returned = false
      value = this._wrapForExport(value, this._jig, owned, returned)

      return value
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicIn (value) {
    if (this._isAdmin()) return value

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Jigs are set directly
      if (value instanceof Creation) return value

      // Check that the value is serializable
      this._checkSerializable('', value)

      // Wrap this value for use in this jig, mostly so we can claim ownership
      value = this._wrapForImport(this, value)

      // Assign ownership of this value to ourselves
      this._claimOwnership(value)

      // Remove the membrane if there is one and it's not a jig
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
      if (this._shouldRecordRead()) RECORD()._read(this._jig)
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicUpdate () {
    if (this._isAdmin()) return

    return this._captureErrors(() => {
      this._throwIfJigErrors()

      // Updating a inner stored value, even on an intrinsic, is an update
      if (this._shouldRecordUpdate()) RECORD()._update(this._jig)

      if (this._rules._immutable) throw new Error('Immutable')

      // Updates must be performed in one of the jig's methods
      this._checkIfSetInMethod()

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
    if (!this._rules._smartAPI) return
    const stack = RECORD()._stack
    if (stack.length && stack[stack.length - 1]._jig === this._jig) return
    throw new Error('Updates must be performed in a method')
  }

  // --------------------------------------------------------------------------
  // _checkSerializable
  // --------------------------------------------------------------------------

  _checkSerializable (prop, value) {
    if (typeof prop === 'symbol') throw new StateError('Symbol names are not serializable')
    if (!_isSerializable(value)) throw new StateError(`Not serializable: ${_text(value)}`)
    _deepVisit(value, x => { if (!_isSerializable(x)) throw new StateError(`Not serializable: ${_text(x)}`) })
  }

  // --------------------------------------------------------------------------
  // _checkCanGetCreationBinding
  // --------------------------------------------------------------------------

  _checkCanGetCreationBinding (target, prop) {
    // Inner objects don't have bindings. Berry locations aren't mutable.
    if (!this._isCreationBinding(prop)) return

    try {
      // Check location, origin, or nonce. These are assigned by Run.
      if (prop === 'location' || prop === 'origin' || prop === 'nonce') {
        const val = Reflect.get(target, prop)

        // Treat nonce the same as location for determining readability
        const loc = _location(prop === 'nonce' ? target.location : val)

        if (loc.undeployed) throw new StateError('Hint: Sync the jig to deploy it')
        if (loc.error) throw new StateError(`A previous error occurred\n\n${loc.error}`)

        // Native code bindings can always be read
        if (loc.nativeid) return

        // If no txid, then the location is not determined. The jig in a pending commit.
        // Jig code won't encounter this but it protects users from getting temp locs.
        if (!loc.txid) throw new StateError('Hint: Sync the jig to assign it in a transaction')
      }
    } catch (e) {
      throw new Error(`Cannot read ${prop}\n\n${e.message}`)
    }
  }

  // --------------------------------------------------------------------------
  // _checkCanGetUtxoBinding
  // --------------------------------------------------------------------------

  _checkCanGetUtxoBinding (target, prop) {
    // Inner objects don't have bindings. Berry locations aren't mutable.
    if (!this._isUtxoBinding(prop)) return

    try {
      // Check owner or satoshis. These are assigned by users and by Run.
      if (prop === 'owner' || prop === 'satoshis') {
        const val = Reflect.get(target, prop)

        const Unbound = require('../util/unbound')

        // Allow reads even if the value has been changed and is unbound. This is OK
        // because we do not allow it to be changed again, nor deleted, so it will be
        // assigned this value at the end of the transaction and so code can rely on it.
        const undetermined = val instanceof Unbound && typeof val._value === 'undefined'
        if (undetermined) throw new StateError('Hint: Sync the jig to assign it in a transaction')

        const allowNull = true
        if (prop === 'owner') _owner(val instanceof Unbound ? val._value : val, allowNull)
        if (prop === 'satoshis') _satoshis(val instanceof Unbound ? val._value : val, allowNull)
      }
    } catch (e) {
      throw new Error(`Cannot read ${prop}\n\n${e.message}`)
    }
  }

  // --------------------------------------------------------------------------
  // _checkCanSetCreationBinding
  // --------------------------------------------------------------------------

  _checkCanSetCreationBinding (target, prop, value) {
    // Inner objects can have properties with binding names set
    if (!this._isCreationBinding(prop)) return

    // Only Run can set the origin, location and nonce.
    if (prop === 'origin') throw new StateError('Cannot set origin')
    if (prop === 'location') throw new StateError('Cannot set location')
    if (prop === 'nonce') throw new StateError('Cannot set nonce')
  }

  // --------------------------------------------------------------------------
  // _checkCanSetUtxoBinding
  // --------------------------------------------------------------------------

  _checkCanSetUtxoBinding (target, prop, value) {
    // Inner objects can have properties with binding names set
    if (!this._isUtxoBinding(prop)) return

    // Setting owner or satoshis requires the owner to be bound because the owner must be able to
    // to approve of the change. We don't allow changing these bound properties twice in a tx.
    const Unbound = require('../util/unbound')
    const isUnbound = target[prop] instanceof Unbound && target[prop]._value
    if (isUnbound) {
      const unboundHint = 'Hint: Sync the jig to bind it in a transaction'
      throw new StateError(`Cannot set ${prop}\n\n${unboundHint}`)
    }

    // Check the value being set is valid. Users cannot set owners to null, only Run.
    const allowNull = false
    if (prop === 'owner') _owner(value, allowNull)
    if (prop === 'satoshis') _satoshis(value)
  }

  // --------------------------------------------------------------------------
  // _checkCanSetCodeOption
  // --------------------------------------------------------------------------

  _checkCanSetCodeOption (prop, value) {
    if (!this._rules._codeMethods) return
    if (prop === 'sealed') Editor._checkSealedOption(value)
    if (prop === 'upgradable') Editor._checkUpgradableOption(value)
  }

  // --------------------------------------------------------------------------
  // _checkReserved
  // --------------------------------------------------------------------------

  _checkReserved (prop, method) {
    if (!this._rules._reserved) return
    const error = `Cannot ${method} ${prop}: reserved`
    if (_RESERVED_PROPS.includes(prop)) throw new StateError(error)
    if (this._rules._jigMethods && _RESERVED_JIG_METHODS.includes(prop)) throw new StateError(error)
    if (this._rules._codeMethods && _RESERVED_CODE_METHODS.includes(prop)) throw new StateError(error)
    if (this._rules._berryMethods && _RESERVED_BERRY_METHODS.includes(prop)) throw new StateError(error)
  }

  // --------------------------------------------------------------------------
  // _hasPrivateAccess
  // --------------------------------------------------------------------------

  _hasPrivateAccess (prop, apply = false) {
    // Targets without private properties are always accessible
    if (!this._rules._privacy) return true

    // If this doesn't start with an unscore, its accessible
    if (typeof prop !== 'string' || !prop.startsWith('_')) return true

    // Prototype can always be retrieved
    if (prop === '__proto__') return true

    const Jig = require('./jig')
    const Berry = require('./berry')
    const stack = RECORD()._stack

    // Outside of a jig, private properties are always accessible.
    // Private methods however cannot be called even from outside.
    if (!stack.length) return !apply

    // Get the top of the stack
    const accessor = stack[stack.length - 1]._jig

    // For jig code, the current class may access its private properties.
    // Also, any jig instances may call private methods on the jig class.
    if (typeof this._jig === 'function') {
      return accessor === this._jig || accessor.constructor === this._jig
    }

    // Handle jig instances. Other kinds of proxies should not be here
    _assert(this._jig instanceof Jig || this._jig instanceof Berry)

    // For jig instances, jigs of the same jig class may access the private properties.
    // Also, the jig class may access private properties of its instances.
    return accessor.constructor === this._jig.constructor ||
      accessor === this._jig.constructor
  }

  // --------------------------------------------------------------------------
  // _wrapForExport
  // --------------------------------------------------------------------------

  _wrapForExport (value, parentJig, owned, returned, methodPendingMembranes, unclaimedSet = new Set()) {
    // If we've already detected this value is unclaimed, perhaps in a circular data structure,
    // then we should return it directly. Only unclaimed values need special recursive handling.
    if (unclaimedSet.has(value)) return value

    // If there is no parent, then it doesn't need to be wrapped. No protection. This might
    // happen if the value is an intrinsic method. For example, Object.prototype.toString.
    if (!parentJig) return value

    // If this is a primitive type, it can't have a membrane
    if (!this._isObjectType(value)) return value

    // If this is a creation, it needs no wrapping
    if (value instanceof Creation) return value

    // Check if we are within one of our own methods
    const stack = RECORD()._stack
    const inside = stack.length && stack[stack.length - 1]._jig === this._jig

    // If this object is used in the method set it was created, just return it
    if (inside && PENDING_MEMBRANES.has(value)) return value

    // If leaving the jig via a return value, and this value is unclaimed, then return it
    // directly. Some inner objects may be claimed, so we have to traverse down, but this
    // allows jigs to return a value they never set and it not be owned by them.
    const unclaimed = !inside && returned && !methodPendingMembranes.has(value)

    if (unclaimed) {
      unclaimedSet.add(value)

      _sudo(() => {
        const replacer = x => this._wrapForExport(x, parentJig, owned, returned,
          methodPendingMembranes, unclaimedSet)

        shallowReplace(value, replacer)
      })

      return value
    }

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
    // Unowned membranes don't need wrapping because their state does not
    // depend on secure inputs and outputs.
    if (!thisMembrane._rules._smartAPI) return value

    // Determine if we are crossing a boundary from another jig to this one
    const stack = RECORD()._stack
    const crossing = !stack.length || stack[stack.length - 1]._jig !== thisMembrane._jig

    // If not crossing, then we're an internal method calling ourself. No import.
    if (!crossing) return value

    // If this is a primitive type, it needs no wrapping
    if (!thisMembrane._isObjectType(value)) return value

    // If this is a creation, it also needs no wrapping
    if (value instanceof Creation) return value

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
      if (value instanceof Creation) return false

      const membrane = Proxy2._getHandler(value)
      if (membrane) {
        // If we already own it, nothing to do
        if (membrane._rules._parentJig === this._jig) return false

        // If there is a membrane, we can only claim it if it is unowned
        if (membrane._rules._parentJig) {
          throw new StateError(`Ownership violation\n\n${_text(this._jig)} claimed ${_text(value)} owned by ${_text(membrane._rules._parentJig)}`)
        }

        // If this a COW object, then make a copy now
        membrane._copyOnWriteIfNecessary()

        // Assign ourself as owner with all our rules
        const method = typeof value === 'function'
        const owned = true
        membrane._rules = Rules._childProperty(this._jig, method, owned)
        membrane._jig = this._jig
      } else {
        // If there is no membrane, then we're dealing with a newly created object
        // in a jig method or an object passed in from the user realm.
        if (RECORD()._stack.length) PENDING_MEMBRANES.add(value)
      }
    })
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
      if (!(parentJig instanceof Creation)) parentJig = null

      // Because the prototype chain is not membraned, we record reads manually
      if (parentJig && this._shouldRecordRead() && Proxy2._getHandler(parentJig)._shouldRecordRead()) {
        RECORD()._read(parentJig)
      }
    }

    return parentJig
  }

  // --------------------------------------------------------------------------
  // Misc Helpers
  // --------------------------------------------------------------------------

  _isAdmin () { return this._rules._admin && _admin() }
  _isCodeDeps (prop) { return this._rules._codeMethods && prop === 'deps' }
  _isCodeMethod (prop) { return this._rules._codeMethods && CODE_METHOD_NAMES.includes(prop) }
  _isProtectedJigMethod (prop) { return this._rules._jigMethods && PROTECTED_JIG_METHOD_NAMES.includes(prop) }
  _isProtectedBerryMethod (prop) { return this._rules._berryMethods && PROTECTED_BERRY_METHOD_NAMES.includes(prop) }
  _shouldRecordRead () { return this._rules._recordReads && RECORD()._stack.length }
  _shouldRecordUpdate () { return this._rules._recordUpdates && RECORD()._stack.length }
  _isCreationBinding (prop) { return this._rules._creationBindings && _CREATION_BINDINGS.includes(prop) }
  _isUtxoBinding (prop) { return this._rules._utxoBindings && _UTXO_BINDINGS.includes(prop) }
  _isObjectType (prop) { return prop && (typeof prop === 'object' || typeof prop === 'function') }
  _isBasicType (value) {
    const basicTypes = ['undefined', 'boolean', 'number', 'string', 'symbol']
    return basicTypes.includes(typeof value) || value === null
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function getLatestMethod (thisArg, target, proxy, jig) {
  const name = target.name

  // No this, always allowed
  if (!thisArg) return [target, jig]

  // Only jigs can have jig methods called on them
  if (!(thisArg instanceof Creation)) return [null, null]

  // If a method of this name is not on the this target, then we can't call it
  if (!thisArg[name] || typeof thisArg[name] !== 'function') return [null, null]

  // If this is our method, then we can call it
  if (thisArg[name] === proxy) return [target, jig]

  // If the method was upgraded but it is still part of the same class, or parent class if not
  // overridden, then we can call it
  let thisContainer = thisArg
  while (thisContainer) {
    if (_hasOwnProperty(thisContainer, name)) break
    thisContainer = Object.getPrototypeOf(thisContainer)
  }
  _assert(thisContainer)
  thisContainer = typeof thisContainer === 'function' ? thisContainer : thisContainer.constructor
  if (_sudo(() => thisContainer.origin === jig.origin)) {
    _sudo(() => {
      if (thisContainer.nonce < jig.nonce) throw new StateError('Method time travel')
    })
    return [Proxy2._getTarget(thisArg[name]), thisContainer]
  }

  // If we are in our jig already, and this method is somewhere in our class chain, it's OK to call
  const stack = RECORD()._stack
  if (stack.length < 2 || stack[stack.length - 2]._jig !== thisArg) return [null, null]

  let prototype = Object.getPrototypeOf(thisArg)
  while (prototype) {
    const prototypeMethod = _getOwnProperty(prototype, name)
    if (prototypeMethod === proxy) return [target, jig]

    // If the method was upgraded on a parent but its still part of the same class, we can call it
    const prototypeMethodContainer = typeof prototype === 'function' ? prototype : prototype.constructor
    if (prototypeMethod && _sudo(() => prototypeMethodContainer.origin === jig.origin)) {
      _sudo(() => {
        if (prototypeMethodContainer.nonce < jig.nonce) throw new StateError('Method time travel')
      })
      return [Proxy2._getTarget(prototypeMethod), prototypeMethodContainer]
    }

    prototype = Object.getPrototypeOf(prototype)
  }

  // Otherwise, it isn't allowed
  return [null, null]
}

// ------------------------------------------------------------------------------------------------

function prepareArgs (thisArg, args) {
  const Code = require('./code')

  // If thisArg is already code, make sure its deployed
  if (thisArg instanceof Code) Editor._get(thisArg)._deploy()

  // Clone the value using sandbox intrinsics
  const clonedArgs = _deepClone(args, SI, x => {
    if (typeof x === 'function' && !(x instanceof Creation)) {
      const C = Editor._newCode(x)
      Editor._get(C)._deploy()
      return C
    }

    // If x is already code, make sure its deployed
    if (x instanceof Code) Editor._get(x)._deploy()
  })

  _unifyForMethod([thisArg, clonedArgs], [thisArg])

  return clonedArgs
}

// ------------------------------------------------------------------------------------------------

function shallowReplace (x, replacer) {
  Object.keys(x).forEach(name => {
    _setOwnProperty(x, name, replacer(x[name]))
  })

  if (_isBasicSet(x)) {
    const values = Array.from(x.values())
    x.clear()
    values.forEach(value => x.add(replacer(value)))
  }

  if (_isBasicMap(x)) {
    const entries = Array.from(x.entries())
    x.clear()
    entries.forEach(([key, value]) => x.set(replacer(key), replacer(value)))
  }
}

// ------------------------------------------------------------------------------------------------

Membrane._prepareArgs = prepareArgs

module.exports = Membrane
