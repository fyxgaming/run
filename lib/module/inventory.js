/**
 * inventory.js
 *
 * An object that tracks the jigs and code for the current owner
 */

const Log = require('../util/log')
const bsv = require('bsv')
const { _owner } = require('../util/bindings')
const { _text, _Timeout } = require('../util/misc')
const { _sudo } = require('../util/admin')
const Unbound = require('../util/unbound')

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

  activate (run) {
    this.deactivate()

    if (Log._debugOn) Log._debug(TAG, 'Activate')
    this._run = run

    run.on('record', this._listener)
    run.on('commit', this._listener)
    run.on('publish', this._listener)
    run.on('rollback', this._listener)

    // Kickoff a request to get the lock for this owner which is async
    const nextOwnerPromise = run.owner.owner ? run.owner.owner() : run.owner.nextOwner()

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
        this._nextOwnerPromise = null
      })

      // When we do get an owner, run detect for all pending jigs
      this._nextOwnerPromise.then(owner => {
        if (this._nextOwnerPromise !== nextOwnerPromise) return
        this._lock = _owner(owner)
        if (Log._debugOn) Log._debug(TAG, 'Owner', owner)
        this._pending.forEach(jig => this._detect(jig))
        this._pending = null
        this._nextOwnerPromise = null
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
    if (!this._run) return

    if (Log._debugOn) Log._debug(TAG, 'Deactivate')

    this._run.off('publish', this._listener)
    this._run.off('commit', this._listener)
    this._run.off('rollback', this._listener)

    this._run = null
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
    const utxos = await this._run.blockchain.utxos(script)
    const locations = utxos.map(utxo => `${utxo.txid}_o${utxo.vout}`)

    // Get locations of jigs we do own
    const existingLocations = _sudo(() => this._jigs.map(jig => jig.location))

    // Create a shared loader with a shared timeout
    const Loader = require('../kernel/loader')
    const timeout = new _Timeout('inventory sync', this._run._kernel.timeout)
    const loader = new Loader(this._run._kernel, timeout)

    // Add all new jigs we don't know about
    for (const location of locations) {
      // Keep existing jigs in the inventory when there are no updates
      if (existingLocations.includes(location)) continue

      // Try loading the jig, but if it fails to load, just move on to the next.
      // Otherwise, baddies might crash apps by sending users jigs that don't load.
      let jig = null
      try {
        jig = await loader._load(location)
      } catch (e) {
        if (Log._warnOn) Log._warn(TAG, `Failed to load ${location}\n\n${e.toString()}`)
        continue
      }

      this._detect(jig)
    }

    // Remove jigs that are not ours
    this._filterNotOurs()
  }

  // --------------------------------------------------------------------------

  _detect (jig) {
    // If we don't have a lock yet, add this jig to a pending set to redetect once there's an owner
    // We will run the remaining detection because if owner is undefined, it will be ours.
    if (!this._lock && this._pending) this._pending.push(jig)

    // If there is an existing jig, prefer the newer one
    const existing = this._jigs.find(x => this._sameOrigin(x, jig))
    if (existing && _sudo(() => existing.nonce > jig.nonce)) return

    this._jigs = this._jigs.filter(x => x !== existing)

    if (this._ours(jig)) {
      if (!existing && Log._infoOn) Log._info(TAG, 'Add', _text(jig))
      this._jigs.push(jig)
    } else {
      if (existing && Log._infoOn) Log._info(TAG, 'Remove', _text(jig))
    }
  }

  // --------------------------------------------------------------------------

  _sameOrigin (x, y) {
    if (x === y) return true
    const xOrigin = _sudo(() => x.origin)
    if (xOrigin.startsWith('error://')) return false
    const yOrigin = _sudo(() => y.origin)
    return xOrigin === yOrigin
  }

  // --------------------------------------------------------------------------

  _ours (jig) {
    try {
      // Errored jigs are not owned because they can't be used
      if (_sudo(() => jig.location).startsWith('error://')) return false

      // Jigs with undefined unbound owners will become ours
      let jigOwner = _sudo(() => jig.owner)
      if (jigOwner instanceof Unbound) jigOwner = jigOwner._value
      if (jigOwner === undefined) return true

      // Otherwise, check the scripts that will be generated
      const jigLock = _owner(jigOwner)
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
