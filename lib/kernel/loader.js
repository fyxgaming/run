/**
 * loader.js
 *
 * Loads a jig or berry and all its dependencies in parallel
 */

const bsv = require('bsv')
const { Transaction } = bsv
const Log = require('../util/log')
const { _assert, _extendsFrom, _text, _checkState, _checkArgument, _Timeout } = require('../util/misc')
const { _location, _UNDEPLOYED } = require('../util/bindings')
const { _sudo } = require('../util/admin')
const Sandbox = require('../sandbox/sandbox')
const { ArgumentError } = require('../util/errors')
const Code = require('./code')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Loader'

// We try not to duplicate imports. Even if we can't re-use their jigs, it's better for one import
// to wait for the other so that the cache is hydrated. Because importing is very expensive.
const ALL_IMPORTS = new Map() // txid -> Promise

// Current berry class being plucked
let PLUCK_CLASS = null

// Current berry location being plucked
let PLUCK_LOCATION = null

// ------------------------------------------------------------------------------------------------
// Loader
// ------------------------------------------------------------------------------------------------

/**
 * Notes
 *  - A loader will load new jigs for its instance, but within a loader, jigs may be de-duped.
 *  - Imports of any kind (jigs, berry plucks) use different loaders for safety.
 *  - There may be duplicate inner jigs created when importing. These are still safe to use.
 *  - State cache jigs are loaded in two phases. Completers store a promise for the second phase.
 */
class Loader {
  constructor (kernel, timeout = new _Timeout('load', kernel._timeout)) {
    _assert(kernel)

    // Promises for the individual loads in progress
    this._loads = new Map() // Location -> Promise<Jig>

    // Promises for imports in progress
    this._imports = new Map() // Txid -> Promise<Commit>

    // Promises to complete any partial loads
    this._completers = []

    // The kernel used to load
    this._kernel = kernel

    // Save the timeout
    this._timeout = timeout
  }

  // --------------------------------------------------------------------------
  // _load
  // --------------------------------------------------------------------------

  /**
   * Loads a jig or berry at a location
   *
   * BerryClass forces the berry to be plucked using that class, whether deployed or not.
   */
  async _load (location, BerryClass, inner = false) {
    this._timeout._check()

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
    if (!inner) {
      while (this._completers.length) {
        const completers = this._completers
        this._completers = []
        await Promise.all(completers)
      }
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
    this._timeout._check()

    if (BerryClass) {
      if (Log._infoOn) Log._info(TAG, 'Load', location, 'with', _text(BerryClass))
    } else {
      if (Log._infoOn) Log._info(TAG, 'Load', location)
    }

    const start = new Date()

    try {
    // If the user specified a berry class, use it to load the location
      if (BerryClass) {
        return await this._loadWithUserBerryClass(location, BerryClass)
      }

      // Parse the location
      const loc = _location(location)

      // Check that the location is not an error or in a commit
      const badLocation = `Bad location: ${location}`
      _checkArgument(!loc.error, badLocation)
      _checkArgument(!loc.commitid, badLocation)
      _checkArgument(!loc.recordid, badLocation)

      // If the location is native, get and return it right away
      if (loc.nativeid) {
        return this._loadNative(location)
      }

      // If non-native, check that we can load it
      _checkArgument(loc.txid, badLocation)

      // Load the jig, code, or berry from its location
      if (loc.berry) {
        return await this._loadBerryFromLocation(location)
      } else {
        return await this._loadJigFromLocation(location)
      }
    } finally {
      if (Log._debugOn) Log._debug(TAG, 'Load (end): ' + (new Date() - start) + 'ms')
    }
  }

  // --------------------------------------------------------------------------
  // _loadBerryFromLocation
  // --------------------------------------------------------------------------

  async _loadBerryFromLocation (location) {
    this._timeout._check()

    const { _recreate } = require('./state')

    // Try loading from the cache first
    const key = `berry://${location}`
    const partial = await _recreate(key, undefined, this)
    if (partial) {
      this._completers.push(partial.completer)
      return partial._value
    }

    // No cache. Load the berry class. Fresh loader b/c we can't wait for completions.
    const berryClassLocation = location.slice(0, location.lastIndexOf('_'))
    const loader = new Loader(this._kernel, this._timeout)
    const BerryClass = await loader.load(berryClassLocation)

    // Pluck the damn berry
    const path = _location(location).berry
    return this._pluckBerry(path, BerryClass)
  }

  // --------------------------------------------------------------------------
  // _loadJigFromLocation
  // --------------------------------------------------------------------------

  async _loadJigFromLocation (location) {
    this._timeout._check()

    const { txid, vout, vdel } = _location(location)

    // Get the transaction and payload if we are loading a non-berry
    const rawtx = await this._kernel._blockchainAPI().fetch(txid)
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
    const { _recreate } = require('./state')
    const partial = await _recreate(key, hash, this)
    if (partial) {
      this._completers.push(partial._completer)
      return partial._value
    }

    // Import the tx to load the jig. Slow!
    return this._loadJigViaReplay(tx, payload, location)
  }

  // --------------------------------------------------------------------------
  // _loadJigViaReplay
  // --------------------------------------------------------------------------

  async _loadJigViaReplay (tx, payload, location) {
    this._timeout._check()

    _checkState(!this._kernel._client, `Cannot load ${location}\n\nOnly cached jigs may be loaded in client mode`)

    const { txid, vout, vdel } = _location(location)

    let commit = null

    if (this._imports.has(txid)) {
      // If this loader instanceof importing, then we re-use the resulting jigs.
      commit = await this._imports.get(txid)
    } else if (ALL_IMPORTS.has(txid)) {
      // If another import of this txid is in progress wait for that and then load again
      // Because that import should add this jig to the cache. Then we can recreate.
      await ALL_IMPORTS.get(txid)

      return await this._loadJigFromLocation(location)
    } else {
      try {
        // Import the commit
        const _import = require('./import')
        const published = true
        const jigToSync = null
        const preverify = false
        const promise = _import(tx, txid, payload, this._kernel, published, jigToSync, this._timeout, preverify)

        this._imports.set(txid, promise)
        ALL_IMPORTS.set(txid, promise)

        commit = await promise
      } finally {
        this._imports.delete(txid)
        ALL_IMPORTS.delete(txid)
      }
    }

    // Notify about jigs from the import
    commit._outputs.forEach(jig => this._kernel._emit('load', jig))
    commit._deletes.forEach(jig => this._kernel._emit('load', jig))

    // Get the jig out of the commit. Outputs are 1-indexed b/c of the payload.
    if (typeof vout === 'number' && vout >= 1 && vout <= commit._outputs.length) {
      return commit._outputs[vout - 1]
    }
    if (typeof vdel === 'number' && vdel >= 0 && vdel <= commit._deletes.length - 1) {
      return commit._deletes[vdel]
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
    this._timeout._check()

    const Berry = require('./berry')
    const { _recreate } = require('./state')

    // Check that BerryClass extends from Berry
    _checkArgument(_extendsFrom(BerryClass, Berry), 'Berry class must extend from Berry')

    // Find or install the berry class
    const B = new Code(BerryClass)

    // See if the berry class is already deployed. We might be able to fast-track the load.
    const Blocation = _sudo(() => B.location)
    const Bloc = _location(Blocation)
    const hasLocation = !Bloc.commitid && !Bloc.recordid && !Bloc.error && Bloc.txid
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
      const berry = await _recreate(key, undefined, this)
      if (berry) return berry

      // If nothing in the cache, pluck the berry
      const path = location
      return this._pluckBerry(path, B)
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
   * Recreates a berry from scratch using a berry class's pluck function
   */
  async _pluckBerry (path, BerryClass) {
    this._timeout._check()

    _assert(BerryClass instanceof Code)

    // Create the secure fetch function
    const fetchCode = 'async function() { return await b.fetch(txid) }'
    const fetchEnv = { b: this._kernel._blockchainAPI() }
    const [fetch] = Sandbox._evaluate(fetchCode, fetchEnv)

    // Save the current pluck class and location to restore afterward. Enables recursion.
    const savedPluckClass = PLUCK_CLASS
    const savedPluckLocation = PLUCK_LOCATION

    try {
      // Determine the berry's location. Undeployed berry clases are errors.
      if (_sudo(() => _location(BerryClass.location)).txid) {
        PLUCK_LOCATION = `${_sudo(() => BerryClass.location)}_${path}`
      } else {
        PLUCK_LOCATION = _UNDEPLOYED
      }

      // Set the pluck class
      PLUCK_CLASS = BerryClass

      // Pluck the berry
      const berry = await BerryClass.pluck(path, fetch)

      // Check the berry is allowed for this berry class
      _checkState(berry.constructor === BerryClass, 'Berry must be an instanceof its berry class')

      // TODO: Cache the berry

      return berry
    } finally {
      PLUCK_LOCATION = savedPluckLocation
      PLUCK_CLASS = savedPluckClass
    }
  }

  // --------------------------------------------------------------------------
  // _loadNative
  // --------------------------------------------------------------------------

  /**
   * Specifically loads a built-in class as a dependency
   *
   * Example: native://Jig
   */
  _loadNative (location) {
    this._timeout._check()

    const { nativeid } = _location(location)

    // Find the native code
    const C = Code._lookupByNativeId(nativeid)
    _checkArgument(C, `Native code not found: ${nativeid}`)

    // Make sure it's not internal
    const editor = Code._editor(C)
    _checkArgument(!editor._internal, `${_text(C)} cannot be a dependency`)

    // Return the jig
    return C
  }
}

// ------------------------------------------------------------------------------------------------
// _payload
// ------------------------------------------------------------------------------------------------

function _payload (tx) {
  const { _PROTOCOL_VERSION } = require('./publish')

  const badProtocol = 'Not a run transaction: invalid op_return protocol'
  const badVersion = 'Not a run transaction: unsupported run version'
  const badPayload = 'Not a run transaction: invalid run payload'

  _checkState(tx.outputs.length, badProtocol)

  const chunks = tx.outputs[0].script.chunks

  _checkState(chunks.length >= 6, badProtocol)
  _checkState(chunks[0].opcodenum === 0, badProtocol) // OP_FALSE
  _checkState(chunks[1].opcodenum === 106, badProtocol) // OP_RETURN
  _checkState(chunks[2].buf.toString() === 'run', badProtocol)

  const protocolHex = Buffer.from([_PROTOCOL_VERSION]).toString('hex')
  _checkState(chunks[3].buf.toString('hex') === protocolHex, badVersion)

  try {
    const json = chunks[5].buf.toString('utf8')
    const payload = JSON.parse(json)

    _checkState(typeof payload.in === 'number', badPayload)
    _checkState(Array.isArray(payload.ref), badPayload)
    _checkState(Array.isArray(payload.out), badPayload)
    _checkState(Array.isArray(payload.del), badPayload)
    _checkState(Array.isArray(payload.cre), badPayload)
    _checkState(Array.isArray(payload.exec), badPayload)

    _checkState(!payload.ref.some(ref => typeof ref !== 'string'), badPayload)
    _checkState(!payload.out.some(hash => typeof hash !== 'string'), badPayload)
    _checkState(!payload.del.some(hash => typeof hash !== 'string'), badPayload)
    _checkState(!payload.exec.some(hash => typeof hash !== 'object'), badPayload)

    return payload
  } catch (e) {
    _checkState(false, badPayload)
  }
}

// ------------------------------------------------------------------------------------------------
// _nextBerryLocation
// ------------------------------------------------------------------------------------------------

function _nextBerryLocation (BerryClass) {
  // Check that the protocol matches
  if (!PLUCK_CLASS || PLUCK_CLASS !== BerryClass) {
    throw new Error('Must only create berry from its berry class')
  }

  // Check that there is a valid location remaining
  if (!PLUCK_LOCATION) throw new Error('Must only pluck one berry at a time')

  const location = PLUCK_LOCATION
  PLUCK_LOCATION = null
  return location
}

// ------------------------------------------------------------------------------------------------

Loader._payload = _payload
Loader._nextBerryLocation = _nextBerryLocation

module.exports = Loader
