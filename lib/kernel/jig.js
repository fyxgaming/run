/**
 * jig.js
 *
 * Jig class users extend from to create digital property
 */

// ------------------------------------------------------------------------------------------------
// JigDeps
// ------------------------------------------------------------------------------------------------

class JigDeps {
  static get _Bindings () { return require('../util/bindings') }
  static get _Code () { return require('./code') }
  static get _deepClone () { return require('../util/deep')._deepClone }
  static get _JIGS () { return require('./universal')._JIGS }
  static get _Membrane () { return require('./membrane') }
  static get _NativeJig () { return require('./jig') }
  static get _Record () { return require('./record') }
  static get _Rules () { return require('./rules') }
  static get _Sandbox () { return require('../util/sandbox') }
}

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

class Jig {
  constructor (...args) {
    const Bindings = JigDeps._Bindings
    const Code = JigDeps._Code
    const deepClone = JigDeps._deepClone
    const JIGS = JigDeps._JIGS
    const Membrane = JigDeps._Membrane
    const NativeJig = JigDeps._NativeJig
    const Record = JigDeps._Record
    const Rules = JigDeps._Rules
    const SI = JigDeps._Sandbox._intrinsics
    const CURRENT_RECORD = Record._CURRENT_RECORD

    // Sandbox and deploy the code. This allows users to do new MyJig() without first deploying.
    if (!(this.constructor instanceof Code)) {
      return CURRENT_RECORD._capture(() => {
        const C = new Code(this.constructor)
        Code._editor(C)._deploy()
        return new C(...args)
      })
    }

    // Check the jig has been extended
    const childClasses = []
    let type = this.constructor
    while (type !== NativeJig) {
      childClasses.push(type)
      type = Object.getPrototypeOf(type)
    }
    if (childClasses.length === 0) throw new Error('Jig must be extended')

    // And that it doesn't have a constructor(). We force users to use init.
    const constructorRegex = /\s+constructor\s*\(/
    if (childClasses.some(type => constructorRegex.test(type.toString()))) {
      throw new Error('Jig must use init() instead of constructor()')
    }

    // Add ourselves to the official jig set. If not in here, it won't match instanceof.
    JIGS.add(this)

    // Assign initial bindings
    Bindings._init(this)
    const stack = CURRENT_RECORD._stack
    const creator = stack.length && stack[stack.length - 1]._jig
    if (creator) this.owner = deepClone(creator.owner, SI)

    // Wrap ourselves in a proxy so that every action is tracked
    const rules = Rules._jigInstance()
    const proxy = new Membrane(this, rules)

    // TODO
    // proxy.init(...args)

    return proxy
  }

  // TODO: Ensure called once
  init () { }

  toString () { return `[jig ${this.constructor.name}]` }

  async sync (options = {}) {
    /*
    const syncer = Context._activeRun()._kernel._syncer
    return syncer._syncResource(this, options.forward)
    */
  }

  static [Symbol.hasInstance] (x) {
    return JigDeps._JIGS.has(x)

    /*
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
    */
  }
}

Jig.deps = { JigDeps }
Jig.sealed = false

// ------------------------------------------------------------------------------------------------

Jig.toString() // Preserves the class name during compilation

const NativeJig = new JigDeps._Code()
const editor = JigDeps._Code._editor(NativeJig)
const internal = false
editor._installNative(Jig, internal)

module.exports = NativeJig
