/**
 * publisher.js
 *
 * Enqueues records and broadcasts transactions
 */

const { JigControl } = require('./jig')
const { _networkSuffix, _sameJig } = require('../util/misc')
const { _outputType } = require('../util/opreturn')
const Observable = require('../util/observable')
const Log = require('../util/log')
const ResourceJSON = require('../util/json')

// ------------------------------------------------------------------------------------------------
// Publisher
// ------------------------------------------------------------------------------------------------

const TAG = 'Publisher'

class Publisher {
  constructor (kernel) {
    this._kernel = kernel
    this._queued = [] // queued records to send
    this._lastPosted = new Map() // The last onchain location for queued jigs (Origin->Location)
    this._readyPromises = [] // Promises waiting for publish to complete
    this._broadcasts = new Observable()
  }

  _enqueue (record) {
    // If this is an empty record, then there's nothing to publish
    if (record._empty()) return

    // Save the location of each jig before we changed them, in case of rollbacks
    for (const [origin, location] of record._locations) {
      if (!this._lastPosted.has(origin)) this._lastPosted.set(origin, location)
    }

    // Enqueue our record
    this._queued.push(record)

    // If we're the only record in the queue, kickoff a publish task
    if (this._queued.length === 1) {
      // Swallow errors, because we already have a way of handling them with the sync listeners
      this._publishNext().catch(e => {})
    }
  }

  /**
   * Returns a promise that resolves when there is nothing left in the queue
   */
  async _ready () {
    if (!this._queued.length) return

    return new Promise((resolve, reject) => {
      this._readyPromises.push({ resolve, reject })
    })
  }

  async _publishNext () {
    // Get the next record to publish. Don't dequeue yet, we'll use the queue.
    const record = this._queued[0]

    // Broadcast the transaction
    let tx = null
    try {
      tx = await this._buildAndBroadcast(record)
    } catch (e) {
      this._rollbackAndNotifyListenersAfterPublishError(e)
      return
    }

    // Update our state after the broadcast
    this._finalizeLocations(record, tx)
    await this._addToStateCache(record, tx)
    this._updateInventory(record)

    // Pop the record, and publish the next one
    this._queued.shift()
    if (this._queued.length) {
      this._publishNext().catch(e => {})
      return
    }

    // No more records to publish. Notify sync listeners.
    this._readyPromises.forEach(promise => promise.resolve())
    this._readyPromises = []
  }

  async _buildAndBroadcast (record) {
    const result = record._buildBsvTransaction(this._kernel)

    let tx = null
    const { refs, _spentJigs, _spentLocations } = result
    tx = result.tx

    // check that each read reference is the latest
    const refTxids = refs.map(ref => ref.slice(0, 64))
    const refVouts = refs.map(ref => parseInt(ref.slice(66)))
    const refTxns = refTxids.length
      ? await Promise.all(refTxids.map(txid => this._kernel._blockchain.fetch(txid))) : []
    refTxns.forEach((txn, n) => {
      if (typeof txn.outputs[refVouts[n]].spentTxId === 'undefined') {
        throw new Error(`Read ${refs[n]} may not be latest. Blockchain did not return spentTxId. Aborting.`)
      }
      // TODO: only has to be plausibly the latest to others
      if (txn.outputs[refVouts[n]].spentTxId !== null) {
        throw new Error(`Read ${refs[n]} is not the latest. Must sync() jigs`)
      }
    })

    // Pay then sign. The jig inputs must be signed after all payment inputs/outputs are added.
    // We don't pay for imported transactions because those must be paid for manually.
    if (!record._paid) await record._pay(this._kernel)
    await record._sign(this._kernel)

    tx = record._buildBsvTransaction(this._kernel).tx

    // Check that we have all signatures. This is a more friendly error than when we broadcast.
    for (let i = 0; i < _spentJigs.length; i++) {
      if (!tx.inputs[i].isFullySigned()) {
        const line1 = `origin: ${_spentJigs[i].origin}`
        const line2 = `location: ${_spentLocations[i]}`
        const line3 = `owner: ${_spentJigs[i].owner}`
        const details = `${line1}\n${line2}\n${line3}`
        const reason = tx.inputs[i].script.toBuffer().length ? 'Bad signature' : 'Missing signature'
        throw new Error(`${reason} for ${_spentJigs[i].constructor.name}\n\n${details}`)
      }
    }

    try {
      await this._kernel._blockchain.broadcast(tx)
    } catch (e) {
      throw await this._addDetailsToBroadcastError(e, tx)
    }

    this._broadcasts._next(tx)

    return tx
  }

  async _addDetailsToBroadcastError (e, tx) {
    const eString = e.toString()
    let message = `Broadcast failed: ${e.message}`

    // These errors are hints that the transaction is unpaid for
    if (eString.indexOf('tx has no inputs') !== -1 || eString.indexOf('tx fee too low') !== -1) {
      const suggestion = 'Hint: Is the purse funded to pay for this transaction?'
      message = `${message}\n\n${suggestion}`
    }

    // These errors are hints that an input was already spent
    if (eString.indexOf('Missing inputs') !== -1 || eString.indexOf('txn-mempool-conflict') !== -1) {
      // Figure out which input was spent
      for (const input of tx.inputs) {
        const prevTxId = input.prevTxId.toString('hex')
        let prevTx = null
        try { prevTx = await this._kernel._blockchain.fetch(prevTxId, true) } catch (e) { continue }
        const prevOutput = prevTx.outputs[input.outputIndex]

        if (prevOutput.spentTxId) {
          const prevLocation = `${prevTxId}_o${input.outputIndex}`
          const type = _outputType(prevTx, input.outputIndex)

          let typeString = 'Payment'
          switch (type) {
            case 'code':
              try {
                typeString = (await this._kernel._load(prevLocation)).name
              } catch (e) { typeString = 'Code' }
              break
            case 'jig':
              try {
                typeString = `${await this._kernel._load(prevLocation)}`
              } catch (e) { typeString = 'Jig' }
              break
          }

          message = `${message}\n\n${typeString} was spent in another transaction\n`
          message = `${message}\nLocation: ${prevLocation}`
          message = `${message}\nSpending Tx: ${prevOutput.spentTxId}`
        }
      }
    }

    return new Error(message)
  }

  _finalizeLocations (record, tx) {
    // the transaction was successfully posted. updated _lastPosted with this transaction
    // for all jigs that are still queued, and notify each definition to update its
    // origin and location with the now-known transaction.

    const stillQueued = target => this._queued.slice(1).some(
      record => record._outputs.some(target2 => _sameJig(target, target2)))

    record._outputs.forEach((target, index) => {
      const vout = 1 + record._code.length + index
      if (target.origin[0] === '_') { target.origin = `${tx.hash}_o${vout}` }
      if (stillQueued(target)) {
        this._lastPosted.set(target.origin, `${tx.hash}_o${vout}`)
      } else {
        target.location = `${tx.hash}_o${vout}`; this._lastPosted.delete(target.origin)
      }

      // also update after because we're going to use it to cache its state
      record._after.get(target).restore().origin = target.origin
      record._after.get(target).restore().location = `${tx.hash}_o${vout}`
    })

    record._code.forEach((def, index) => def.success(`${tx.hash}_o${index + 1}`))
  }

  async _addToStateCache (record, tx) {
    // cache each jig's state. the format for caching is a packed reference model
    // where local locations are preferred over full locations, and only outputs
    // are used, never inputs. only outputs are used because if a jig is inputted,
    // then it will also be outputted, and we are always referring to a cached
    // state after a transaction.
    for (const jig of record._outputs) {
      const after = record._after.get(jig)

      // Note: Converting saved state json to rich and then back to json again is a
      // tad excessive. We could probably do a transformation on the json itself.

      const restored = after.restore()

      const restoredLocation = restored.location
      if (restored.origin.startsWith(tx.hash)) delete restored.origin
      if (restored.location.startsWith(tx.hash)) delete restored.location

      const serialized = JigControl._disableSafeguards(() => {
        const resourceSaver = resource => {
          const location = this._lastPosted.get(resource.origin) || resource.location
          return location.startsWith(tx.hash) ? location.slice(64) : location
        }

        return ResourceJSON._serialize(restored, {
          _replacer: ResourceJSON._replace._cache(
            ResourceJSON._replace._multiple(
              ResourceJSON._replace._resources(resourceSaver),
              ResourceJSON._replace._arbitraryObjects()))
        })
      })

      // TODO: If I could use the actions protocol, then I could have the saved state be
      // the state cache state of the jig. For now, I would just deserialize and serialize again.

      const net = _networkSuffix(this._kernel._blockchain.network)
      let type = jig.constructor[`origin${net}`]
      if (type.startsWith(tx.hash)) type = type.slice(64)

      const cachedState = { type, state: serialized }
      await this._kernel._state.set(restoredLocation, cachedState)
    }
  }

  _updateInventory (record) {
    // Update the inventory
    // TODO: Remove inputs. We haven't done this because inputs don't get destroyed
    const inventory = this._kernel._inventory
    record._code.forEach(def => inventory._notify(def.S))
    record._outputs.forEach(jig => inventory._notify(record._proxies.get(jig)))
  }

  _rollbackAndNotifyListenersAfterPublishError (e) {
    // An error occurred either while building or sending the transaction.

    // If the error is unhandled (no call to sync), we will make the jigs permanently unusable.
    const unhandled = this._readyPromises.length === 0

    // Roll back for each pending transaction including this one in reverse order.
    const rollbackErrors = []
    for (let i = this._queued.length - 1; i >= 0; i--) {
      try {
        const record = this._queued[i]
        record._rollback(this._lastPosted, this._kernel, e, unhandled)
      } catch (e) {
        rollbackErrors.push(e)
      }
    }

    // Create an error message that includes any errors during rollback
    let msg = e.toString()
    if (rollbackErrors.length) {
      msg += 'These errors also occurred while rolling back:'
      rollbackErrors.forEach(e => { msg += '\n\n' + e.toString() })
    }
    const err = new Error(msg)

    // Unblock each listener that is waiting for sync() with the error.
    if (unhandled) Log._error(TAG, 'Unhandled', err)
    this._readyPromises.forEach(promise => promise.reject(err))
    this._readyPromises = []

    // Empty the queue and reset
    this._queued = []
    this._lastPosted = new Map()
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Publisher
