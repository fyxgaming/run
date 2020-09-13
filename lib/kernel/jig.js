/**
 * jig.js
 *
 * Jig class users extend from to create digital property
 */

// ------------------------------------------------------------------------------------------------
// JigDeps
// ------------------------------------------------------------------------------------------------

class JigDeps {
  static get _Action () { return require('./action') }
  static get _Bindings () { return require('../util/bindings') }
  static get _Code () { return require('./code') }
  static get _deep () { return require('../util/deep') }
  static get _Log () { return require('../util/log') }
  static get _Membrane () { return require('./membrane') }
  static get _misc () { return require('../util/misc') }
  static get _NativeJig () { return require('./jig') }
  static get _Record () { return require('./record') }
  static get _Rules () { return require('./rules') }
  static get _Sandbox () { return require('../util/sandbox') }
  static get _sudo () { return require('../util/admin')._sudo }
  static get _sync () { return require('./sync') }
  static get _Universal () { return require('./universal') }
  static get _TAG () { return 'Jig' }
}

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

class Jig {
  constructor (...args) {
    const Action = JigDeps._Action
    const Bindings = JigDeps._Bindings
    const Code = JigDeps._Code
    const deepClone = JigDeps._deep._deepClone
    const JIGS = JigDeps._Universal._JIGS
    const Membrane = JigDeps._Membrane
    const NativeJig = JigDeps._NativeJig
    const Record = JigDeps._Record
    const Rules = JigDeps._Rules
    const SI = JigDeps._Sandbox._intrinsics
    const sudo = JigDeps._sudo
    const { _kernel, _text } = JigDeps._misc
    const CURRENT_RECORD = Record._CURRENT_RECORD

    // Sandbox and deploy the code. This allows users to do new MyJig() without first deploying.
    if (!(this.constructor instanceof Code)) {
      if (_kernel()._manual) throw new Error(`Not deployed: ${_text(this.constructor)}`)

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

    // Assign initial bindings
    Bindings._init(this)
    const stack = CURRENT_RECORD._stack
    const creator = stack.length && stack[stack.length - 1]._jig
    if (creator) {
      // The parent owner may be unbound, so the child will be too
      this.owner = sudo(() => deepClone(creator.owner, SI))
    }

    // Wrap ourselves in a proxy so that every action is tracked
    const rules = Rules._jigInstance()
    const proxy = new Membrane(this, rules)

    // Add ourselves to the official jig set to pass instanceof checks.
    JIGS.add(proxy)

    // Create the new action in the record, which will also call init()
    Action._new(this.constructor, proxy, args)

    return proxy
  }

  // --------------------------------------------------------------------------

  init () { }

  // --------------------------------------------------------------------------

  sync (options = {}) {
    const Log = JigDeps._Log
    const TAG = JigDeps._TAG
    const sync = JigDeps._sync
    const text = JigDeps._misc._text
    const NativeJig = JigDeps._NativeJig
    const Record = JigDeps._Record
    const CURRENT_RECORD = Record._CURRENT_RECORD

    if (Log._debugOn) Log._debug(TAG, 'Sync', text(this))

    // sync cannot be applied to a non-jig
    if (!(this instanceof NativeJig)) throw new Error('sync unavailable')

    // sync only available outside the jig
    if (CURRENT_RECORD._stack.length) throw new Error('sync cannot be called internally')

    // Sync it
    return sync(this, options).then(() => this)
  }

  // --------------------------------------------------------------------------

  destroy () {
    const Log = JigDeps._Log
    const TAG = JigDeps._TAG
    const text = JigDeps._misc._text
    const NativeJig = JigDeps._NativeJig
    const Action = JigDeps._Action

    if (Log._debugOn) Log._debug(TAG, 'Destroy', text(this))

    // destroy cannot be applied to a non-jig
    if (!(this instanceof NativeJig)) throw new Error('destroy unavailable')

    // Record a destroy action
    Action._destroy(this)

    // Return self for chaining
    return this
  }

  // --------------------------------------------------------------------------

  auth () {
    const Log = JigDeps._Log
    const TAG = JigDeps._TAG
    const text = JigDeps._misc._text
    const NativeJig = JigDeps._NativeJig
    const Action = JigDeps._Action
    const Bindings = JigDeps._Bindings
    const _sudo = JigDeps._sudo

    if (Log._debugOn) Log._debug(TAG, 'Auth', text(this))

    // auth cannot be applied to a non-jig
    if (!(this instanceof NativeJig)) throw new Error('auth unavailable')

    // Cannot auth undeployed code. There's no input to sign.
    const undeployed = _sudo(() => this.origin === Bindings._UNDEPLOYED)
    if (undeployed) throw new Error('Cannot auth undeployed')

    // Record a auth action
    Action._auth(this)

    // Return self for chaining
    return this
  }

  // --------------------------------------------------------------------------

  toString () { return `[jig ${this.constructor.name}]` }

  // --------------------------------------------------------------------------

  static [Symbol.hasInstance] (x) {
    // Prevent users from creating "jigs" via Object.setPrototypeOf. This also solves
    // the issues of Dragon.prototype instanceof Dragon returning true.
    if (!JigDeps._Universal._JIGS.has(x)) return false

    // If we aren't checking a particular class, we are done
    if (this === JigDeps._NativeJig) return true

    // Get the sandboxed version of the class
    const C = JigDeps._Code._lookupByType(this)

    // If didn't find this code, then it couldn't be an instance.
    if (!C) return false

    // Check if this class's prototype is in the prototype chain of the instance
    // We only check origins, not locations, because (1) locations change frequently
    // for certain class jigs, and to users syncing would be annoying, and (2) inside
    // jig code there will only ever be one location for a jig class at a time.
    return JigDeps._sudo(() => {
      let type = Object.getPrototypeOf(x)
      while (type) {
        if (type.constructor.origin === C.origin) return true
        type = Object.getPrototypeOf(type)
      }

      return false
    })
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
