/**
 * loader.js
 *
 * Loads a jig or berry and all its dependencies in parallel
 */

const bsv = require('bsv')
const { Transaction } = bsv
const Log = require('../util/log')
const { _assert, _extendsFrom, _text, _checkState, _checkArgument, _Timeout } = require('../util/misc')
const { _location } = require('../util/bindings')
const { _sudo } = require('../util/admin')
const { ArgumentError } = require('../util/errors')
const Code = require('./code')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Loader'

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

    // Whether this is the top-level load. The first load runs the completers.
    this._firstLoad = true

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
  async _load (location, BerryClass) {
    this._timeout._check()

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
    this._timeout._check()

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
    _checkArgument(!loc.recordid, badLocation)

    // If the location is native, get and return it right away
    if (loc.nativeid) {
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

    const { txid, vout, vdel } = _location(location)

    // Check that the payload can be loaded
    const deploys = payload.exec.some(action => action.op === 'DEPLOY')
    const upgrades = payload.exec.some(action => action.op === 'UPGRADE')
    if ((deploys || upgrades) && !this._kernel._trusts.has(tx.hash) && !this._kernel._trusts.has('*')) {
      const hint = 'Hint: Trust this txid using run.trust if you know it is safe'
      throw new Error(`Cannot load untrusted code\n\n${hint}`)
    }

    let commit = null

    if (this._imports.has(txid)) {
      commit = await this._imports.get(txid)
    } else {
      // Import the commit
      const _import = require('./import')
      const published = true
      const jigToSync = null
      const promise = _import(tx, payload, this._kernel, published, jigToSync, this._timeout)
      this._imports.set(txid, promise)
      try {
        commit = await promise
      } finally {
        this._imports.delete(txid)
      }
    }

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
      return this._pluckBerry(path, BerryClass)
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

    // Parse the location, make sure
    // TODO
    // Cache the berry state once plucked
    return BerryClass.pluck(path)
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
    _checkState(Array.isArray(payload.cre), badPayloadJSON)
    _checkState(Array.isArray(payload.exec), badPayloadJSON)

    _checkState(!payload.ref.some(ref => typeof ref !== 'string'), badPayloadJSON)
    _checkState(!payload.out.some(hash => typeof hash !== 'string'), badPayloadJSON)
    _checkState(!payload.del.some(hash => typeof hash !== 'string'), badPayloadJSON)
    _checkState(!payload.exec.some(hash => typeof hash !== 'object'), badPayloadJSON)

    return payload
  } catch (e) {
    _checkState(false, badPayloadJSON)
  }
}

// ------------------------------------------------------------------------------------------------

Loader._payload = _payload

module.exports = Loader
