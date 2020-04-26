/**
 * transaction.js
 *
 * Transaction API for inspecting and building bitcoin transactions
 */

const { JigControl } = require('./jig')
const Location = require('../util/location')
const { _pluckBerry } = require('./berry')
const ResourceJSON = require('../util/json')
const Log = require('../util/log')
const Record = require('./record')
const { _activeRun } = require('../util/misc')
const { _outputType } = require('../util/opreturn')

// ------------------------------------------------------------------------------------------------
// Transaction
// ------------------------------------------------------------------------------------------------

const TAG = 'Transaction'

/**
 * The main transaction API used by run
 */
class Transaction {
  constructor (kernel) {
    this._kernel = kernel
    this._record = new Record(this._onReadyForPublish.bind(this))

    // Overrides used during playback
    this._recordOverride = null
    this._resourceOwnerOverride = null
  }

  // Internal methods to get the actual or playback state
  get _activeRecord () { return this._recordOverride || this._record }
  _nextResourceOwner () { return this._resourceOwnerOverride || this._kernel._owner.next() }

  // Methods to override the current record and owner during playback
  _override (record, resourceOwner) { this._recordOverride = record; this._resourceOwnerOverride = resourceOwner }
  _removeOverride () { this._recordOverride = null; this._resourceOwnerOverride = null }

  // Methods to begin and end a batch transaction
  begin () { this._activeRecord.begin(); return _activeRun() }
  end () { this._activeRecord.end(); return _activeRun() }

  _onReadyForPublish () {
    // We don't publish when playing back transactions
    if (this._recordOverride) return

    this._kernel._publisher._enqueue(this._record)
    this._record = new Record(this._onReadyForPublish.bind(this))
  }

  export () {
    if (this._kernel._publisher._queued.length > 0) {
      // TODO: Only have to check if referenced jigs are in the queue
      throw new Error('must not have any queued transactions before exporting')
    }

    if (this._activeRecord._beginCount === 0) {
      const suggestion = 'Hint: A transaction must first be created using begin() or loaded using import().'
      throw new Error(`No transaction in progress\n\n${suggestion}`)
    }

    return this._activeRecord._buildBsvTransaction(this._kernel).tx
  }

  import (tx) {
    Log._info(TAG, 'Importing', tx.hash)
    return this._activeRecord._import(tx, this._kernel, null, false)
  }

  rollback () {
    Log._info(TAG, 'Rollback')
    this._activeRecord.rollback(this._kernel._publisher._lastPosted, this._kernel, false, 'intentional rollback')
  }

  async sign () { await this._activeRecord.sign(this._kernel) }

  async pay () { await this._activeRecord.pay(this._kernel) }

  // get inputs () {
  // TODO: filtering by inputs is broken
  // return this._record._inputs
  // .filter(input => input.origin !== '_')
  // .map(input => this._record._proxies.get(input))
  // }

  // get outputs () {
  // return this._record._outputs.map(output => this._record._proxies.get(output))
  // }

  get actions () {
    return this._activeRecord._actions.map(action => {
      return {
        target: this._activeRecord._proxies.get(action.target),
        method: action.method,
        args: action.args
      }
    })
  }

  _storeCode (T, S, deps, props, success, error) {
    return this._activeRecord._storeCode(T, S, deps, props, success, error,
      this._nextResourceOwner(), this._kernel._code, this._kernel)
  }

  _storeAction (target, method, args, inputs, outputs, reads, before, after, proxies) {
    this._activeRecord._storeAction(target, method, args, inputs, outputs, reads, before, after,
      proxies, this._kernel)
  }

  /**
   * Loads a jig or class at a particular location
   *
   * location is a string
   *
   * cachedRefs stores a map from locations to jigs/classes loaded by load()
   * from the state cache. load() will trigger additional loads recursively.
   * both jigs and classes may have references to other jigs and other classes,
   * and we don't want to load these multiple times. especially when they refer
   * to each other cyclically as that could cause infinite loops.
   */
  async load (location, options = {}) {
    Log._info(TAG, 'Loading', location)

    // If there's a custom protocol, use it
    if (options._BerryClass) {
      return _pluckBerry(location, this._kernel._blockchain, this._kernel._code, options._BerryClass)
    }

    // Either load a run resource, or a berry, depending on if there's a protocol in location
    const loc = Location.parse(location)

    if (!loc.innerLocation) {
      return this._loadResource(location, options)
    } else {
      const BerryClass = await this.load(loc.location, options)
      return _pluckBerry(loc.innerLocation, this._kernel._blockchain, this._kernel._code, BerryClass)
    }
  }

  async _loadResource (location, options = {}) {
    const cachedRefs = options.cachedRefs || new Map()

    // --------------------------------------------------------------------------------------------
    // CHECK THE CACHE
    // --------------------------------------------------------------------------------------------

    // check the code cache so we only have to download code once
    const cachedCode = this._kernel._code._getSandboxed(location)
    if (cachedCode) return cachedCode

    if (options._partiallyInstalledCode && options._partiallyInstalledCode.has(location)) {
      return options._partiallyInstalledCode.get(location)
    }

    const loc = Location.parse(location)
    if (loc.error || loc.innerLocation || loc.vref || loc.tempTxid) throw new Error(`Bad location: ${location}`)
    const { txid, vout, vin } = loc

    // TODO: do we want to support loading locations with inputs?
    // The transaction test "update class property jig in initializer" uses this
    if (typeof vin !== 'undefined') {
      const tx = await this._kernel._blockchain.fetch(txid)
      const prevTxId = tx.inputs[vin].prevTxId.toString('hex')
      return this.load(`${prevTxId}_o${tx.inputs[vin].outputIndex}`, { cachedRefs })
    }

    // check the state cache so we only have to load each jig once
    const cachedState = await this._kernel._state.get(location)
    if (cachedState) {
      // Make sure the cached state is valid
      if (typeof cachedState.type !== 'string' || typeof cachedState.state !== 'object') {
        const hint = 'Hint: Could the state cache be corrupted?'
        throw new Error(`Cached state is missing a valid type and/or state property\n\n${JSON.stringify(cachedState)}\n\n${hint}`)
      }

      // Deserialize from a cached state, first by finding all inner resources and loading them,
      // and then deserializing
      const fullLocation = loc => (loc.startsWith('_') ? `${location.slice(0, 64)}${loc}` : loc)
      const resourceLoader = ref => cachedRefs.get(fullLocation(ref))

      try {
        JigControl._blankSlate = true

        // Create the new instance as a blank slate
        const typeLocation = cachedState.type.startsWith('_') ? location.slice(0, 64) + cachedState.type : cachedState.type
        const T = await this.load(typeLocation)
        const instance = new T()
        cachedRefs.set(location, instance)

        const refs = ResourceJSON._findAllResourceRefsInResourceJSON(cachedState.state)

        // Load all dependencies
        for (const ref of refs) {
          const fullLoc = fullLocation(ref)
          if (cachedRefs.has(fullLoc)) continue
          const resource = await this.load(fullLoc, { cachedRefs })
          if (!cachedRefs.has(fullLoc)) cachedRefs.set(fullLoc, resource)
        }

        // Deserialize and inject our state
        JigControl._disableSafeguards(() => {
          const deserialized = ResourceJSON._deserialize(cachedState.state, {
            _sandboxIntrinsics: this._kernel._code._sandboxIntrinsics,
            _reviver: ResourceJSON._revive._multiple(
              ResourceJSON._revive._resources(resourceLoader),
              ResourceJSON._revive._arbitraryObjects())
          })

          Object.assign(instance, deserialized)

          instance.origin = instance.origin || location
          instance.location = instance.location || location
        })

        return instance
      } finally { JigControl._blankSlate = false }
    }

    // --------------------------------------------------------------------------------------------
    // LOAD THE TRANSACTION, AND THEN THE JIGS OR CODE
    // --------------------------------------------------------------------------------------------

    // load all the jigs for this transaction, and return the selected
    const tx = await this._kernel._blockchain.fetch(txid)

    // Check that we are loading a resource
    // TODO: Rename this error in 0.6
    const outputType = _outputType(tx, vout)
    if (outputType !== 'jig' && outputType !== 'code') {
      throw new Error(`Not a token: ${location}`)
    }

    // Import the transaction
    const record = new Record()
    await record._import(tx, this._kernel, null, true, vout, options._partiallyInstalledCode)

    // if a definition, install
    if (vout > 0 && vout < record._code.length + 1) {
      return this._kernel._code._getSandboxed(location) || options._partiallyInstalledCode.get(location)
    }

    // otherwise, a jig. get the jig.
    const proxies = record._outputs.map(o => record._proxies.get(o))
    const jigProxies = new Array(1 + record._code.length).concat(proxies)

    // TODO: Notify shruggr if these error message change
    if (typeof jigProxies[vout] === 'undefined') throw new Error('not a jig output')

    return jigProxies[vout]
  }
}

module.exports = Transaction
