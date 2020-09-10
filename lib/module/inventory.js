/**
 * inventory.js
 *
 * An object that tracks the jigs and code for the current owner
 */

const Log = require('../util/log')
const bsv = require('bsv')
const { _owner } = require('../util/bindings')
const { _text } = require('../util/misc')
const { _sudo } = require('../run')

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
    this._jigs = []
  }

  // --------------------------------------------------------------------------
  // activate
  // --------------------------------------------------------------------------

  activate (kernel) {
    this.deactivate()

    if (Log._debugOn) Log._debug(TAG, 'Activate')
    this._kernel = kernel

    if (!kernel._listeners.some(x => x._listener === this._listener)) {
      kernel._listeners.push({ _event: 'jig', _listener: this._listener })
    }

    // Kickoff a request to get the lock for this owner which is async
    const nextOwnerPromise = kernel._owner.owner ? kernel._owner.owner() : kernel._owner.nextOwner()

    // Check that this method is indeed async
    if (nextOwnerPromise instanceof Promise) {
      this._lock = null
      this._nextOwnerPromise = nextOwnerPromise
      this._pending = []

      // If getting the owner fails, then disable the inventory
      this._nextOwnerPromise.catch(e => {
        if (this._nextOwnerPromise !== nextOwnerPromise) return
        if (Log._errorOn) Log._error(TAG, `Inventory disabled: ${e}`)
        this._pending = null
      })

      // When we do get an owner, run detect for all pending jigs
      this._nextOwnerPromise.then(owner => {
        if (this._nextOwnerPromise !== nextOwnerPromise) return
        this._lock = _owner(owner)
        if (Log._debugOn) Log._debug(TAG, 'Owner', owner)
        this._pending.forEach(jig => this._detect(jig))
        this._pending = null
      })
    } else {
      // If the nextOwner method is not async, then we should just have a lock
      this._lock = _owner(nextOwnerPromise)
    }
  }

  // --------------------------------------------------------------------------
  // deactivate
  // --------------------------------------------------------------------------

  deactivate () {
    if (!this._kernel) return

    if (Log._debugOn) Log._debug(TAG, 'Deactivate')

    this._kernel._listeners = this._kernel._listeners.filter(x => x._listener === this._listener)

    this._kernel = null
    this._lock = null
    this._nextOwnerPromise = null
    this._pending = null
  }

  // --------------------------------------------------------------------------
  // jigs
  // --------------------------------------------------------------------------

  get jigs () {
    this._filterNotOurs()
    const Jig = require('../kernel/jig')
    return this._jigs.filter(x => x instanceof Jig)
  }

  // --------------------------------------------------------------------------
  // code
  // --------------------------------------------------------------------------

  get code () {
    this._filterNotOurs()
    const Code = require('../kernel/code')
    return this._jigs.filter(x => x instanceof Code)
  }

  // --------------------------------------------------------------------------
  // sync
  // --------------------------------------------------------------------------

  async sync () {
    if (Log._infoOn) Log._info(TAG, 'Sync')

    // Wait to get an owner lock. Otherwise, we can't detect jigs.
    if (this._nextOwnerPromise) await this._nextOwnerPromise

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
    const script = new bsv.Script(bsv.deps.Buffer.from(this._lock.script())).toString('hex')
    const utxos = await this._kernel._blockchain.utxos(script)
    const locations = utxos.map(utxo => `${utxo.txid}_o${utxo.vout}`)
    console.log('-------------------------')
    console.log(locations)
    console.log('-------------------------')
    /*
    // Remove resources that are not in our new locations, but were deployed
    const toRemove = []
    const existing = []

    JigControl._disableSafeguards(() => {
      // Iterate over values because the keys might be stale
      for (const resource of this._resources.values()) {
        if (resource.location.startsWith('_')) {
          existing.push(resource)
        } else if (errored(resource) || !this._ours(resource)) {
          toRemove.push(resource)
        } else if (!locationsSet.has(resource.location)) {
          toRemove.push(resource)
        } else {
          existing.push(resource)
        }
      }
    })

    _allowInconsistentWorldview(() => {
      toRemove.forEach(resource => {
        const removed = this._resources.delete(resource)
        if (removed && Log._infoOn) Log._info(TAG, 'Removed', _text(resource))
      })
    })

    const existingLocations = new Set(JigControl._disableSafeguards(
      () => existing.map(resource => resource.location)))

    for (const location of locations) {
      // Keep existing resources in the inventory when there are no updates
      if (existingLocations.has(location)) continue

      // Try loading the resource, but if it fails to load, just move on to the next.
      // Otherwise, bad actors could crash apps by sending users jigs that don't load.
      let resource = null
      try {
        resource = await this._kernel._load(location)
      } catch (e) {
        if (Log._warnOn) Log._warn(TAG, `Failed to load owner location ${location}\n\n${e.toString()}`)
        continue
      }

      _allowInconsistentWorldview(() => {
        // This will prefer the existing resource, because it's likely to be the latest
        const had = this._resources.has(resource)
        this._resources.add(resource)
        if (!had && Log._infoOn) Log._info(TAG, 'Added', _text(resource))
      })
    }
      */
  }

  // --------------------------------------------------------------------------

  _detect (jig) {
    // If we don't have a lock yet, add this jig to a pending set to detect soon
    if (!this._lock && this._pending) {
      this._pending.push(jig)
      return
    }

    // Delete and re-add jigs if they are still ours to avoid duplicates
    const had = this._jigs.includes(x => this._sameOrigin(x, jig))
    if (had) this._jigs = this._jigs.filter(x => !this._sameOrigin(x, jig))

    // If not ours, nothing to do
    if (this._ours(jig)) {
      if (!had && Log._infoOn) Log._info(TAG, 'Add', _text(jig))
      this._jigs.push(jig)
    } else {
      if (had && Log._infoOn) Log._info(TAG, 'Remove', _text(jig))
    }
  }

  // --------------------------------------------------------------------------

  _sameOrigin (x, y) {
    if (x === y) return true
    const xOrigin = _sudo(() => x.origin)
    if (xOrigin.startsWith('error://')) return false
    const yOrigin = _sudo(() => x.origin)
    return xOrigin === yOrigin
  }

  // --------------------------------------------------------------------------

  _ours (jig) {
    try {
      const jigLock = _owner(jig.owner)
      const jigScript = jigLock.script()
      const ourScript = this._lock.script()
      if (jigScript.length !== ourScript.length) return false
      for (let i = 0; i < jigScript.length; i++) {
        if (jigScript[i] !== ourScript[i]) return false
      }
      return true
    } catch (e) {
      return false
    }
  }

  // --------------------------------------------------------------------------

  _filterNotOurs () {
    this._jigs = this._jigs.filter(jig => {
      if (this._ours(jig)) return true
      if (Log._infoOn) Log._info(TAG, 'Remove', _text(jig))
      return false
    })
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Inventory
