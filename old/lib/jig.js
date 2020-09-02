/**
 * jig.js
 *
 * Jig class users extend from to create digital property
 */

const Context = require('./context')

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

class Jig {
  constructor (...args) {
    const run = Context._activeRun()

    if (!run.code.isSandboxed(this.constructor)) {
      run.transaction.begin()
      try {
        const T = run.code.deploy(this.constructor)
        return new T(...args)
      } finally { run.transaction.end() }
    }

    const childClasses = []
    let type = this.constructor
    while (type !== Jig) {
      childClasses.push(type)
      type = Object.getPrototypeOf(type)
    }

    if (childClasses.length === 0) throw new Error('Jig must be extended')

    const constructorRegex = /\s+constructor\s*\(/
    if (childClasses.some(type => constructorRegex.test(type.toString()))) {
      throw new Error('Jig must use init() instead of constructor()')
    }

    const methods = []
    const classChain = [...childClasses, Jig]
    classChain.forEach(type => {
      Object.getOwnPropertyNames(type.prototype).forEach(prop => methods.push(prop))
    })

    // this.owner = JigControl._stack.length ? JigControl._stack[JigControl._stack.length - 1].owner : Context._nextOwner()
    this.satoshis = 0
    // origin and location will be set inside of _storeAction
    this.origin = '_'
    this.location = '_'

    // proxy.init(...args)

    // return proxy
  }

  init () { }

  toString () { return `[jig ${this.constructor.name}]` }

  async sync (options = {}) {
    const syncer = Context._activeRun()._kernel._syncer
    return syncer._syncResource(this, options.forward)
  }

  static [Symbol.hasInstance] (x) {
    const run = Context._activeRun()

    if (typeof x !== 'object' || !x) return false

    // Check if we are already a constructor prototype.
    // (Dragon {} is the prototype of all dragons, and it should not be considered a Jig)
    if (x === x.constructor.prototype) return false

    // Find the sandboxed version of this class because thats what instances will be
    let T = run.code._getSandboxed(this)
    if (!T) {
      const net = Context._networkSuffix(run.blockchain.network)
      T = run.code._getSandboxed(this[`origin${net}`])
      if (!T) return false
    }

    // Check if this class's prototype is in the prototype chain of the instance
    let type = Object.getPrototypeOf(x)
    while (type) {
      if (type === T.prototype) return true
      type = Object.getPrototypeOf(type)
    }

    return false
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { Jig }
