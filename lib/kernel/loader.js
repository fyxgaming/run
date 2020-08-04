/**
 * loader.js
 *
 * Loads a jig or berry and all its dependencies in parallel
 */

const bsv = require('bsv')
const { Transaction } = bsv
const Log = require('../util/log')
const { _assert, _parentName, _extendsFrom, _text, _checkState, _checkArgument } = require('../util/misc')
const { _location } = require('../util/bindings')
const { ArgumentError, StateError } = require('../util/errors')
const File = require('./file')
const Codec = require('../util/codec')
const Sandbox = require('../util/sandbox')
const Membrane = require('./membrane')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Loader'

// ------------------------------------------------------------------------------------------------
// Loader
// ------------------------------------------------------------------------------------------------

/**
 * Notes
 *  - Jigs are conserved in a loader instance. They won't be recreated from the cache twice.
 *  - Imports of any kind (jigs, berry plucks) use different loaders for safety.
 *  - There may be duplicate inner jigs created when importing. These are still safe to use.
 *  - State cache jigs are loaded in two phases. Completers store a promise for the second phase.
 */
class Loader {
  constructor (kernel, importLimit = undefined) {
    _assert(kernel)

    // Promises for the individual loads in progress
    // Location -> Promise<Jig>
    this._loads = new Map()

    // Promises to complete any partial loads
    this._completers = []

    // Whether this is the top-level load. The first load runs the completers.
    this._firstLoad = true

    // The kernel used to load
    this._kernel = kernel

    // The number of sub-imports allowed by this load
    const { _ImportLimit } = require('./import')
    this._importLimit = importLimit || new _ImportLimit()
  }

  // --------------------------------------------------------------------------
  // _load
  // --------------------------------------------------------------------------

  /**
   * Loads a jig or berry at a location
   *
   * BerryClass forces the berry to be plucked using that class, whether deployed or not.
   */
  async _load (location, BerryClass) {
    // Save firstLoad so we know when we're returning back to the user
    const firstLoad = this._firstLoad
    this._firstLoad = false

    // Piggy back on an existing load if there is one.
    // Except when there's a berry class. The location is not the real location in that case.
    if (!BerryClass) {
      const prev = this._loads.get(location)
      if (prev) return prev
    }

    // Start a new load. This may partially load the jig and create a completer.
    const promise = this._loadFresh(location, BerryClass)

    // Save the promise so future loads won't load the same jig twice
    // Except when there's a berry class. Same reason as above.
    if (!BerryClass) {
      this._loads.set(location, promise)
    }

    // Wait for the load to finish
    const jig = await promise

    // If we are returning to the user, finish all loads.
    // Completers might create more completers so we loop.
    if (firstLoad) {
      while (this._completers.length) {
        const completers = this._completers
        this._completers = []
        await Promise.all(completers)
      }

      this._firstLoad = true
    }

    return jig
  }

  // --------------------------------------------------------------------------
  // _loadFresh
  // --------------------------------------------------------------------------

  /**
   * Loads a jig assuming it is not already being loaded
   */
  async _loadFresh (location, BerryClass) {
    Log._info(TAG, 'Load', location)

    // If the user specified a berry class, use it to load the location
    if (BerryClass) {
      return this._loadWithUserBerryClass(location, BerryClass)
    }

    // Parse the location
    const loc = _location(location)

    // Check that the location is not an error or in a commit
    const badLocation = `Bad location: ${location}`
    _checkArgument(!loc.error, badLocation)
    _checkArgument(!loc.commitid, badLocation)

    // If the location is native, get and return it right away
    if (loc.native) {
      return this._loadNative(location)
    }

    // If non-native, check that we can load it
    _checkArgument(loc.txid, badLocation)

    // Load the jig, code, or berry from its location
    if (loc.berry) {
      return this._loadBerryFromLocation(location)
    } else {
      return this._loadJigFromLocation(location)
    }
  }

  // --------------------------------------------------------------------------
  // _loadBerryFromLocation
  // --------------------------------------------------------------------------

  async _loadBerryFromLocation (location) {
    // Try loading from the cache first
    const key = `berry://${location}`
    const berry = await this._recreate(key)
    if (berry) return berry

    // No cache. Load the berry class. Fresh loader b/c we can't wait for completions.
    const berryClassLocation = location.slice(0, location.lastIndexOf('_'))
    const loader = new Loader(this._kernel, this._importLimit)
    const BerryClass = await loader.load(berryClassLocation)

    // Pluck the damn berry
    return this._pluckBerry(location, BerryClass)
  }

  // --------------------------------------------------------------------------
  // _loadJigFromLocation
  // --------------------------------------------------------------------------

  async _loadJigFromLocation (location) {
    const { txid, vout, vdel } = _location(location)

    // Get the transaction and payload if we are loading a non-berry
    const rawtx = await this._kernel._blockchain.fetch(txid)
    const tx = new Transaction(rawtx)

    // Extract the payload
    const payload = _payload(tx)

    // Check that our location is in range
    const hasVout = typeof vout === 'number' && vout >= 1 && vout <= payload.out.length
    const hasVdel = typeof vdel === 'number' && vdel >= 0 && vdel < payload.del.length
    _checkArgument(hasVout || hasVdel, `Jig does not exist: ${location}`)

    // Get the state hash
    const hash = hasVout ? payload.out[vout - 1] : payload.del[vdel]

    // Try recreating from the state cache
    const key = `jig://${location}`
    const jig = await this._recreate(key, hash)
    if (jig) return jig

    // Import the tx to load the jig. Slow!
    return this._loadJigViaReplay(tx, payload, location)
  }

  // --------------------------------------------------------------------------
  // _loadJigViaReplay
  // --------------------------------------------------------------------------

  async _loadJigViaReplay (tx, payload, location) {
    const { vout, vdel } = _location(location)

    // Load the record
    const _import = require('./import')
    const record = await _import(tx, payload, true /* published */, null /* jigToSync */,
      this._importLimit)

    // Get the jig out of the record. Outputs are 1-indexed b/c of the payload.
    if (typeof vout === 'number' && vout >= 1 && vout <= record._outputs.length) {
      return record._outputs[vout - 1]
    }
    if (typeof vdel === 'number' && vdel >= 0 && vdel <= record._deletes.length - 1) {
      return record._deletes[vdel]
    }

    // No luck. No jig.
    throw new ArgumentError(`Jig not found: ${location}`)
  }

  // --------------------------------------------------------------------------
  // _loadWithUserBerryClass
  // --------------------------------------------------------------------------

  /**
   * Loads a jig using the user-provided berry class
   */
  async _loadWithUserBerryClass (location, BerryClass) {
    const Berry = require('./berry')

    // Check that BerryClass extends from Berry
    _checkArgument(_extendsFrom(BerryClass, Berry), 'Berry class must extend from Berry')

    // Find or install the berry class
    const BFile = new File(BerryClass)
    const B = BFile._jig

    // See if the berry class is already deployed. We might be able to fast-track the load.
    const Blocation = Membrane._sudo(() => B.location)
    const Bloc = _location(Blocation)
    const hasLocation = !Bloc.commitid && !Bloc.error && Bloc.txid
    const fullLocation = hasLocation ? `${Blocation}_${location}` : undefined

    // If this berry is already being loaded under its full location, piggy back on that.
    if (fullLocation) {
      const prev = this._loads.get(fullLocation)
      if (prev) return prev
    }

    // If this berry can be recreated from the cache, use that
    // Recreate the berry, either from the cache or by plucking it
    const load = async () => {
      // Try loading the berry from the cache
      const key = `berry://${fullLocation}`
      const berry = await this._recreate(key)
      if (berry) return berry

      // If nothing in the cache, pluck the berry
      return this._pluckBerry(location, BerryClass)
    }

    const promise = load()

    // Add this load as a promise for future loads if we can
    if (fullLocation) {
      this._loads.set(fullLocation, promise)
    }

    return promise
  }

  // --------------------------------------------------------------------------
  // _pluckBerry
  // --------------------------------------------------------------------------

  /**
   * Recreates a berry from scratch using a berry class
   */
  async _pluckBerry (location, BerryClass) {
    // TODO
    // Cache the berry state once plucked
    return BerryClass.pluck(location)
  }

  // --------------------------------------------------------------------------
  // _loadNative
  // --------------------------------------------------------------------------

  /**
   * Specifically loads a built-in class as a dependency
   */
  _loadNative (location) {
    const { native } = _location(location)

    // Find the native file
    const file = File._findNativeByName(native)
    _checkArgument(file, `Native code not found: ${location}`)

    // Make sure it's not internal
    _checkArgument(!file._internal, `${_text(file._jig)} cannot be a dependency`)

    // Return the jig
    return file._jig
  }

  // --------------------------------------------------------------------------
  // _recreate
  // --------------------------------------------------------------------------

  /**
   * Recreates a jig or berry from the cache, or returns undefined if it doesn't exist.
   */
  async _recreate (key, hash = undefined) {
    Log._debug(TAG, 'Recreating', key)

    // Get the state from the cache if it exists
    const state = await this._kernel._cache.get(key)
    if (!state) return

    // Check that the version is supported by this loader
    const { _PROTOCOL_VERSION } = require('./commit')
    const version = Buffer.from(_PROTOCOL_VERSION).toString('hex')
    _checkState(state.version === version, `Unsupported state version: ${state.version}`)

    // Extract the txid from the key
    const txid = key.split('//')[1].split('_')[0]

    // Check that the hash matches
    if (hash) {
      const stateString = JSON.stringify(state)
      const stateBuffer = new bsv.deps.Buffer(stateString, 'utf8')
      const stateHash = bsv.crypto.Hash.sha256(stateBuffer)
      const stateHashHex = stateHash.toString('hex')
      _checkState(stateHashHex === hash, `State hash mismatch for ${key}`)
    }

    // Get the referenced jigs out of the state by decoding with dummy jigs
    // Dummy jigs are classes so that setPrototypeOf works for arbitrary objects
    const refs = new Map()
    const makeDummyJig = x => { class A {}; A.location = x; return A }
    const codec = new Codec()._loadJigs(x => { refs.set(x, null); return makeDummyJig(x) })
    const decodedState = codec._decode(state)

    switch (decodedState.kind) {
      case 'code': return this._recreateCode(decodedState, refs, txid, state)
      case 'jig': return this._recreateJig(decodedState, txid)
      case 'berry': return this._recreateBerry(decodedState, txid)
      default: throw new StateError(`Unknown jig kind: ${decodedState.kind}`)
    }
  }

  // --------------------------------------------------------------------------

  async _recreateCode (decodedState, refs, txid, state) {
    const env = {}

    // Preload the parent if there is one
    const parentName = _parentName(decodedState.src)
    if (parentName) {
      const parentLocation = decodedState.props.deps[parentName].location
      const parentFullLocation = parentLocation.startsWith('_') ? txid + parentLocation : parentLocation
      const Parent = await this._load(parentFullLocation)
      env[parentName] = Parent
    }

    // Create the code without any properties
    const [S, SGlobal] = Sandbox._evaluate(decodedState.src, env)
    const file = new File(S, false /* local */)

    // Finishing loading the jig in parallel in a completer
    const complete = async () => {
      // Load the remaining refs
      for (const ref of refs.keys()) {
        const refFullLocation = ref.startsWith('_') ? txid + ref : ref
        const jig = await this._load(refFullLocation)
        refs.set(ref, jig)
      }

      // Redecode the state with the partially loaded refs
      const codec2 = new Codec()._loadJigs(x => {
        const refFullLocation = x.startsWith('_') ? txid + x : x
        const jig = refs.get(x)
        _checkState(jig, `Jig not loaded: ${refFullLocation}`)
        return jig
      })
      const redecodedState = codec2._decode(state)

      // Update the code with the new dependencies
      Object.assign(SGlobal, redecodedState.props.deps)

      const C = file._jig

      // Apply the props to the code
      Membrane._sudo(() => {
        Object.assign(C, redecodedState.props)
        if (C.origin.startsWith('_')) C.origin = txid + C.origin
        if (C.location.startsWith('_')) C.location = txid + C.location
      })
    }

    const promise = complete()
    this._completers.push(promise)

    return file._jig
  }

  // --------------------------------------------------------------------------

  async _recreateJig (decodedState, txid) {
    // TODO
    return { $jig: 123 }
  }

  // --------------------------------------------------------------------------

  async _recreateBerry (decodedState, txid) {
    // TODO
    return { $berry: 123 }
  }
}

// ------------------------------------------------------------------------------------------------
// _payload
// ------------------------------------------------------------------------------------------------

function _payload (tx) {
  const { _PROTOCOL_VERSION } = require('./publish')

  const badPayloadStructure = 'Not a run transaction: Bad payload structure'
  const badPayloadJSON = 'Not a run transaction: Bad payload JSON'
  const unsupportedRunProtocol = 'Unsupported run protocol'

  _checkState(tx.outputs.length, badPayloadStructure)

  const chunks = tx.outputs[0].script.chunks

  _checkState(chunks.length >= 6, badPayloadStructure)
  _checkState(chunks[0].opcodenum === 0, badPayloadStructure) // OP_FALSE
  _checkState(chunks[1].opcodenum === 106, badPayloadStructure) // OP_RETURN
  _checkState(chunks[2].buf.toString() === 'run', badPayloadStructure)

  const protocolHex = Buffer.from(_PROTOCOL_VERSION).toString('hex')
  _checkState(chunks[3].buf.toString('hex') === protocolHex, unsupportedRunProtocol)

  try {
    const json = chunks[5].buf.toString('utf8')
    const payload = JSON.parse(json)

    _checkState(typeof payload.in === 'number', badPayloadJSON)
    _checkState(Array.isArray(payload.ref), badPayloadJSON)
    _checkState(Array.isArray(payload.out), badPayloadJSON)
    _checkState(Array.isArray(payload.del), badPayloadJSON)
    _checkState(Array.isArray(payload.lock), badPayloadJSON)
    _checkState(Array.isArray(payload.cmds), badPayloadJSON)

    _checkState(!payload.ref.some(ref => typeof ref !== 'string'), badPayloadJSON)
    _checkState(!payload.out.some(hash => typeof hash !== 'string'), badPayloadJSON)
    _checkState(!payload.del.some(hash => typeof hash !== 'string'), badPayloadJSON)
    _checkState(!payload.cmds.some(hash => typeof hash !== 'object'), badPayloadJSON)

    return payload
  } catch (e) {
    _checkState(false, badPayloadJSON)
  }
}

// ------------------------------------------------------------------------------------------------

Loader._payload = _payload

module.exports = Loader
