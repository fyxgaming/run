/**
 * jig2.js
 *
 * The jig proxy handler for both code and objects
 */

// ------------------------------------------------------------------------------------------------
// Handler
// ------------------------------------------------------------------------------------------------

class _JigHandler {
    constructor() {
        this._proxy = null
    }

    construct(target, args, newTarget) {
        console.log('construct', target, args, newTarget)
        console.log(this._proxy)
        const o = Reflect.construct(target, args, this._proxy)
        // Object.setPrototypeOf(o, this._proxy.prototype)
        console.log(o, o.constructor === this.Proxy)
        // console.log(Object.getPrototypeOf(o) === this._proxy.prototype)
        // console.log(Object.getPrototypeOf(o) === target.prototype)
        return o
    }

    /*
    get (target, prop, receiver) {
        console.log('get', prop, target[prop])
        if (prop === 'prototype') return _JigHandler._makeCodeJig(target[prop])

        return target[prop]
    }
    */

    static _makeCodeJig(T) {
        const handler = new _JigHandler()
        const U = new Proxy(T, handler)
        handler._proxy = U
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

// Control state
_JigHandler._enabled = true

// ------------------------------------------------------------------------------------------------

module.exports = { _JigHandler }
