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
  static get _Editor () { return require('./editor') }
  static get _Loader () { return require('./loader') }
  static get _Log () { return require('../util/log') }
  static get _Membrane () { return require('./membrane') }
  static get _misc () { return require('../util/misc') }
  static get _NativeJig () { return require('./jig') }
  static get _Record () { return require('./record') }
  static get _Rules () { return require('./rules') }
  static get _Sandbox () { return require('../sandbox/sandbox') }
  static get _sudo () { return require('../util/admin')._sudo }
  static get _sync () { return require('./sync') }
  static get _Transaction () { return require('./transaction') }
  static get _TAG () { return 'Jig' }
  static get _Creation () { return require('./creation') }
}

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

class Jig {
  constructor (...args) {
    const Action = JigDeps._Action
    const Bindings = JigDeps._Bindings
    const Code = JigDeps._Code
    const Editor = JigDeps._Editor
    const deepClone = JigDeps._deep._deepClone
    const JIG_OBJECTS = JigDeps._Creation._JIG_OBJECTS
    const Membrane = JigDeps._Membrane
    const NativeJig = JigDeps._NativeJig
    const Record = JigDeps._Record
    const Rules = JigDeps._Rules
    const SI = JigDeps._Sandbox._intrinsics
    const sudo = JigDeps._sudo
    const CURRENT_RECORD = Record._CURRENT_RECORD

    // Check that the jig has been extended
    if (this.constructor === NativeJig) throw new Error('Jig must be extended')

    // Sandbox and deploy the code. This allows users to do new MyJig() without first deploying.
    if (!(this.constructor instanceof Code)) {
      return CURRENT_RECORD._capture(() => {
        const C = Editor._newCode(this.constructor)
        Editor._get(C)._deploy()
        return new C(...args)
      })
    } else {
      Editor._get(this.constructor)._deploy()
    }

    // Assign initial bindings
    Bindings._markUndeployed(this)
    const stack = CURRENT_RECORD._stack
    const creator = stack.length && stack[stack.length - 1]._jig
    if (creator) {
      // The parent owner may be unbound, so the child will be too
      this.owner = sudo(() => deepClone(creator.owner, SI))
    }

    // Wrap ourselves in a proxy so that every action is tracked
    const rules = Rules._jigObject()
    const proxy = new Membrane(this, rules)

    // Add ourselves to the official jig set to pass instanceof checks.
    JIG_OBJECTS.add(proxy)

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
    const Transaction = JigDeps._Transaction

    if (Transaction._ATOMICALLY_UPDATING) throw new Error('sync disabled during atomic update')

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
    const Record = JigDeps._Record
    const _hasJig = JigDeps._misc._hasJig

    if (Log._debugOn) Log._debug(TAG, 'Auth', text(this))

    // auth cannot be applied to a non-jig
    if (!(this instanceof NativeJig)) throw new Error('auth unavailable on native jigs')

    // We cannot auth jigs just created because there is no input
    if (_hasJig(Record._CURRENT_RECORD._creates, this)) throw new Error('auth unavailable on new jigs')

    // Record a auth action
    Action._auth(this)

    // Return self for chaining
    return this
  }

  // --------------------------------------------------------------------------

  toString () { return `[jig ${this.constructor.name}]` }

  // --------------------------------------------------------------------------

  static load (location) {
    const { _kernel, _text, _extendsFrom } = JigDeps._misc
    const Loader = JigDeps._Loader
    const NativeJig = JigDeps._NativeJig
    const Record = JigDeps._Record
    const CURRENT_RECORD = Record._CURRENT_RECORD
    const Transaction = JigDeps._Transaction

    if (Transaction._ATOMICALLY_UPDATING) throw new Error('load disabled during atomic update')

    // load cannot be applied to a non-jig
    if (this !== NativeJig && !_extendsFrom(this, NativeJig)) throw new Error('load unavailable')

    // load only available outside the jig
    if (CURRENT_RECORD._stack.length) throw new Error('load cannot be called internally')

    const loadAsync = async () => {
      const kernel = _kernel()
      const loader = new Loader(kernel)
      const jig = await loader._load(location)
      if (jig instanceof this) return jig
      throw new Error(`Cannot load ${location}\n\n${_text(jig)} not an instance of ${_text(this)}`)
    }

    return loadAsync()
  }

  // --------------------------------------------------------------------------

  static [Symbol.hasInstance] (x) {
    // Prevent users from creating "jigs" via Object.setPrototypeOf. This also solves
    // the issues of Dragon.prototype instanceof Dragon returning true.
    if (!JigDeps._Creation._JIG_OBJECTS.has(x)) return false

    // If we aren't checking a particular class, we are done
    if (this === JigDeps._NativeJig) return true

    // Get the sandboxed version of the class
    const C = JigDeps._Editor._lookupCodeByType(this)

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

const NativeJig = JigDeps._Editor._newCode()
const editor = JigDeps._Editor._get(NativeJig)
const internal = false
editor._installNative(Jig, internal)

module.exports = NativeJig
