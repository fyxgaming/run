/**
 * jig2.js
 *
 * The jig proxy handler for both code and objects
 */

// ------------------------------------------------------------------------------------------------
// Handler
// ------------------------------------------------------------------------------------------------

class _JigHandler {
  constructor () {
    this._target = null // Class or Object being wrapped
    this._proxy = null

    this._classTarget = null
    this._classProxy = null
  }

  construct (_target, args, _newTarget) {
    console.log('construct', this._target, args, this._proxy)
    console.log(this._proxy)

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

  get (target, prop, receiver) {
    // console.log('get', prop, target[prop])

    if (prop === 'constructor') {
      return this._classProxy
    }

    // If getting the constructor, return the proxy class
    // But what about Object.getPrototypeOf?

    // if (prop === 'prototype') return _JigHandler._makeCodeJig(target[prop])

    // get Update()

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
    try { this._enabled = false; return callback() } finally { this._enabled = prev }
  }
}

// CodeJigHandler
// ObjectJigHandler

// Control state
_JigHandler._enabled = true

// ------------------------------------------------------------------------------------------------

module.exports = { _JigHandler }
