/**
 * jig-code.js
 *
 * The proxy handler for code jigs
 */

const SYSTEM = require('./jig-sys')

// ------------------------------------------------------------------------------------------------
//
// ------------------------------------------------------------------------------------------------

class _JigHandler {
  constructor () {
    this._target = null // Class or Object being wrapped
    this._proxy = null

    this._classTarget = null
    this._classProxy = null
  }

  construct (_target, args, _newTarget) {
    const obj = Reflect.construct(this._target, args, this._proxy)

    const handler = new _JigHandler()
    const obj2 = new Proxy(obj, handler)
    handler._target = obj
    handler._proxy = obj2
    handler._classTarget = this._target
    handler._classProxy = this._proxy

    console.log(obj, obj2.constructor === this._proxy)

    // Object.setPrototypeOf(o, this._proxy.prototype)
    console.log(Object.getPrototypeOf(obj2) === this._proxy.prototype)
    console.log(Object.getPrototypeOf(obj2) === this._target.prototype)

    // Proxy prototype === target prototype is a problem
    // Getting the class proxy prototype, T.prototype, enables changes
    // Freeze it? Yes that works. Need to freeze the class itself too. And any dependencies.

    // But now how to upgrade?
    // If we can't return a different T.prototype, we can't change T can we.
    // Unless we keep the prototype the same, but change all methods and the constructor.
    // A universal prototype for a class. Interesting.

    // Prototype is how methods are added and changed. Interesting.
    // But maybe we change the class prototype with getPrototypeOf?
    // But that doesn't change the class's prototype object chain.

    return obj2

    /*
    const classTarget = target

    const t = Reflect.construct(target, args, newTarget)

    const objectHandler = {}
    const objectProxy = new Proxy(t, objectHandler)

    objectHandler.get = (target, prop) => {
      // TODO: Jigs need this. Not the first part, because that protects
      // non-proxied classes extending from proxy, but the second part. And
      // we can get TProxy from inside the Jig once we deploy it.
      if (target.constructor === classTarget && prop === 'constructor') return newTarget

      return target[prop]
    }
    */
  }

  getPrototypeOf (target) {
    return this._classProxy.prototype
  }

  // Upgrade, toString()

  get (target, prop, receiver) {
    console.log('GET', prop, '------', target[prop])
    // if (prop === 'prototype') return new Proxy(target.prototype, {})

    if (prop === 'constructor') {
      return this._classProxy
    }

    if (prop === 'upgrade') {
      return T => {
        console.log('upgrading')
        this._target = T
      }
    }

    // CLASS.prototype.x ... if new, how to get?
    // If frozen, then we can't add the new prototype
    // If not frozen, then others can change it

    // If getting the constructor, return the proxy class
    // But what about Object.getPrototypeOf?

    // if (prop === 'prototype') return _JigHandler._makeCodeJig(target[prop])

    // get Update()

    // Check the object itself
    // Check check the class proxy?

    return target[prop]
  }

  static _createProxy (T) {
    const handler = new _JigHandler()
    const U = new Proxy(T, handler)
    handler._target = T
    handler._proxy = U
    handler._classTarget = null
    handler._classProxy = null
    return U
  }

  /**
   * Disables the jig's handler making it function like the underlying target
   *
   * @param {function} callback Function to execute while disabled
   * @returns {*} Callback return value
   */
  static _disable (callback) {
    const prev = this._enabled
    try {
      this._enabled = false
      return callback()
    } finally {
      this._enabled = prev
    }
  }
}

// Control state
_JigHandler._enabled = true

// ------------------------------------------------------------------------------------------------

module.exports = { _JigHandler }
