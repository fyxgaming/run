/**
 * membrane.js
 *
 * A flexible proxy handler for jigs, code, berries, their owned inner objects, and method args.
 */

const { _admin, _sudo } = require('../util/admin')
const {
  _assert, _text, _hasOwnProperty, _setOwnProperty, _serializable, _serializableValue,
  _RESERVED_PROPS, _RESERVED_CODE_METHODS, _RESERVED_JIG_METHODS, _RESERVED_BERRY_METHODS,
  _FINAL_CODE_PROPS, _FINAL_JIG_PROPS, _FINAL_BERRY_PROPS,
  _getOwnProperty, _deterministicCompareKeys, _basicSet, _basicMap, _defined
} = require('../util/misc')
const { _location, _owner, _satoshis, _CREATION_BINDINGS, _UTXO_BINDINGS } = require('../util/bindings')
const { _deepClone, _deepVisit, _deepReplace } = require('../util/deep')
const Sandbox = require('../sandbox/sandbox')
const SI = Sandbox._intrinsics
const HI = Sandbox._hostIntrinsics
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
const STACK = () => RECORD()._stack

const CODE_METHOD = name => _sudo(() => Object.getPrototypeOf(require('./code').prototype)[name])

let CODE_METHOD_NAME_CACHE
function CODE_METHOD_NAMES () {
  if (!CODE_METHOD_NAME_CACHE) {
    const proto = _sudo(() => Object.getPrototypeOf(require('./code').prototype))
    CODE_METHOD_NAME_CACHE = Object.getOwnPropertyNames(proto).concat(Object.getOwnPropertySymbols(proto))
  }
  return CODE_METHOD_NAME_CACHE
}

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

class Membrane {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  constructor (target, rules = new Rules()) {
    // Make sure the target really is a target
    _assert(!Proxy2._getTarget(target))

    // The proxy around the target that uses this membrane as its handler
    this._proxy = new Proxy2(target, this)

    // The rules for the membrane the determine the behavior below
    this._rules = rules

    // Proxies for inner objects so that we don't create new membranes
    this._childMembranes = new WeakMap() // Target -> Proxy

    // Objects that were assigned to the creation in one of its methods that is not yet finished.
    // They are owned by the creation, but any gets should not return a proxy, because they
    // need to match how they were assigned. Once all the creation methods complete, this
    // set will be finalized and cleared, and future "gets" from other creations or the creation
    // itself will be membranes.
    this._pendingMembranes = new Set() // Target

    // Determine the creation that the target is owned by
    if (!_defined(rules._creation)) {
      this._creation = this._proxy
    } else {
      this._creation = rules._creation
    }

    // If we are part of a creation, copy its child and pending membranes for ease of access
    if (rules._creation) {
      const creationMembrane = Proxy2._getHandler(rules._creation)
      this._pendingMembranes = creationMembrane._pendingMembranes
      this._childMembranes = creationMembrane._childMembranes
    }

    // Return the proxy, not the membrane/handler, to the user
    return this._proxy
  }

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  _apply (target, thisArg, args) {
    if (this._isAdmin()) return Reflect.apply(target, thisArg, args)

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Static functions clear thisArg. It appears to be set by the sandbox. However, undefined
      // thisArg will be replaced with the global when in non-strict mode, so it is important
      // that all membraned functions operate in strict mode.
      // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call`
      if (this._rules._thisless) thisArg = undefined

      // Calling a function requires a read of the code jig for the function
      if (this._shouldRecordRead()) RECORD()._read(this._creation)

      // Distinguish betweent the target and the function rules. Both matter in methods.
      let thisArgMembrane = Proxy2._getHandler(thisArg)
      let thisArgRules = thisArgMembrane && thisArgMembrane._rules
      const functionRules = this._rules

      // Check that this method isn't disabled, like happens with init() for jigs
      const disabledMethods = thisArgMembrane && thisArgMembrane._rules._disabledMethods
      const disabled = disabledMethods && disabledMethods.includes(target.name)
      if (disabled) throw new StateError(`${target.name} disabled`)

      // Detect pass-through functions, which do not wrap arguments or get added to the record.
      // Pass-through functions might be sidekick functions. This may also be be init() on the
      // jig itself. If there's no init() method on a jig, then by design init() is pass-through
      // and the top-level action is the "new" action. The same is true for init() on berries and
      // the pluck action. Thsi is because the base init() method on Jig and other native code
      // does not record calls.
      let passThrough = !thisArgMembrane || !thisArgRules._recordableTarget || !functionRules._recordCalls

      // If pass through, see if we can make it not pass through! This might happen if
      // we are calling a static function, like MyToken.mint, on an uninstalled class.
      if (passThrough && typeof thisArg === 'function') {
        thisArg = Editor._lookupOrCreateCode(thisArg)
        thisArgMembrane = Proxy2._getHandler(thisArg)
        thisArgRules = thisArgMembrane && thisArgMembrane._rules
        passThrough = !thisArgMembrane || !thisArgRules._recordableTarget || !functionRules._recordCalls
      }

      // We can only call recordable calls on other jigs
      if (functionRules._recordCalls && !thisArgMembrane) {
        throw new Error(`Cannot call ${target.name} on ${_text(thisArg)}`)
      }

      // If this method is pass through, then we run it directly. This is used for
      // sidekick code and inner methods. They don't need special handling. For inner
      // property methods, like a.arr.find(...), any gets will be handled by _get and
      // _intrinsicOut, which will have ownership protection.
      if (passThrough) return Reflect.apply(target, thisArg, args)

      // Detect when we are entering this creation from outside the sandbox or from another creation
      const crossing = !thisArgMembrane._inside()

      return RECORD()._capture(() => {
        // If entering the creation from outside, deep clone the args and unify worldview.
        // We only need to do this once at the top level. Inner args will already be prepared.
        if (!STACK().length) args = prepareArgs(thisArg, args)

        // Even internal method args need to have serializable args
        if (STACK().length) checkSerializable('', args)

        // Check that we have access. Private methods cannot be called even from outside.
        thisArgMembrane._checkNotPrivate(target.name, 'call')

        // COW the args. Even if they are from the outside and already cloned. Because this
        // protects our top-level action's args.
        const callArgs = crossing ? thisArgMembrane._cow(args) : args

        // We will wrap the return value at the end
        let ret = null

        try {
          // Push a call action onto the stack and then call the method
          const Action = require('./action')
          Action._call(thisArg, target.name, args, () => {
            // Get the method on the target object from its name. This also checks that the target
            // method is the same. We do this to allow for class unification on jig objects. As
            // long as a function with the same name exists, we allow it to be called.
            const [latestTarget, latestTargetCreation] =
              getLatestMethod(thisArg, target, this._proxy, this._creation)
            if (!latestTarget) throw new StateError(`Cannot call ${target.name} on ${_text(thisArg)}`)

            // Calling a function requires a read of the code jig being called
            // We perform this again in case it wasn't captured above.
            if (this._shouldRecordRead()) RECORD()._read(latestTargetCreation)

            // Perform the method
            ret = Reflect.apply(latestTarget, thisArg, callArgs)
          })

          // Async methods are not supported. Even though the serializability check will catch
          // this, we check for it specifically here to provide a better error message.
          const wasAsyncMethod = ret instanceof SI.Promise || ret instanceof HI.Promise
          if (wasAsyncMethod) throw new StateError('async methods not supported')

          // Check that the return value is serializable as a precaution before wrapping
          // The method may be returning anything. Wrappers won't catch it all right away.
          checkSerializable('', ret)

          // The pending membranes may have properties that need to be claimed, or unserializable
          // properties that are really uncaught errors. Handle both when we cross back.
          if (crossing) thisArgMembrane._finalizePendingMembranes()

          // As a safety check, as we are leaving this jig, check that any internal properties are
          // either targets, or they are creations. No proxies should be set internally. Because
          // otherwise, this will affect state generation. When confidence is 100%, we'll remove.
          if (crossing) {
            _deepVisit(Proxy2._getTarget(thisArg), x => {
              _assert(x instanceof Creation || !Proxy2._getTarget(x))
              return !(x instanceof Creation) // No traversing into other jigs
            })
          }

          // Wrap the return value so the caller knows we own it
          return this._export(ret)
        } catch (e) {
          thisArgMembrane._pendingMembranes = new Set()

          throw e
        }
      })
    })
  }

  // --------------------------------------------------------------------------

  // Called when constructing arbitrary objects, and also jigs and berries. Construct is
  // pass-through. Jigs and berries have additional logic in their init() to become actions.

  _construct (target, args, newTarget) {
    if (this._isAdmin()) return Reflect.construct(target, args, newTarget)

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Constructing an instance (a jig, a berry, or an arbitrary object), requires a read
      // of the class being constructed. If that constructor calls super, then it will read
      // the parent too, but to instantiate we only need to read the current class.
      if (this._shouldRecordRead()) RECORD()._read(this._creation)

      // Construct is passed through. We do not record constructions for replayability.
      // That is left up to the individual classes being created to record. For example,
      // the buit-in Jig class records the creation of new jigs, not this membrane.
      return Reflect.construct(target, args, newTarget)
    })
  }

  // --------------------------------------------------------------------------

  _defineProperty (target, prop, desc) {
    if (this._isAdmin()) return Reflect.defineProperty(target, prop, desc)

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Prototype cannot be set directly
      if (prop === '__proto__') throw new Error('define __proto__ disabled')

      // Defining a property requires an update to the jig
      if (this._shouldRecordUpdate()) RECORD()._update(this._creation)

      // On Chrome and Firefox, properties are copied from their existing descriptor.
      // On Safari, properties must be specified. We require Safari's conservative behavior.

      // Only allow configurable, writable, enumerable value properties
      checkValidDescriptor(desc)

      // Code, jig, and berry methods are permanent and cannot be overridden
      if (this._isFinalProp(prop)) throw new Error(`Cannot define ${prop}`)

      // Ensure the the property can be stored in transactions and the state cache
      checkSerializable(prop, desc.value)

      // If this is a code option, check that it is a valid value
      this._checkCanSetCodeOption(prop, desc.value)

      // Only some bindings may be set by jig code
      this._checkCanSetCreationBinding(target, prop, desc.value)
      this._checkCanSetUtxoBinding(target, prop, desc.value)

      // Some property names may be reserved for later
      this._checkNotReserved(prop, 'define')

      // Check if we can set a private property
      this._checkNotPrivate(prop, 'define')

      // Enforce immutability for static and native code
      if (this._rules._immutable) throw new Error('defineProperty disabled')

      // Updates must be performed in one of the jig's methods
      this._checkIfSetInMethod()

      // Clone ourselves if necessary since this is a change
      target = this._copyOnWriteIfNecessary() || target

      // Assign ownership of this value to ourselves, which may involve a copy
      desc.value = this._claim(desc.value)

      // When bindings are set, they are unbound until the record is committed
      const Unbound = require('../util/unbound')
      if (this._isUtxoBinding(prop) && !(desc.value instanceof Unbound)) {
        desc.value = new Unbound(desc.value)
      }

      // Define the property
      return Reflect.defineProperty(target, prop, desc)
    })
  }

  // --------------------------------------------------------------------------

  _deleteProperty (target, prop) {
    if (this._isAdmin()) return Reflect.deleteProperty(target, prop)

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      if (prop === '__proto__') throw new Error('delete __proto__ disabled')

      // Deleting a property requires an update to the jig
      if (this._shouldRecordUpdate()) RECORD()._update(this._creation)

      // Code, jig, and berry methods are permanent by design
      if (this._isFinalProp(prop)) throw new Error(`Cannot delete ${prop}`)

      // Bindings cannot be deleted by design
      if (this._isCreationBinding(prop)) throw new Error(`Cannot delete ${prop}`)
      if (this._isUtxoBinding(prop)) throw new Error(`Cannot delete ${prop}`)

      // Private properties can only be deleted if we have access
      this._checkNotPrivate(prop, 'delete')

      // Some property names may be reserved for later
      this._checkNotReserved(prop, 'delete')

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

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Code methods are returned directly. They are not reads since they don't change.
      // They also cannot be overriden, so we return them directly. The one exception
      // is Symbol.hasInstance, which our native Jig class overrides.
      const hasInstanceOverride = prop === Symbol.hasInstance &&
        target[Symbol.hasInstance] !== SI.Function.prototype[Symbol.hasInstance] &&
        target[Symbol.hasInstance] !== HI.Function.prototype[Symbol.hasInstance]
      if (this._isCodeMethod(prop) && !hasInstanceOverride) return CODE_METHOD(prop)

      // Unoverridable code methods are not counted as reads
      if (this._isFinalCodeProp(prop) && _RESERVED_CODE_METHODS.includes(prop)) {
        const Code = require('./code')
        let method = Reflect.get(target, prop, receiver)
        method = Proxy2._getHandler(Code)._addParentRules(method)
        return method
      }

      // Unoverridable jig methods (sync and load) are not counted as reads
      if (this._isFinalJigProp(prop) && _RESERVED_JIG_METHODS.includes(prop)) {
        const Jig = require('./jig')
        let method = Reflect.get(target, prop, receiver)
        method = Proxy2._getHandler(Jig)._addParentRules(method)
        return method
      }

      // Unoverridable berry methods are not counted as reads
      if (this._isFinalBerryProp(prop) && _RESERVED_BERRY_METHODS.includes(prop)) {
        const Berry = require('./berry')
        let method = Reflect.get(target, prop, receiver)
        method = Proxy2._getHandler(Berry)._addParentRules(method)
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
      if (this._shouldRecordRead()) RECORD()._read(this._creation)

      // Bindings are not always readable
      this._checkCanGetCreationBinding(target, prop)
      this._checkCanGetUtxoBinding(target, prop)

      // Check if we can access if it is a private property
      this._checkNotPrivate(prop, 'get')

      // Some property names may be reserved for later.
      // Reading them before they exist might break consensus.
      this._checkNotReserved(prop, 'get')

      // Read the value
      let value = Reflect.get(target, prop, receiver)

      // Basic types are returned directly
      if (isBasicType(value)) return value

      // Creations are returned directly
      if (value instanceof Creation) return value

      // If this is an unbound binding, return its actual inner value
      const Unbound = require('../util/unbound')
      const isUnboundBinding = this._isUtxoBinding(prop) && value instanceof Unbound
      if (isUnboundBinding) value = value._value

      // Get the creation this property is on. This will trigger reads.
      const creation = this._getOwnerCreation(prop)
      const creationMembrane = creation && Proxy2._getHandler(creation)

      // Wrap this object with a membrane that enforces parent rules
      const claimed = true
      value = creationMembrane ? creationMembrane._export(value, claimed) : value

      return value
    })
  }

  // --------------------------------------------------------------------------

  _getOwnPropertyDescriptor (target, prop) {
    if (this._isAdmin()) return Reflect.getOwnPropertyDescriptor(target, prop)

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Record this read
      if (this._shouldRecordRead()) RECORD()._read(this._creation)

      // Function prototypes and constructors must be returned directly. No wrapping.
      // Symbol properties too because they aren't settable by the user.
      const isFunctionPrototype = typeof target === 'function' && prop === 'prototype'
      const isConstructor = prop === 'constructor'
      const isSymbolProperty = typeof prop === 'symbol'
      const isDirectReturn = isFunctionPrototype || isConstructor || isSymbolProperty
      if (isDirectReturn) return Reflect.getOwnPropertyDescriptor(target, prop)

      // Props both final and reserved are never owned. They come from above.
      if (this._isFinalCodeProp(prop) && _RESERVED_CODE_METHODS.includes(prop)) return undefined
      if (this._isFinalJigProp(prop) && _RESERVED_JIG_METHODS.includes(prop)) return undefined
      if (this._isFinalBerryProp(prop) && _RESERVED_BERRY_METHODS.includes(prop)) return undefined

      // Bindings are not always readable
      this._checkCanGetCreationBinding(target, prop)
      this._checkCanGetUtxoBinding(target, prop)

      // Check if we can access if it is a private property
      this._checkNotPrivate(prop, 'get descriptor for')

      // Some property names may be reserved for later.
      // Reading them before they exist might break consensus.
      this._checkNotReserved(prop, 'get descriptor for')

      // Read the descriptor
      const desc = Reflect.getOwnPropertyDescriptor(target, prop)
      if (!desc) return

      // Basic types are returned directly
      if (isBasicType(desc.value)) return desc

      // Creations are returned directly
      if (desc.value instanceof Creation) return desc

      // If this is an unbound binding, return its actual inner value
      const Unbound = require('../util/unbound')
      const isUnboundValue = this._isUtxoBinding(prop) && desc.value instanceof Unbound
      if (isUnboundValue) desc.value = desc.value._value

      // Wrap this object with a membrane that enforces parent rules
      const claimed = true
      desc.value = this._export(desc.value, claimed)

      return desc
    })
  }

  // --------------------------------------------------------------------------

  _getPrototypeOf (target) {
    if (this._isAdmin()) return Reflect.getPrototypeOf(target)

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Getting a prototype is a read
      if (this._shouldRecordRead()) RECORD()._read(this._creation)

      return Reflect.getPrototypeOf(target)
    })
  }

  // --------------------------------------------------------------------------

  _has (target, prop) {
    if (this._isAdmin()) return Reflect.has(target, prop)

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Checking a property is a read
      if (this._shouldRecordRead()) RECORD()._read(this._creation)

      // Code, jig, and berry methods are part of the object, but not owned properties
      if (this._isFinalProp(prop)) return true

      // Check if we can access private properties
      this._checkNotPrivate(prop, 'check')

      // Some property names may be reserved for later, and no logic should depend on them
      this._checkNotReserved(prop, 'check')

      return Reflect.has(target, prop)
    })
  }

  // --------------------------------------------------------------------------

  _isExtensible (target) {
    if (this._isAdmin()) return Reflect.isExtensible(target)

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Membrane targets are marked extensible by design. Immutability, if enabled, is enforced
      // in the membrane, not JavaScript, because non-extensibility can make JavaScript annoying.
      return true
    })
  }

  // --------------------------------------------------------------------------

  _ownKeys (target) {
    if (this._isAdmin()) return Reflect.ownKeys(target)

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Getting key values is a read
      if (this._shouldRecordRead()) RECORD()._read(this._creation)

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

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // This membrane does not support freezing the underlying object
      throw new Error('preventExtensions disabled')
    })
  }

  // --------------------------------------------------------------------------

  _set (target, prop, value, receiver) {
    // Using Reflect.set doesn't work. Parent proxies will intercept for classes.
    if (this._isAdmin()) { _setOwnProperty(target, prop, value); return true }

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Prototype cannot be set directly
      if (prop === '__proto__') throw new Error('set __proto__ disabled')

      // A creation may be trying to override a non-jig child class's sets
      if (receiver !== this._proxy) {
        _setOwnProperty(receiver, prop, value)
        return true
      }

      // Setting a value causes a spend
      if (this._shouldRecordUpdate()) RECORD()._update(this._creation)

      // Code, jig, and berry methods are permanent
      if (this._isFinalProp(prop)) throw new Error(`Cannot set ${prop}`)

      // Ensure the the property can be stored in transactions and the state cache
      checkSerializable(prop, value)

      // If this is a code option, check that it is a valid value
      this._checkCanSetCodeOption(prop, value)

      // Only some bindings may be set by jig code
      this._checkCanSetCreationBinding(target, prop, value)
      this._checkCanSetUtxoBinding(target, prop, value)

      // Some property names may be reserved for later
      this._checkNotReserved(prop, 'set')

      // Check if we can set a private property
      this._checkNotPrivate(prop, 'set')

      // Enforce immutability for static and native code
      if (this._rules._immutable) throw new Error('set disabled')

      // Updates must be performed in one of the jig's methods
      this._checkIfSetInMethod()

      // Clone ourselves if necessary since this is a change
      target = this._copyOnWriteIfNecessary() || target

      // Assign ownership this to ourselves, which may involve a copy
      value = this._claim(value)

      // When bindings are set, they are unbound until the record is committed
      const Unbound = require('../util/unbound')
      if (this._isUtxoBinding(prop) && !(value instanceof Unbound)) {
        value = new Unbound(value)
      }

      // Using Reflect.set doesn't work. Parent proxies will intercept for classes.
      _sudo(() => _setOwnProperty(target, prop, value))

      return true
    })
  }

  // --------------------------------------------------------------------------

  _setPrototypeOf (target, prototype) {
    if (this._isAdmin()) return Reflect.setPrototypeOf(target, prototype)

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Changing prototypes is something only Run can do by design
      throw new Error('setPrototypeOf disabled')
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicGetMethod () {
    if (this._isAdmin()) return

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Getting a method, even on an intrinsic, is a read
      if (this._shouldRecordRead()) RECORD()._read(this._creation)
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicOut (value) {
    if (this._isAdmin()) return value

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Basic types are returned directly
      if (isBasicType(value)) return value

      // Creations are returned directly
      if (value instanceof Creation) return value

      // Wrap this object with a membrane that enforces parent rules
      const claimed = true
      value = this._export(value, claimed)

      return value
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicIn (value) {
    if (this._isAdmin()) return value

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Check that the value is serializable
      checkSerializable('', value)

      // Assign ownership of this value to ourselves, which may involve a copy
      value = this._claim(value)

      return value
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicRead () {
    if (this._isAdmin()) return

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Getting a inner stored value, even on an intrinsic, is a read
      if (this._shouldRecordRead()) RECORD()._read(this._creation)
    })
  }

  // --------------------------------------------------------------------------

  _intrinsicUpdate () {
    if (this._isAdmin()) return

    return this._captureRecordErrors(() => {
      this._throwCreationError()

      // Updating a inner stored value, even on an intrinsic, is an update
      if (this._shouldRecordUpdate()) RECORD()._update(this._creation)

      if (this._rules._immutable) throw new Error('Immutable')

      // Updates must be performed in one of the jig's methods
      this._checkIfSetInMethod()

      // Clone the target if necessary
      this._copyOnWriteIfNecessary()
    })
  }

  // --------------------------------------------------------------------------
  // _throwCreationError
  // --------------------------------------------------------------------------

  // Every trap checks if the creation in an error state from a prior action. A creation will go
  // into an error state if the user fails to sync and there was an error while publishing.
  _throwCreationError () {
    // No creation? No bindings. No location. No error.
    if (!this._creation) return

    const creationTarget = Proxy2._getTarget(this._creation)

    // If location is not defined, then we are setting up the creation and not in an error state.
    // For example, toString() should still be allowed to be called when setting up.
    if (!_hasOwnProperty(creationTarget, 'location')) return

    // Undeployed jigs can still be used because they will be deployed after the action completes.
    const { error, undeployed } = _location(creationTarget.location)
    if (error && !undeployed) throw new Error(error)
  }

  // --------------------------------------------------------------------------
  // _captureRecordErrors
  // --------------------------------------------------------------------------

  // Handler errors should not be caught by internal creation code because they are not part of
  // consensus. If they happen, we detect them ourselves to prevent them from being swallowed
  // and always rethrow them within the current action.
  _captureRecordErrors (f) {
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
    if (this._inside()) return
    throw new Error(`Attempt to update ${_text(this._creation)} outside of a method`)
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

        if (_defined(loc.undeployed)) throw new Error('Hint: Sync the jig to deploy it')
        if (_defined(loc.error)) throw new Error(`A previous error occurred\n\n${loc.error}`)

        // Native code bindings can always be read
        if (_defined(loc.native)) return

        // If no txid, then the location is not determined.  The jig is in a pending commit.
        // Jig code won't encounter this but it protects users from getting temp locs.
        if (!_defined(loc.txid)) throw new Error('Hint: Sync the jig to assign it in a transaction')

        // Partial locations are unreadable
        if (_defined(loc.berry) && !_defined(loc.hash)) throw new Error()
      }
    } catch (e) {
      throw new Error(`Cannot read ${prop}${e.message ? '\n\n' + e.message : ''}`)
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
  // _checkNotReserved
  // --------------------------------------------------------------------------

  _checkNotReserved (prop, method) {
    if (!this._rules._reserved) return
    const throwReservedError = () => {
      const error = `Cannot ${method} ${typeof prop === 'symbol' ? prop.toString() : prop}: reserved`
      throw new StateError(error)
    }
    if (_RESERVED_PROPS.includes(prop)) throwReservedError()
    if (this._rules._jigMethods && _RESERVED_JIG_METHODS.includes(prop)) throwReservedError()
    if (this._rules._codeMethods && _RESERVED_CODE_METHODS.includes(prop)) throwReservedError()
    if (this._rules._berryMethods && _RESERVED_BERRY_METHODS.includes(prop)) throwReservedError()
  }

  // --------------------------------------------------------------------------
  // _checkNotPrivate
  // --------------------------------------------------------------------------

  _checkNotPrivate (prop, method) {
    const calling = method === 'call'
    const type = calling ? 'method' : 'property'
    const noAccess = !this._hasPrivateAccess(prop, calling)
    if (noAccess) throw new Error(`Cannot ${method} private ${type} ${prop}`)
  }

  // --------------------------------------------------------------------------
  // _hasPrivateAccess
  // --------------------------------------------------------------------------

  _hasPrivateAccess (prop, calling = false) {
    // Targets without private properties are always accessible
    if (!this._rules._privacy) return true

    // If this doesn't start with an unscore, its accessible
    if (typeof prop !== 'string' || !prop.startsWith('_')) return true

    // Prototype can always be retrieved
    if (prop === '__proto__') return true

    const Jig = require('./jig')
    const Berry = require('./berry')
    const stack = STACK()

    // Outside of a jig, private properties are always accessible.
    // Private methods however cannot be called even from outside.
    if (!stack.length) return !calling

    // Get the top of the stack
    const accessor = stack[stack.length - 1]._creation

    // For jig code, the current class may access its private properties.
    // Also, any jig instances may call private methods on the jig class,
    // because they share the same code.
    if (typeof this._creation === 'function') {
      return accessor === this._creation || accessor.constructor === this._creation
    }

    // Handle jig and berry instances. Other kinds of proxies should not be here.
    _assert(this._creation instanceof Jig || this._creation instanceof Berry)

    // For jig instances, jigs of the same jig class may access the private properties.
    // Also, the jig class may access private properties of its instances. Same for berries.
    return accessor.constructor === this._creation.constructor ||
      accessor === this._creation.constructor
  }

  // --------------------------------------------------------------------------
  // _export
  // --------------------------------------------------------------------------

  _export (value, claimed = undefined, unclaimedSet = new Set()) {
    // If this is a primitive type, it can't have a membrane
    if (!isObjectType(value)) return value

    // If this is a creation, it needs no additional wrapping
    if (value instanceof Creation) return value

    // If we've already detected this value is unclaimed, perhaps in a circular data structure,
    // then we should return it directly. Claimed values will not be recursing this way.
    if (unclaimedSet.has(value)) return value

    // Get whether we've already claimed this value, pending or no.
    const status = this._claimStatus(value, claimed)

    // If this value is unclaimed, then we'll leave it intact, but we need to check inner objects
    // that might have gone undetected and if any are claimed then wrap them. Shallow replace is
    // essentially breadth-first traversal, which is what we want. We want to early-out as soon
    // as we hit a claimed object to wrap, because it'll wrap its sub-objects.
    if (!status._claimed) {
      unclaimedSet.add(value)
      const wrapInner = x => this._export(x, claimed, unclaimedSet)
      _sudo(() => shallowReplace(value, wrapInner))
      return value
    }

    // If this was just created and claimed, and we're still inside the method that created it,
    // then don't add a membrane. This ensures the following:
    //
    //    method() {
    //      const x = { }       // create local
    //      this.x = x          // claim it
    //      x === this.x        // true
    //    }
    //
    const exportingInside = this._inside()
    if (exportingInside && status._pending) return value

    // Claimed and not pending. Add our rules.
    return this._addParentRules(value)
  }

  // --------------------------------------------------------------------------
  // _addParentRules
  // --------------------------------------------------------------------------

  _addParentRules (value) {
    // If this value is already wrapped, then we won't wrap it again
    if (Proxy2._getTarget(value)) return value

    // If we've already created a membrane for this jig, return that one
    if (this._childMembranes.has(value)) return this._childMembranes.get(value)

    // Create a new membrane for this value
    const method = typeof value === 'function'
    const rules = Rules._childProperty(this._creation, method)
    const membrane = new Membrane(value, rules)

    // Save the membrane to avoid dedups
    this._childMembranes.set(value, membrane)

    return membrane
  }

  // --------------------------------------------------------------------------
  // _finalizePendingMembranes
  // --------------------------------------------------------------------------

  _finalizePendingMembranes () {
    // Walk through all inner properties of the pending membranes and make sure
    // their values are allowed, performing the same checks we would do in "set".
    // This has to be done at the end of a method because for pending membranes the
    // user is able to directly set values without checks and we can't stop that then.
    _sudo(() => _deepReplace(this._pendingMembranes, (x, recurse) => {
      // x must be serializable on its own. Ignore deep serializability, because deepReplace.
      if (!_serializableValue(x)) throw new Error(`Not serializable: ${_text(x)}`)

      // Primitives are always safe
      if (isBasicType(x)) return

      // Check that the object has only valid names - no reserved, symbols, getters, etc.
      checkValidPropFields(x)

      // Creations are left intact, and we don't recurse into them, because
      // we are only considering pending membranes on the current jig.
      if (x instanceof Creation) { recurse(false); return }

      // Non-proxied objects are left intact, but we have to traverse to check their inners.
      // These would be objects created or unclaimed from another jig, and then assigned in the
      // current method.
      const xmembrane = Proxy2._getHandler(x)
      if (!xmembrane) { return }

      // We know it is proxied, either from us, from another jig, or as a cow arg.
      const target = Proxy2._getTarget(x)

      // By having a membrane, one of our invariants is that we know the target was already
      // checked for serializability. Therefore, we don't need to recurse.
      recurse(false)

      // If its ours, remove the membrane and assign. We only store targets.
      if (xmembrane._rules._creation === this._creation) return target

      // The creation is not us. It may be cow arg, or a property from another jig, but in
      // both cases the assignment to ourselves should make us a clone. Any pending membranes
      // that were assigned to the args will not be cloned.
      return _deepClone(target, SI, y => this._claimStatus(y)._pending ? y : undefined)
    }))

    // Reset for next time
    this._pendingMembranes = new Set()
  }

  // --------------------------------------------------------------------------
  // _claimStatus
  // --------------------------------------------------------------------------

  _claimStatus (value, claimed) {
    // Cow args do not have creations and are not claimed
    const membrane = Proxy2._getHandler(value)
    if (membrane && !membrane._rules._creation) return { _claimed: false, _pending: false }

    // Full claimed objects will have membranes. This membrane may be ours if we retrieved it
    // in a function, but it also not be ours. We are OK with that. It'll protect itself.
    if (membrane) return { _claimed: true, _pending: false }

    // Return claimed and pending membranes we know about. We might not know them all.
    const pendingClaim = this._pendingMembranes.has(value)
    if (pendingClaim) return { _claimed: true, _pending: true }

    // We may have assigned to a pending claim. The assigned value might be a naked value, a
    // property of another jig, a creation, a cow arg, etc. It would go undetected, so we
    // deep traverse to see if its ours.
    let found = false
    _deepVisit(this._pendingMembranes, x => {
      if (found) return false // Stop traversing once we know we're claimed
      if (x instanceof Creation) return false // Don't traverse other creations
      if (x === value) {
        found = true
        return false
      }
    })

    // If we found this value via our pending membranes, we know its claimed
    if (found) return { _claimed: true, _pending: true }

    // Any values retrieved directly, meaning not returned, and not pending, are claimed.
    // This is the case for normal objects on a jig because they are stored as targets.
    if (claimed) return { _claimed: true, _pending: false }

    // Otherwise, we know it is unclaimed
    return { _claimed: false, _pending: false }
  }

  // --------------------------------------------------------------------------
  // _cow
  // --------------------------------------------------------------------------

  _cow (value) {
    // Non-smart membranes don't need wrapping because their state does not
    // depend on secure inputs and outputs.
    if (!this._rules._smartAPI) return value

    // If this is a primitive type, it needs no wrapping
    if (!isObjectType(value)) return value

    // If this is a creation, it also needs no wrapping
    if (value instanceof Creation) return value

    // Otherwise, COW-wrap the import so that any changes clone it for us
    const rules = Rules._cow()
    const membrane = new Membrane(value, rules)
    return membrane
  }

  // --------------------------------------------------------------------------
  // _claim
  // --------------------------------------------------------------------------

  // Take ownership of the object and all subobjects and return the object as an
  // unproxied target suitable for storage in the creation
  _claim (obj) {
    return _deepReplace(obj, (value, recurse) => {
      // Basic objects are never replaced because they are passed by value
      if (isBasicType(value)) return

      // If this is a top-level jig, then it has its own owner
      if (value instanceof Creation) { recurse(false); return }

      const membrane = Proxy2._getHandler(value)
      let target = Proxy2._getTarget(value) || value

      // If there is no membrane, then we're dealing with a newly created object in the
      // jig's method, ah unclaimed returned from another jig, or an object passed from
      // the user realm. In all cases, we take ownership by marking it pending.
      if (!membrane) {
        if (STACK().length) this._pendingMembranes.add(target)
        return // Leave as a target. Recurse to find any inner objects to claim.
      }

      // If we already own it, nothing to do. Its internals will already be ours.
      if (membrane._rules._creation === this._creation) {
        recurse(false)
        return target
      }

      // If this a COW object, like an argument, then make a copy now
      membrane._copyOnWriteIfNecessary()
      target = Proxy2._getTarget(membrane._proxy)

      // If there is no preexisting owner, assign ourselves with all our rules
      if (!membrane._rules._creation) {
        const method = typeof target === 'function'
        membrane._rules = Rules._childProperty(this._creation, method)
        membrane._creation = this._creation
        return target
      }

      // The value is owned by another jig. Make a clone and new membrane.
      return _sudo(() => _deepClone(target, SI))
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
  // _getOwnerCreation
  // --------------------------------------------------------------------------

  // Determines the owner. The owner may be on a prototype. Assumes it exists.
  _getOwnerCreation (prop) {
    let creation = this._creation
    let target = this._proxy

    // Walk up the prototype chain to find our prop
    while (!_hasOwnProperty(target, prop)) {
      target = Object.getPrototypeOf(target)

      // The property should always exist if we are in this method
      _assert(target)

      // Get the class if we are on its prototype
      creation = typeof target === 'object' ? target.constructor : target

      // Make sure it is a creation. If not, it's an intrinsic like Object or Function, not a creation.
      if (!(creation instanceof Creation)) creation = null

      // Because the prototype chain is not membraned, we record reads manually
      if (creation && this._shouldRecordRead() && Proxy2._getHandler(creation)._shouldRecordRead()) {
        RECORD()._read(creation)
      }
    }

    return creation
  }

  // --------------------------------------------------------------------------
  // Misc Helpers
  // --------------------------------------------------------------------------

  _isAdmin () { return this._rules._admin && _admin() }
  _isCodeMethod (prop) { return this._rules._codeMethods && CODE_METHOD_NAMES().includes(prop) }
  _isFinalProp (prop) { return this._isFinalCodeProp(prop) || this._isFinalJigProp(prop) || this._isFinalBerryProp(prop) }
  _isFinalCodeProp (prop) { return this._rules._codeMethods && _FINAL_CODE_PROPS.includes(prop) }
  _isFinalJigProp (prop) { return this._rules._jigMethods && _FINAL_JIG_PROPS.includes(prop) }
  _isFinalBerryProp (prop) { return this._rules._berryMethods && _FINAL_BERRY_PROPS.includes(prop) }
  _shouldRecordRead () { return this._rules._recordReads && STACK().length }
  _shouldRecordUpdate () { return this._rules._recordUpdates && STACK().length }
  _isCreationBinding (prop) { return this._rules._creationBindings && _CREATION_BINDINGS.includes(prop) }
  _isUtxoBinding (prop) { return this._rules._utxoBindings && _UTXO_BINDINGS.includes(prop) }
  _inside () { const s = STACK(); return s.length && s[s.length - 1]._creation === this._creation }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function isObjectType (prop) {
  return prop && (typeof prop === 'object' || typeof prop === 'function')
}

// ------------------------------------------------------------------------------------------------

function isBasicType (value) {
  const basicTypes = ['undefined', 'boolean', 'number', 'string', 'symbol']
  return basicTypes.includes(typeof value) || value === null
}

// ------------------------------------------------------------------------------------------------

function checkValidDescriptor (desc) {
  if (!('value' in desc)) throw new StateError('Descriptor must have a value')
  if ('get' in desc) throw new StateError('Getters are not supported')
  if ('set' in desc) throw new StateError('Getters are not supported')
  if (!desc.configurable) throw new StateError('Descriptor must be configurable')
  if (!desc.writable) throw new StateError('Descriptor must be writable')
  if (!desc.enumerable) throw new StateError('Descriptor must be enumerable')
}

// ------------------------------------------------------------------------------------------------

function checkSerializable (prop, value) {
  if (typeof prop === 'symbol') throw new StateError('Symbol names are not serializable')
  if (!_serializable(value)) throw new StateError(`Not serializable: ${_text(value)}`)
  _deepVisit(value, x => { if (!_serializable(x)) throw new StateError(`Not serializable: ${_text(x)}`) })
}

// ------------------------------------------------------------------------------------------------

function checkValidPropFields (x) {
  // Symbol properties are allowed because we cannot serialize them
  const symbols = Object.getOwnPropertySymbols(x).length
  if (symbols) throw new Error('Symbol properties not supported')

  // Array length is non-configurable and non-enumerable and allowed
  const filter = []
  if (x instanceof SI.Array || x instanceof HI.Array) filter.push('length')

  // Getters and setters are not supported
  Object.getOwnPropertyNames(x)
    .filter(name => !filter.includes(name))
    .map(name => Object.getOwnPropertyDescriptor(x, name))
    .forEach(desc => checkValidDescriptor(desc))
}

// ------------------------------------------------------------------------------------------------

function getLatestMethod (thisArg, target, proxy, creation) {
  const name = target.name

  // No this, always allowed
  if (!thisArg) return [target, creation]

  // Only creations can have creation methods called on them
  if (!(thisArg instanceof Creation)) return [null, null]

  // If a method of this name is not on the this target, then we can't call it
  if (!thisArg[name] || typeof thisArg[name] !== 'function') return [null, null]

  // If this is our method, then we can call it
  if (thisArg[name] === proxy) return [target, creation]

  // If the method was upgraded but it is still part of the same class, or parent class if not
  // overridden, then we can call it
  let thisContainer = thisArg
  while (thisContainer) {
    if (_hasOwnProperty(thisContainer, name)) break
    thisContainer = Object.getPrototypeOf(thisContainer)
  }
  _assert(thisContainer)
  thisContainer = typeof thisContainer === 'function' ? thisContainer : thisContainer.constructor
  if (_sudo(() => thisContainer.origin === creation.origin)) {
    _sudo(() => {
      if (thisContainer.nonce < creation.nonce) throw new StateError('Method time travel')
    })
    return [Proxy2._getTarget(thisArg[name]), thisContainer]
  }

  // If we are in our creation already, and this method is somewhere in our class chain, it's OK to call
  const stack = RECORD()._stack
  if (stack.length < 2 || stack[stack.length - 2]._creation !== thisArg) return [null, null]

  let prototype = Object.getPrototypeOf(thisArg)
  while (prototype) {
    const prototypeMethod = _getOwnProperty(prototype, name)
    if (prototypeMethod === proxy) return [target, creation]

    // If the method was upgraded on a parent but its still part of the same class, we can call it
    const prototypeMethodContainer = typeof prototype === 'function' ? prototype : prototype.constructor
    if (prototypeMethod && _sudo(() => prototypeMethodContainer.origin === creation.origin)) {
      _sudo(() => {
        if (prototypeMethodContainer.nonce < creation.nonce) throw new StateError('Method time travel')
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
      const C = Editor._lookupOrCreateCode(x)
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

  if (_basicSet(x)) {
    const values = Array.from(x.values())
    x.clear()
    values.forEach(value => x.add(replacer(value)))
  }

  if (_basicMap(x)) {
    const entries = Array.from(x.entries())
    x.clear()
    entries.forEach(([key, value]) => x.set(replacer(key), replacer(value)))
  }
}

// ------------------------------------------------------------------------------------------------

Membrane._prepareArgs = prepareArgs

module.exports = Membrane
