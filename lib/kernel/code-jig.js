/**
 * code-jig.js
 *
 * Creates class and function jigs from sandboxed code
 */

// ------------------------------------------------------------------------------------------------
// CodeJig
// ------------------------------------------------------------------------------------------------

class CodeJig {
  static _fromSandbox (S) {
    const handler = new CodeJig()
    const proxy = new Proxy(S, handler)
    handler._init(S, proxy)
    return proxy
  }

  _init (S, proxy) {
    this._target = S
    this._proxy = proxy

    this._methodTable = null
    this._methodAPI = null

    if (S.prototype) {
      this._methodTable = {}

      class MethodTableHandler {
        set (target, prop, value) {
          return false
        }
      }

      this._methodAPI = new Proxy(this._methodTable, new MethodTableHandler())

      const methods = Object.getOwnPropertyNames(S.prototype)
      methods.forEach(name => {
        const desc = Object.getOwnPropertyDescriptor(S.prototype, name)
        Object.defineProperty(this._methodTable, name, desc)
        delete S.prototype[name]
      })

      const protoproto = Object.getPrototypeOf(S.prototype)
      Object.setPrototypeOf(this._methodTable, protoproto)
      

      Object.setPrototypeOf(S.prototype, this._methodAPI)

      // TODO: Deep freeze method table properties too
      // freeze will make setPrototypeOf fail
      Object.freeze(S.prototype)
    }
  }

  _sync () {

  }

  _upgrade (S) {
    if (S.prototype) {
      this._upgradeMethodTable(S.prototype)
    }

    // Clear the method table
    Object.getOwnPropertyNames(this._methodTable).forEach(name => {
      delete this._methodTable[name]
    })

    // Install T...
    // T should not have reserved static functions on it: upgrade, sync, destroy

    Object.getOwnPropertyNames(S.prototype).forEach(name => {
      const desc = Object.getOwnPropertyDescriptor(S.prototype, name)
      Object.defineProperty(this._methodTable, name, desc)
    })

    const protoproto = Object.getPrototypeOf(S.prototype)
    Object.setPrototypeOf(this._methodTable, protoproto)
    Object.setPrototypeOf(S.prototype, this._methodAPI)

    this._methodTable.constructor = this._proxy
    this._target = S
  }

  _toString () {
    return this._target.toString()
  }

  get (target, prop) {
    if (prop === 'sync') return (...args) => this._sync(...args)
    if (prop === 'upgrade') return (...args) => this._upgrade(...args)
    if (prop === 'toString') return (...args) => this._toString(...args)
    return target[prop]
  }

  // Call
}

// Function.prototype methods, .call, .apply, etc.

// ------------------------------------------------------------------------------------------------

module.exports = CodeJig
