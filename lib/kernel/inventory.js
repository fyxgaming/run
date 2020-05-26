/**
 * inventory.js
 *
 * An object that tracks the jigs and code for the current owner
 */

const bsv = require('bsv')
const { JigControl } = require('./jig')
const { ResourceSet, _allowInconsistentWorldview } =
  require('../util/datatypes')
const { _resourceType, _text } = require('../util/misc')
const { _lockify } = require('../util/resource')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Inventory
// ------------------------------------------------------------------------------------------------

const TAG = 'Inventory'

/**
 * Tracks the collection of up-to-date resources for the current owner.
 *
 * When the user changes the owner, a new inventory is created. Users may save and reload the
 * inventories to keep track of the current set of jigs and code.
 */
class Inventory {
  constructor (kernel) {
    this._kernel = kernel
    this._owner = kernel._owner
    this._syncPromise = null
    this._resources = new ResourceSet()
  }

  /**
   * @returns {Array<Jig>} Jigs owned by the current owner. Call sync() to update.
   */
  get jigs () { return this.resources.filter(r => _resourceType(r) === 'jig') }

  /**
   * @returns {Array<function>} Code owned by the current owner. Call sync() to update.
   */
  get code () { return this.resources.filter(r => _resourceType(r) === 'code') }

  /**
   * @returns {Array<*>} All resources owned by the current owner. Call sync() to update.
   */
  get resources () {
    // Gets all resources we own in an array, also removing those that failed to deploy
    const resources = []
    const remove = []

    // Iterate over values because the keys might be stale
    for (const resource of this._resources.values()) {
      if (errored(resource) || !this._ours(resource)) {
        remove.push(resource)
      } else {
        resources.push(resource)
      }
    }

    _allowInconsistentWorldview(() => {
      remove.forEach(resource => {
        const removed = this._resources.delete(resource)
        if (removed) Log._info(TAG, 'Removed', _text(resource))
      })
    })

    return resources
  }

  /**
   * Updates the known set of jigs and code
   */
  async sync () {
    // One sync at a time
    if (this._syncPromise) return this._syncPromise

    this._syncPromise = this._syncLatest()
      .then(() => { this._syncPromise = null })
      .catch(e => { this._syncPromise = null; throw e })

    return this._syncPromise
  }

  /**
   * Internal method that loads all owned resources not currently in our set, usually via the UTXOs
   */
  async _syncLatest () {
    const locations = []
    const owner = this._owner.owner()
    const owners = Array.isArray(owner) ? owner : [owner]
    const promises = owners.map(async owner => {
      const script = new bsv.Script(bsv.deps.Buffer.from(_lockify(owner).script()))
      const utxos = await this._kernel._blockchain.utxos(script)
      utxos.forEach(utxo => locations.push(`${utxo.txid}_o${utxo.vout}`))
    })
    await Promise.all(promises)
    const locationsSet = new Set(locations)

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
        if (removed) Log._info(TAG, 'Removed', _text(resource))
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
        Log._warn(TAG, `Failed to load owner location ${location}\n\n${e.toString()}`)
        continue
      }

      _allowInconsistentWorldview(() => {
        // This will prefer the existing resource, because it's likely to be the latest
        const had = this._resources.has(resource)
        this._resources.add(resource)
        if (!had) Log._info(TAG, 'Added', _text(resource))
      })
    }
  }

  /**
   * Called by Run when a resource is spent or outputted, so that we can add or remove it
   */
  _notify (resource) {
    _allowInconsistentWorldview(() => {
      // Delete and re-add resources if they are still ours
      const had = this._resources.has(resource)
      this._resources.delete(resource)

      if (this._ours(resource)) {
        this._resources.add(resource)
        if (!had) Log._info(TAG, 'Added', _text(resource))
      } else {
        if (had) Log._info(TAG, 'Removed', _text(resource))
      }
    })
  }

  _ours (resource) {
    try {
      const owner = this._owner.owner()
      const owners = Array.isArray(owner) ? owner : [owner]
      const locks = owners.map(owner => _lockify(owner))
      const resourceOwner = _lockify(resource.owner)
      return locks.some(lock => sameLock(lock, resourceOwner))
    } catch (e) {
      return false
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function errored (resource) {
  return JigControl._disableSafeguards(() => {
    try {
      return resource.location[0] === '!'
    } catch (e) {
      return true
    }
  })
}

function sameLock (a, b) {
  const aScript = a.script()
  const bScript = b.script()
  if (aScript.length !== bScript.length) return false
  for (let i = 0; i < aScript.length; i++) {
    if (aScript[i] !== bScript[i]) return false
  }
  return true
}

// ------------------------------------------------------------------------------------------------

module.exports = Inventory
