/**
 * loader.js
 *
 * Loads a jig and its dependencies
 */

const bsv = require('bsv')
const { Transaction } = bsv
const Log = require('../util/log')
const { _assert, _parentName, _extendsFrom, _text } = require('../util/misc')
const { _location } = require('../util/bindings')
const Repository = require('./repository')
const Codec = require('../util/codec')
const Sandbox = require('../util/sandbox')
const Membrane = require('./membrane')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Load'

// ------------------------------------------------------------------------------------------------
// Loader
// ------------------------------------------------------------------------------------------------

/**
 * Notes
 *  - Jigs are conserved in a loader instance. They won't be recreated from the cache twice.
 *  - Imports of any kind (jigs, berry plucks) use different loaders for safety.
 *  - There may be duplicate inner jigs when importing. They are still safe to use.
 */
class Loader {
  constructor (kernel, importLimit = undefined) {
    const { _ImportLimit } = require('./import')

    _assert(kernel)

    this._loads = new Map() // Location -> Promise<Jig>
    this._firstLoad = true
    this._completers = []
    this._importLimit = importLimit || new _ImportLimit()
    this._kernel = kernel
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
    // Save this._loading so we know when we're returning back to the user
    const firstLoad = this._firstLoad
    this._firstLoad = false

    // Piggy back on an existing load if there is one.
    // Except when there's a berry class. The location is incomplete then.
    if (!BerryClass) {
      const prev = this._loads.get(location)
      if (prev) return prev
    }

    // Start a new load. This may partially load the jig and put it into the partial set.
    const promise = this._loadFresh(location, BerryClass)

    // Save the promise so future loads won't load the same jig twice
    // Except when there's a berry class. Same reason as above.
    if (!BerryClass) {
      this._loads.set(location, promise)
    }

    // Wait for the load to finish
    const jig = await promise

    // If we are returning to the user, complete all loads. Completers might create completers.
    if (firstLoad) {
      while (this._completers.length) {
        const completers = this._completers
        this._completers = []
        await Promise.all(completers)
      }

      // Back to the user
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
      return this._loadWithBerryClass(location, BerryClass)
    }

    // Parse the location
    const loc = _location(location)

    // Check that the location is not an error or in a record
    const badLocation = `Bad location: ${location}`
    _assert(!loc.error, badLocation)
    _assert(!loc.record, badLocation)

    // If the location is native, get and return it right away
    if (loc.native) {
      return this._loadNative(location)
    }

    // If non-native, check that we can load it
    _assert(loc.txid, badLocation)
    _assert(!('vjig' in loc), badLocation)

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

    // Get the transaction and payload if we are laoding a non-berry
    const rawtx = await this._kernel._blockchain.fetch(txid)
    const tx = new Transaction(rawtx)

    // Extract the payload
    const Record = require('./record')
    const payload = Record._payload(tx)

    // Check that our location is in range
    const hasVout = typeof vout === 'number' && vout >= 1 && vout <= payload.out.length
    const hasVdel = typeof vdel === 'number' && vdel >= 0 && vdel < payload.del.length
    _assert(hasVout || hasVdel, `Jig does not exist: ${location}`)

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
    const record = await _import(tx, payload, true /* published */, null /* jigToSync */, this._importLimit)

    // Get the jig out of the record. Outputs are 1-indexed b/c of the payload.
    if (typeof vout === 'number' && vout >= 1 && vout <= record._outputs.length) {
      return record._outputs[vout - 1]
    }
    if (typeof vdel === 'number' && vdel >= 0 && vdel <= record._deletes.length - 1) {
      return record._deletes[vdel]
    }

    // No luck. No jig.
    throw new Error(`Jig not found: ${location}`)
  }

  // --------------------------------------------------------------------------
  // _loadWithBerryClass
  // --------------------------------------------------------------------------

  /**
   * Loads a jig using the user-provided berry class
   */
  async _loadWithBerryClass (location, BerryClass) {
    const Berry = require('./berry')

    // Check that BerryClass extends from Berry
    _assert(_extendsFrom(BerryClass, Berry), 'Berry class must extend from Berry')

    // Find or install the berry class
    const B = Repository._active()._install(BerryClass)

    // See if the berry class is already deployed. We might be able to fast-track the load.
    const Blocation = Membrane._sudo(() => B.location)
    const Bloc = _location(Blocation)
    const hasLocation = !Bloc.record && !Bloc.error && Bloc.txid
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

  _loadNative (location) {
    const { native } = _location(location)

    const NativeCode = Repository._native()._getByLocation(native)
    _assert(NativeCode, `Native code not found: ${location}`)

    const isDep = Repository._native()._isDep(NativeCode)
    _assert(isDep, `${_text(NativeCode)} cannot be a dependency`)

    return NativeCode
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

    // Extract the txid from the key
    const txid = key.split('//')[1].split('_')[0]

    // Check that the hash matches
    if (hash) {
      const stateString = JSON.stringify(state)
      const stateBuffer = new bsv.deps.Buffer(stateString, 'utf8')
      const stateHash = bsv.crypto.Hash.sha256(stateBuffer)
      const stateHashHex = stateHash.toString('hex')
      if (stateHashHex !== hash) throw new Error(`State hash mismatch for ${key}`)
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
      default: throw new Error(`Unknown jig kind: ${decodedState.kind}`)
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
    const C = Repository._active()._install(S)

    // TODO ... Sglobal is not the global for C
    // Uh oh.

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
        _assert(jig, `Jig not loaded: ${refFullLocation}`)
        return jig
      })
      const redecodedState = codec2._decode(state)

      // Apply the props to the code
      Membrane._sudo(() => {
        Object.assign(C, redecodedState.props)
        if (C.origin.startsWith('_')) C.origin = txid + C.origin
        if (C.location.startsWith('_')) C.location = txid + C.location
      })

      // Apply the dependencies to the global state
      Object.assign(SGlobal, redecodedState.props.deps)
    }

    const promise = complete()
    this._completers.push(promise)

    return C
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

  // --------------------------------------------------------------------------
}

module.exports = Loader
