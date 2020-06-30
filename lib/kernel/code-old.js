
// ------------------------------------------------------------------------------------------------
// _install
// ------------------------------------------------------------------------------------------------

/*
function _install (T, options = {}) {
  if (options._native) return this._installNative(T)

  const kernel = _kernel()
  const repository = ACTIVE_REPOSITORY()
  const network = kernel._blockchain.network

  // Always create the parent first
  const Parent = _parent(T)
  const ParentCode = Parent && _install(Parent, options)

  // Check if this code already exists. We must do this after installing the parent, in case
  // the parent referenced the child and already installed it.
  const presetLocation = preset('location', T, network)
  const PrevCode = _get(T)
  if (PrevCode) return PrevCode

  Log._info(TAG, 'Installing', _text(T))

  checkValid(T, ParentCode)

  // Sandbox the code
  const env = {}
  if (ParentCode) { env[ParentCode.name] = ParentCode }
  const [S, SGlobal] = Sandbox._sandboxType(T, env)

  // Turn the sandboxed code into a jig
  // const membrane = new Membrane()
  // const C = new Sandbox._intrinsics.Proxy(S, membrane)
  // membrane._init(S, C)

  // Add Code to the prototype chain
  // Object.setPrototypeOf(S, )

  return S

  /*
    // Setup metacode properties
    this._network = network
    this._T = T
    this._C = C
    this._membrane = membrane
    this._methodTable = null
    this._methodAPI = null

    // Apply location, origin, etc. on the original type in addition to the sandbox
    this._enableBindingSyncing()

    // Hijack the prototype chain to enable upgrades
    this._enableUpgrades()

    try {
      // Temporarily add the new code for dependencies, even though its not fully installed
      repository.set(T, C)
      repository.set(C, C)
      if (presetLocation) repository.set(presetLocation, C)

      const props = Object.assign({}, T)

      // Non-native code has their deps recreated in the sandbox.

      const makeCode = x => typeof x === 'function' ? new Code(x) : undefined
      const Sprops = _deepClone(props, Sandbox._intrinsics, makeCode)

      if (ParentCode) {
        Sprops.deps = Sprops.deps || new Sandbox._intrinsics.Object()
        Sprops.deps[Parent.name] = ParentCode
      }

      Object.assign(SGlobal, Sprops.deps)

      Membrane._sudo(() => {
        Object.assign(C, Sprops)
        delete C.presets
      })

      if (hasPresets(T, network)) {
        Membrane._sudo(() => Object.assign(C, Sprops.presets[network]))
      }

      if (!presetLocation) {
        Membrane._sudo(() => Bindings._init(C))

        // if (ParentCode) Object.setPrototypeOf(S, Object.getPrototypeOf(Object))
      }

      return C
    } catch (e) {
      repository.delete(T)
      repository.delete(C)
      repository.delete(presetLocation)

      throw e
    }
}
    */

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * A Code Jig
 *
 * This is the equivalent of the Jig class for code jigs. To create a new Code jig, supply a class
 * or function into the constructor of Code, and the return will be a jig version of that code with
 * all the same functionality, as well as a few additional features like upgrade and sync.
 *
 * Code jigs are jigs. Methods may change their properties. Their owner may be assigned a different
 * value to send it to a new owner. But they are also special in that they are upgradable, and
 * their code is applied to object jigs.
 *
 * Code jigs are unique for each network. The same T will generate different code jigs on
 * different networks. However, within a given network, most Code objects will be the same.
 * This helps with instanceof checks, and they are more likely to be static unlike jigs.
 *
 * The relationship between Code, C, Membrane, S, and T is complex. Code is essentially a
 * constructor, but the returned object is not a Code instance. Instead, it is a special proxy
 * of the original T, sandboxed to become S, and then wrapped using the Membrane. The code object
 * persists too as a container of metadata about the code, but is not seen externally.
 */
/*
class Code {
  constructor (T, options = {}) {
    if (options._native) return this._installNative(T)

    const network = _kernel()._blockchain.network

    // Always create the parent first
    const Parent = _parent(T)
    const ParentCode = Parent && new Code(Parent, options)

    // Check if this code already exists. We must do this after installing the parent, in case
    // the parent referenced the child and already installed it.
    const presetLocation = preset('location', T, network)
    const repository = ACTIVE_REPOSITORY()
    const PrevCode = typeof T === 'function' && (repository.get(T) || repository.get(presetLocation))
    if (PrevCode) return PrevCode

    Log._info(TAG, 'Installing', _text(T))

    checkValid(T, ParentCode)

    // Sandbox the code
    const env = {}
    if (ParentCode) { env[ParentCode.name] = ParentCode }
    const [S, SGlobal] = Sandbox._sandboxType(T, env)

    // NOTE ABOUT SANDBOXED CODE... not playing nice with proxies
    // Don't use S

    // Turn the sandboxed code into a jig
    const membrane = new Membrane()
    const C = new Sandbox._intrinsics.Proxy(S, membrane)
    membrane._init(S, C)

    // Setup metacode properties
    this._network = network
    this._T = T
    this._C = C
    this._membrane = membrane
    this._methodTable = null
    this._methodAPI = null

    // Attach code jig functions
    membrane._userOverrides.set('deploy', (...args) => this._deploy(...args))
    membrane._userOverrides.set('upgrade', (...args) => this._upgrade(...args))
    membrane._userOverrides.set('sync', (...args) => this._sync(...args))
    membrane._userOverrides.set('destroy', (...args) => this._destroy(...args))

    // Apply location, origin, etc. on the original type in addition to the sandbox
    this._enableBindingSyncing()

    // Hijack the prototype chain to enable upgrades
    this._enableUpgrades()

    try {
      // Temporarily add the new code for dependencies, even though its not fully installed
      repository.set(T, C)
      repository.set(C, C)
      if (presetLocation) repository.set(presetLocation, C)

      const props = Object.assign({}, T)

      // Non-native code has their deps recreated in the sandbox.

      const makeCode = x => typeof x === 'function' ? new Code(x) : undefined
      const Sprops = _deepClone(props, Sandbox._intrinsics, makeCode)

      if (ParentCode) {
        Sprops.deps = Sprops.deps || new Sandbox._intrinsics.Object()
        Sprops.deps[Parent.name] = ParentCode
      }

      Object.assign(SGlobal, Sprops.deps)

      Membrane._sudo(() => {
        Object.assign(C, Sprops)
        delete C.presets
      })

      if (hasPresets(T, network)) {
        Membrane._sudo(() => Object.assign(C, Sprops.presets[network]))
      }

      if (!presetLocation) {
        Membrane._sudo(() => Bindings._init(C))

        // if (ParentCode) Object.setPrototypeOf(S, Object.getPrototypeOf(Object))
      }

      return C
    } catch (e) {
      repository.delete(T)
      repository.delete(C)
      repository.delete(presetLocation)

      throw e
    }
  }

  _installNative (T) {
    Log._debug(TAG, 'Installing native', _text(T))

    // If native code was already installed, return it.
    const PrevCode = typeof T === 'function' && NATIVE_REPOSITORY.get(T)
    if (PrevCode) return PrevCode

    // Native code must still be valid. Parents not allowed.
    _assert(!_parent(T))
    checkValid(T, undefined)

    // Sandbox the code
    const [S, SGlobal] = Sandbox._sandboxType(T, {}, true)

    // Get the native location
    const location = `native://${T.name}`

    // Add native code
    NATIVE_REPOSITORY.set(T, S)
    NATIVE_REPOSITORY.set(S, S)
    NATIVE_REPOSITORY.set(location, S)

    // Native code cannot have props. Their deps are applied directly.
    Object.assign(SGlobal, T.deps || {})

    // Set bindings
    S.origin = location
    S.location = location
    S.nonce = 0
    S.owner = null
    S.satoshis = null

    // Freeze the sandbox
    _deepVisit(S, x => Object.freeze(x))

    return S
  }

  async _sync () {
    // See if this jig is pending any updates
    const location = Membrane._sudo(() => this._C.location)
    const { error, record } = Bindings._location(location)
    if (error) throw new Error(`Cannot sync.\n\n${error}`)

    // Sync the record if there are pending updates
    if (record) {
      await Record._get(record)._sync()
    }

    // Sync all inner jigs
    // const Jig = require('./')
    // _deepVisit(this._C, x => {
    // if (x instanceof Jig || x instanceof Code) {
    // promises.push(x.sync())
    // return false
    // }
    // })

    // When it gets there, see if still in a record

    // Forward sync this jig
    // Not safe, unless references are put in tact
    // return Promise.all(promises)
  }

  _enableBindingSyncing (network) {
    const oldset = this._membrane.set.bind(this._membrane)

    this._membrane.set = (target, prop, val, receiver) => {
      if (Bindings._BINDINGS.includes(prop)) {
        this._T[prop] = val
        this._T.presets = this._T.presets || {}
        this._T.presets[this._network] = this._T.presets[this._network] || {}
        this._T.presets[this._network][prop] = val
      }

      return oldset(target, prop, val, receiver)
    }
  }

  _enableUpgrades () {
    const C = this._C
    Membrane._sudo(() => {
      // class MethodTableHandler {
      // set (target, prop, value) {
      // return false
      // }
      // }

      this._methodTable = {}
      // this._methodAPI = new Proxy(this._methodTable, new MethodTableHandler())
      this._methodAPI = this._methodTable

      // Move all properties from the prototype to the method table
      const methods = Object.getOwnPropertyNames(C.prototype)
      methods.forEach(name => {
        const desc = Object.getOwnPropertyDescriptor(C.prototype, name)
        Object.defineProperty(this._methodTable, name, desc)
        delete C.prototype[name]
      })

      // Hook up the method table in between the prototype and its parent
      const protoproto = Object.getPrototypeOf(C.prototype)
      Object.setPrototypeOf(this._methodTable, protoproto)
      Object.setPrototypeOf(C.prototype, this._methodAPI)

      // Freeze the prototype
      // TODO: Deep freeze method table properties too
      // freeze will make setPrototypeOf fail
      Object.freeze(C.prototype)

      this._methodTable.constructor = this._C
    })
  }

  static _activate (network) {
    // TODO
    // Remove all props
    // Apply base props
    // Apply custom presets
  }
}
*/

/*
// ------------------------------------------------------------------------------------------------

function hasPresets (T, network) {
  return Object.getOwnPropertyNames(T).includes('presets') && !!T.presets[network]
}
*/
