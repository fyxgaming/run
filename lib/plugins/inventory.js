/**
 * inventory.js
 *
 * An object that tracks the jigs and code for the current owner
 */

const Log = require('../util/log')
const { _owner } = require('../util/bindings')
const { _text, _Timeout } = require('../util/misc')
const { _sudo } = require('../util/admin')
const { TimeoutError, RequestError, TrustError } = require('../util/errors')
const { _scripthash } = require('../util/bsv')
const RunDB = require('./run-db')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Inventory'

// ------------------------------------------------------------------------------------------------
// Inventory
// ------------------------------------------------------------------------------------------------

class Inventory {
  constructor () {
    this._listener = (event, data) => this._detect(data)
    this._creations = []
  }

  // --------------------------------------------------------------------------
  // activate
  // --------------------------------------------------------------------------

  activate (run) {
    this.deactivate()

    if (Log._debugOn) Log._debug(TAG, 'Activate')
    this._run = run

    run.on('update', this._listener)
    run.on('publish', this._listener)
    run.on('sync', this._listener)

    this._lock = null
    this._pending = []

    // This wrapper avoids the unhandled promise rejection warnings in node
    const initOwner = async () => {
      try {
        const owner = await run._kernel._ownerAPI().nextOwner()
        if (this._initOwner !== initOwner) return
        this._lock = _owner(owner)
        if (Log._debugOn) Log._debug(TAG, 'Owner', owner)
        if (this._pending) this._pending.forEach(creation => this._detect(creation))
        this._pending = null
      } catch (e) {
        if (this._initOwner !== initOwner) return
        if (Log._errorOn) Log._error(TAG, `Inventory disabled: ${e}`)
        this._pending = null
      }
    }

    this._initOwner = initOwner
    this._initOwnerDone = initOwner()
  }

  // --------------------------------------------------------------------------
  // deactivate
  // --------------------------------------------------------------------------

  deactivate () {
    if (!this._run) return

    if (Log._debugOn) Log._debug(TAG, 'Deactivate')

    this._run.off('update', this._listener)
    this._run.off('publish', this._listener)
    this._run.off('sync', this._listener)

    this._run = null
    this._lock = null
    this._pending = null
    this._initOwnerDone = null
  }

  // --------------------------------------------------------------------------
  // jigs
  // --------------------------------------------------------------------------

  get jigs () {
    this._filterNotOurs()
    const Jig = require('../kernel/jig')
    return this._creations.filter(x => x instanceof Jig)
  }

  // --------------------------------------------------------------------------
  // code
  // --------------------------------------------------------------------------

  get code () {
    this._filterNotOurs()
    const Code = require('../kernel/code')
    return this._creations.filter(x => x instanceof Code)
  }

  // --------------------------------------------------------------------------
  // sync
  // --------------------------------------------------------------------------

  async sync () {
    if (Log._infoOn) Log._info(TAG, 'Sync')

    // Wait to get an owner lock. Otherwise, we can't detect our creations.
    if (this._initOwnerDone) await this._initOwnerDone

    // Make sure we have a lock
    if (!this._lock) return

    // One sync at a time
    if (this._sync) return this._sync

    // Lock if off and return the promise
    this._sync = this._syncLatest()
      .then(() => { this._sync = null })
      .catch(e => { this._sync = null; throw e })

    return this._sync
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  async _syncLatest () {
    let locations

    if (this._run.client && this._run.cache instanceof RunDB) {
      const script = this._lock.script()
      const scripthash = await _scripthash(script)
      locations = await this._run.cache.unspent(scripthash)
    } else {
      const script = this._lock.script()
      const utxos = await this._run.blockchain.utxos(script)
      locations = utxos.map(utxo => `${utxo.txid}_o${utxo.vout}`)
    }

    // Get current locations of creations in the inventory
    const existingLocations = _sudo(() => this._creations.map(creation => creation.location))

    // Create a shared loader with a shared timeout
    const Loader = require('../kernel/loader')
    const timeout = new _Timeout('inventory sync', this._run._kernel.timeout)
    const loader = new Loader(this._run._kernel, timeout)

    // Add all new creations we don't know about
    for (const location of locations) {
      // Keep existing creations in the inventory when there are no updates
      if (existingLocations.includes(location)) continue

      // Check if we've previously tried to load this creation and it failed. Don't try again.
      try {
        const value = await this._run.cache.get(`ban://${location}`)
        if (typeof value === 'object' && (!value.untrusted || !(await this._run._kernel._trusted(value.untrusted)))) continue
        await this._run.cache.set(`ban://${location}`, undefined)
      } catch (e) {
        // Swallow cache get failures by default
        if (Log._warnOn) Log._warn(TAG, `Swallowing failure check cache ban://${location}`, e.toString())
      }

      // Try loading the creation, but if it fails to load, just move on to the next.
      // Otherwise, baddies might crash apps by sending users creations that don't load.
      let creation = null
      try {
        creation = await loader._load(location)
      } catch (e) {
        // Timeout and Request errors are intermittent errors and should not be swalloed
        if (e instanceof TimeoutError) throw e
        if (e instanceof RequestError) throw e

        // Assume all other errors are due to non-creation utxos
        if (Log._warnOn) Log._warn(TAG, `Failed to load ${location}\n\n${e.toString()}`)
        try {
          const value = { reason: e.toString(), untrusted: e instanceof TrustError ? e.txid : undefined }
          await this._run.cache.set(`ban://${location}`, value)
        } catch (e) {
          // Swallow cache set failures by default
          if (Log._warnOn) Log._warn(TAG, `Swallowing failure to cache set ban://${location}`, e.toString())
        }
        continue
      }

      this._detect(creation)
    }

    // Remove creations that are not ours
    this._filterNotOurs()
  }

  // --------------------------------------------------------------------------

  _detect (creation) {
    // If we don't have a lock yet, add this creation to a pending set to redetect once there's an owner
    // We will run the remaining detection because if owner is undefined, it will be ours.
    if (!this._lock && this._pending) this._pending.push(creation)

    // If there is an existing creation, prefer the newer one
    const existing = this._creations.find(x => this._sameOrigin(x, creation))
    if (existing && _sudo(() => existing.nonce > creation.nonce)) return

    // Remove the existing creation. We will prefer our new one.
    this._creations = this._creations.filter(x => x !== existing)

    if (this._ours(creation)) {
      if (!existing && Log._infoOn) Log._info(TAG, 'Add', _text(creation))
      this._creations.push(creation)
    } else {
      if (existing && Log._infoOn) Log._info(TAG, 'Remove', _text(creation))
    }
  }

  // --------------------------------------------------------------------------

  _sameOrigin (x, y) {
    if (x === y) return true
    const xOrigin = _sudo(() => x.origin)
    const yOrigin = _sudo(() => y.origin)
    if (xOrigin.startsWith('error://')) return false
    if (yOrigin.startsWith('error://')) return false
    return xOrigin === yOrigin
  }

  // --------------------------------------------------------------------------

  _ours (creation) {
    try {
      // Errored creations are not owned because they can't be used
      if (_sudo(() => creation.location).startsWith('error://')) return false

      // Assume creations with undefined owners will become ours
      const creationOwner = _sudo(() => creation.owner)
      if (typeof creationOwner === 'undefined') return true

      // If we don't have a lock, and its owned by another, its not ours
      if (!this._lock) return false

      // Otherwise, check the scripts that will be generated
      const creationLock = _owner(creationOwner)
      const creationScript = creationLock.script()
      const ourScript = this._lock.script()
      return creationScript === ourScript
    } catch (e) {
      return false
    }
  }

  // --------------------------------------------------------------------------

  _filterNotOurs () {
    this._creations = this._creations.filter(creation => {
      if (this._ours(creation)) return true
      if (Log._infoOn) Log._info(TAG, 'Remove', _text(creation))
      return false
    })
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Inventory
