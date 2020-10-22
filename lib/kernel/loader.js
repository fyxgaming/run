/**
 * loader.js
 *
 * Loads a creation and all its dependencies in parallel
 */

const bsv = require('bsv')
const { Transaction } = bsv
const Log = require('../util/log')
const { _assert, _extendsFrom, _text, _Timeout } = require('../util/misc')
const { _location, _UNDEPLOYED_LOCATION } = require('../util/bindings')
const { _sudo } = require('../util/admin')
const Sandbox = require('../sandbox/sandbox')
const { ArgumentError, StateError } = require('../util/errors')
const Code = require('./code')
const Editor = require('./editor')
const SI = Sandbox._intrinsics
const HI = Sandbox._hostIntrinsics

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Loader'

// We try not to duplicate replays. Even if we can't re-use their jigs, it's better for one replay
// to wait for the other so that the cache is hydrated. Because replaying is very expensive.
const ALL_REPLAYS = new Map() // txid -> Promise

// Current berry class being plucked
let PLUCK_CLASS = null

// Current berry location being plucked
let PLUCK_LOCATION = null

// Berry loading errors - any errors fail all because with async we can't distinguish
let PLUCK_COUNT = 0
let PLUCK_ERROR = null

// ------------------------------------------------------------------------------------------------
// Loader
// ------------------------------------------------------------------------------------------------

/**
 * Notes
 *  - A loader will load new jigs for its instance, but within a loader, jigs may be de-duped.
 *  - Replays of any kind (jigs, berry plucks) use different loaders for safety.
 *  - There may be duplicate inner jigs created when replaying. These are still safe to use.
 *  - State cache jigs are loaded in two phases. Completers store a promise for the second phase.
 */
class Loader {
  constructor (kernel, timeout = new _Timeout('load', kernel._timeout)) {
    _assert(kernel)

    // Promises for the individual loads in progress
    this._loads = new Map() // Location -> Promise<Jig>

    // Promises for replays in progress
    this._replays = new Map() // Txid -> Promise<Commit>

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
    try {
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
    } catch (e) {
      if (PLUCK_COUNT) PLUCK_ERROR = PLUCK_ERROR || e
      throw e
    }
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
      if (loc.error || loc.commitid || loc.recordid) {
        throw new ArgumentError(`Bad location: ${location}`)
      }

      // If the location is native, get and return it right away
      if (loc.nativeid) {
        return this._loadNative(location)
      }

      // If non-native, check that we can load it
      if (!loc.txid) throw new ArgumentError(`Bad location: ${location}`)

      // Load the jig, code, or berry from its location
      if (typeof loc.berry !== 'undefined') {
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
      this._completers.push(partial._completer)
      return partial._value
    }

    // No cache. Load the berry class. Fresh loader b/c we can't wait for completions.
    const berryClassLocation = location.slice(0, location.lastIndexOf('_'))
    const loader = new Loader(this._kernel, this._timeout)
    const BerryClass = await loader._load(berryClassLocation)

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
    if (!hasVout && !hasVdel) throw new ArgumentError(`Jig does not exist: ${location}`)

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

    // Replay the tx to load the jig. Slow!
    return this._loadJigViaReplay(tx, payload, location)
  }

  // --------------------------------------------------------------------------
  // _loadJigViaReplay
  // --------------------------------------------------------------------------

  async _loadJigViaReplay (tx, payload, location) {
    this._timeout._check()

    if (this._kernel._client) throw new StateError(`Cannot load ${location}\n\nOnly cached jigs may be loaded in client mode`)

    const { txid, vout, vdel } = _location(location)

    let commit = null

    if (this._replays.has(txid)) {
      // If this loader is already replaying, then we re-use the resulting jigs.
      commit = await this._replays.get(txid)
    } else if (ALL_REPLAYS.has(txid)) {
      // If another relpay of this txid is in progress wait for that and then load again
      // Because that replay should add this jig to the cache. Then we can recreate.
      await ALL_REPLAYS.get(txid)

      return await this._loadJigFromLocation(location)
    } else {
      try {
        // Replay the transaction
        const _replay = require('./replay')
        const published = true
        const jigToSync = null
        const preverify = false
        const promise = _replay(tx, txid, payload, this._kernel, published, jigToSync, this._timeout, preverify)

        this._replays.set(txid, promise)
        ALL_REPLAYS.set(txid, promise)

        commit = await promise
      } finally {
        this._replays.delete(txid)
        ALL_REPLAYS.delete(txid)
      }
    }

    // Notify about jigs from the replay
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
  async _loadWithUserBerryClass (path, BerryClass) {
    this._timeout._check()

    const Berry = require('./berry')
    const { _recreate } = require('./state')

    // Check that BerryClass extends from Berry
    if (!_extendsFrom(BerryClass, Berry)) throw new ArgumentError('Berry class must extend from Berry')

    // Check that the path is valid
    if (typeof path !== 'string') throw new ArgumentError('Berry path must be a string')

    // Find or install the berry class
    const B = Editor._lookupOrCreateCode(BerryClass)

    // See if the berry class is already deployed. We might be able to fast-track the load.
    const Blocation = _sudo(() => B.location)
    const Bloc = _location(Blocation)
    const hasLocation = !Bloc.commitid && !Bloc.recordid && !Bloc.error && Bloc.txid
    const fullLocation = hasLocation ? `${Blocation}_${path}` : undefined

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
      const partial = await _recreate(key, undefined, this)
      if (partial) {
        this._completers.push(partial.completer)
        return partial._value
      }

      // If nothing in the cache, pluck the berry
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
  async _pluckBerry (path, B) {
    this._timeout._check()

    _assert(B instanceof Code)

    if (Log._infoOn) Log._info(TAG, 'Pluck', _text(B), path)

    // Create the secure fetch function. Make sure we set CURRENT_RECORD._error
    // in case of fetch errors so that the user code cannot swallow it.
    const fetchCode = `async function(txid) {
      try {
        return await b.fetch(txid)
      } catch (e) {
        se(e)
        throw e
      }
    }`
    const fetchEnv = {
      b: this._kernel._blockchainAPI(),
      se: e => { PLUCK_ERROR = PLUCK_ERROR || e }
    }
    const [fetch] = Sandbox._evaluate(fetchCode, fetchEnv)
    Object.freeze(fetch)

    // Save the current pluck class and location to restore afterward. Enables recursion.
    const savedPluckClass = PLUCK_CLASS
    const savedPluckLocation = PLUCK_LOCATION

    try {
      // Determine the berry's location. Undeployed berry clases are errors.
      const berryClassDeployed = !!_sudo(() => _location(B.location)).txid
      const berryLocation = berryClassDeployed ? `${_sudo(() => B.location)}_${path}` : _UNDEPLOYED_LOCATION

      // Set the pluck class and location to be taken inside pluck()
      PLUCK_LOCATION = berryLocation
      PLUCK_CLASS = B
      PLUCK_COUNT++

      if (PLUCK_ERROR) throw PLUCK_ERROR

      // Pluck the berry
      const promise = B.pluck(path, fetch)
      if (!(promise instanceof SI.Promise || promise instanceof HI.Promise)) {
        throw new StateError('pluck method must be async')
      }
      const berry = await promise

      // Check the berry is allowed for this berry class
      if (!berry || berry.constructor !== B) throw new StateError(`Berry must be an instance of ${_text(B)}`)

      // Cache the berry
      if (berryClassDeployed) {
        const { _captureBerry } = require('./state')
        const state = _captureBerry(berry)
        const key = `berry://${berryLocation}`
        await this._kernel._cacheAPI().set(key, state)
      }

      if (PLUCK_ERROR) throw PLUCK_ERROR

      return berry
    } catch (e) {
      PLUCK_ERROR = PLUCK_ERROR || e
      throw e
    } finally {
      PLUCK_LOCATION = savedPluckLocation
      PLUCK_CLASS = savedPluckClass
      PLUCK_COUNT--
      if (!PLUCK_COUNT) PLUCK_ERROR = null
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
    const C = Editor._lookupCodeByNativeId(nativeid)
    if (!C) throw new ArgumentError(`Native code not found: ${nativeid}`)

    // Make sure it's not internal
    const editor = Editor._get(C)
    if (editor._internal) throw new ArgumentError(`${_text(C)} cannot be a dependency`)

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

  if (!tx.outputs.length) throw new StateError(badProtocol)

  const chunks = tx.outputs[0].script.chunks

  if (chunks.length < 6) throw new StateError(badProtocol)
  if (chunks[0].opcodenum !== 0) throw new StateError(badProtocol) // OP_FALSE
  if (chunks[1].opcodenum !== 106) throw new StateError(badProtocol) // OP_RETURN
  if (chunks[2].buf.toString() !== 'run') throw new StateError(badProtocol)

  const protocolHex = Buffer.from([_PROTOCOL_VERSION]).toString('hex')
  if (chunks[3].buf.toString('hex') !== protocolHex) throw new StateError(badVersion)

  try {
    const json = chunks[5].buf.toString('utf8')
    const payload = JSON.parse(json)

    if (typeof payload.in !== 'number') throw new StateError(badPayload)
    if (!Array.isArray(payload.ref)) throw new StateError(badPayload)
    if (!Array.isArray(payload.out)) throw new StateError(badPayload)
    if (!Array.isArray(payload.del)) throw new StateError(badPayload)
    if (!Array.isArray(payload.cre)) throw new StateError(badPayload)
    if (!Array.isArray(payload.exec)) throw new StateError(badPayload)

    if (payload.ref.some(ref => typeof ref !== 'string')) throw new StateError(badPayload)
    if (payload.out.some(hash => typeof hash !== 'string')) throw new StateError(badPayload)
    if (payload.del.some(hash => typeof hash !== 'string')) throw new StateError(badPayload)
    if (payload.exec.some(hash => typeof hash !== 'object')) throw new StateError(badPayload)

    return payload
  } catch (e) {
    throw new StateError(badPayload)
  }
}

// ------------------------------------------------------------------------------------------------
// _nextBerryLocation
// ------------------------------------------------------------------------------------------------

function _nextBerryLocation (B) {
  // Check that the protocol matches
  if (!PLUCK_CLASS || PLUCK_CLASS !== B) {
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
