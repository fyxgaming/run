/**
 * inventory.js
 *
 * An object that tracks the jigs and code for the current owner
 */

const { JigControl } = require('./jig')
const { ResourceSet, _allowInconsistentWorldview } =
  require('../util/datatypes')
const { _resourceType, _lockify, _display } = require('../util/misc')
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

    for (const resource of this._resources) {
      if (errored(resource) || !ours(this._owner, resource)) {
        remove.push(resource)
      } else {
        resources.push(resource)
      }
    }

    remove.forEach(resource => {
      const removed = this._resources.delete(resource)
      if (removed) Log._info(TAG, 'Removed', _display(resource))
    })

    return resources
  }

  /**
   * Updates the known set of jigs and code
   */
  async sync () {
    // One sync at a time
    if (this._existingSync) return this._existingSync

    const done = () => { this._existingSync = null }

    this._existingSync = this._syncLatest()
      .then(done)
      .catch(e => { done(); throw e })

    return this._existingSync
  }

  /**
   * Internal method that loads all owned resources not currently in our set, usually via the UTXOs
   */
  async _syncLatest () {
    const newLocations = await ownerLocations(this._owner, this._kernel)
    const newLocationsSet = new Set(newLocations)

    const toRemove = []
    const existingResources = JigControl._disableSafeguards(() => {
      const arr = []
      for (const resource of this._resources) {
        if (resource.location.startsWith('_')) {
          arr.push(resource)
        } else if (errored(resource) || !ours(this._owner, resource)) {
          toRemove.push(resource)
        } else if (!newLocationsSet.has(resource.location)) {
          toRemove.push(resource)
        } else {
          arr.push(resource)
        }
      }
      return arr
    })

    // Remove resources that are not in our new locations, but have a value
    toRemove.forEach(resource => {
      const removed = this._resources.delete(resource)
      if (removed) Log._info(TAG, 'Removed', _display(resource))
    })

    const existingResourcesSet = new Set(JigControl._disableSafeguards(
      () => existingResources.map(resource => resource.location)))

    for (const location of newLocations) {
      if (existingResourcesSet.has(location)) continue

      // Try loading the resource, but if it fails to load, just move on to the next.
      // Otherwise, bad actors could crash apps by sending users jigs that don't load.
      let resource = null
      try {
        resource = await this._kernel._load(location)
      } catch (e) {
        Log._error(TAG, `Failed to load owner location ${location}\n\n${e.toString()}`)
        continue
      }

      _allowInconsistentWorldview(() => {
        // This will prefer the existing resource, because it's likely to be the latest
        const had = this._resources.has(resource)
        this._resources.add(resource)
        if (!had) Log._info(TAG, 'Added', _display(resource))
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

      if (ours(this._owner, resource)) {
        this._resources.add(resource)
        if (!had) Log._info(TAG, 'Added', _display(resource))
      } else {
        if (had) Log._info(TAG, 'Removed', _display(resource))
      }
    })
  }
}

// ------------------------------------------------------------------------------------------------
// Helper functions
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

async function ownerLocations (owner, kernel) {
  if (typeof owner.locations === 'function') {
    return owner.locations()
  }
  return []
}

function ours (owner, resource) {
  if (!resource.owner) return false
  if (typeof owner.ours === 'function') {
    return owner.ours(_lockify(resource.owner))
  }
  return false
}

// ------------------------------------------------------------------------------------------------

module.exports = Inventory
