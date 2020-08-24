/**
 * membrane.js
 *
 * A flexible proxy handler for jigs, code, berries, and their owned inner objects.
 */

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

class Membrane {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  constructor () {
    // Jig that owns whatever this proxy's target, which may be the jig itself
    this._jig = null
  }

  // --------------------------------------------------------------------------
  // _apply
  // --------------------------------------------------------------------------

  _apply (target, thisArg, args) {
    this._throwIfJigErrors()

    return Reflect.apply(target, thisArg, args)
  }

  // --------------------------------------------------------------------------
  // _construct
  // --------------------------------------------------------------------------

  _construct (target, args, newTarget) {
    this._throwIfJigErrors()

    return Reflect.construct(target, args, newTarget)
  }

  // --------------------------------------------------------------------------
  // _defineProperty
  // --------------------------------------------------------------------------

  _defineProperty (target, prop, desc) {
    this._throwIfJigErrors()

    return Reflect.defineProperty(target, prop, desc)
  }

  // --------------------------------------------------------------------------
  // _deleteProperty
  // --------------------------------------------------------------------------

  _deleteProperty (target, prop) {
    this._throwIfJigErrors()

    return Reflect.deleteProperty(target, prop)
  }

  // --------------------------------------------------------------------------
  // _get
  // --------------------------------------------------------------------------

  _get (target, prop, receiver) {
    this._throwIfJigErrors()

    return Reflect.get(target, prop, receiver)
  }

  // --------------------------------------------------------------------------
  // _getOwnPropertyDescriptor
  // --------------------------------------------------------------------------

  _getOwnPropertyDescriptor (target, prop) {
    this._throwIfJigErrors()

    return Reflect.getOwnPropertyDescriptor(target, prop)
  }

  // --------------------------------------------------------------------------
  // _getPrototypeOf
  // --------------------------------------------------------------------------

  _getPrototypeOf (target) {
    this._throwIfJigErrors()

    return Reflect.getPrototypeOf(target)
  }

  // --------------------------------------------------------------------------
  // _has
  // --------------------------------------------------------------------------

  _has (target, prop) {
    this._throwIfJigErrors()

    return Reflect.has(target, prop)
  }

  // --------------------------------------------------------------------------
  // _isExtensible
  // --------------------------------------------------------------------------

  _isExtensible (target) {
    this._throwIfJigErrors()

    return Reflect.isExtensible(target)
  }

  // --------------------------------------------------------------------------
  // _ownKeys
  // --------------------------------------------------------------------------

  _ownKeys (target) {
    this._throwIfJigErrors()

    return Reflect.ownKeys(target)
  }

  // --------------------------------------------------------------------------
  // _preventExtensions
  // --------------------------------------------------------------------------

  _preventExtensions (target) {
    this._throwIfJigErrors()

    return Reflect.preventExtensions(target)
  }

  // --------------------------------------------------------------------------
  // _set
  // --------------------------------------------------------------------------

  _set (target, prop, value, receiver) {
    this._throwIfJigErrors()

    return Reflect.set(target, prop, value, receiver)
  }

  // --------------------------------------------------------------------------
  // _setPrototypeOf
  // --------------------------------------------------------------------------

  _setPrototypeOf (target, prototype) {
    this._throwIfJigErrors()

    return Reflect.setPrototypeOf(target, prototype)
  }

  // --------------------------------------------------------------------------
  // _intrinsicGetMethod
  // --------------------------------------------------------------------------

  _intrinsicGetMethod () {
    this._throwIfJigErrors()
  }

  // --------------------------------------------------------------------------
  // _intrinsicOut
  // --------------------------------------------------------------------------

  _intrinsicOut (value) {
    this._throwIfJigErrors()

    return value
  }

  // --------------------------------------------------------------------------
  // _intrinsicIn
  // --------------------------------------------------------------------------

  _intrinsicIn (value) {
    this._throwIfJigErrors()

    return value
  }

  // --------------------------------------------------------------------------
  // _intrinsicRead
  // --------------------------------------------------------------------------

  _intrinsicRead () {
    this._throwIfJigErrors()
  }

  // --------------------------------------------------------------------------
  // _intrinsicUpdate
  // --------------------------------------------------------------------------

  _intrinsicUpdate () {
    this._throwIfJigErrors()
  }

  // --------------------------------------------------------------------------
  // _throwIfJigErrors
  // --------------------------------------------------------------------------

  _throwIfJigErrors () {
    // TODO
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Membrane
