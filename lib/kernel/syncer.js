/**
 * syncer.js
 *
 * Enqueues transactions and syncs jigs
 */

const { _ProtoTransaction } = require('./transaction')
const { JigControl } = require('./jig')
const Location = require('../util/location')
const { _networkSuffix, _deepTraverseObjects, _resourceType, _sameJig } = require('../util/misc')
const { _outputType } = require('../util/opreturn')
const Log = require('../util/log')
const TokenJSON = require('../util/json')

const TAG = 'Syncer'

/**
 * Proto-transaction: A temporary structure Run uses to build transactions. This structure
 * has every action and definition that will go into the real transaction, but stored using
 * actual references to the objects instead of location strings. Run turns the proto-transaction
 * into a real transaction by converting all references into location strings. This is necessary
 * when there are queued proto-transactions and the locations may not be known yet.
 */

module.exports = class Syncer {
  constructor (kernel) {
    this._kernel = kernel
    this._queued = [] // queued proto-transactions to send
    this._syncListeners = [] // callbacks for when sync completes (Array<{resolve,reject}>)
    this._lastPosted = new Map() // The last onchain location for queued jigs (Origin->Location)
    this._onBroadcastListeners = new Set() // callbacks for when a transaction is broadcast
  }

  _publish (protoTx) {
    for (const [key, value] of protoTx.locations) {
      if (!this._lastPosted.has(key)) this._lastPosted.set(key, value)
    }
    this._queued.push(protoTx)
    if (this._queued.length === 1) { this._publishNext().catch(e => {}) }
  }

  async _publishNext () {
    // next is the proto-transaction to publish
    const next = this._queued[0]
    if (!next.actions.length && !next.code.length) return this._finish()

    const net = _networkSuffix(this._kernel._blockchain.network)

    let tx = null

    try {
      const result = next._buildBsvTransaction(this._kernel)

      const { refs, spentJigs, spentLocations } = result
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
      if (!next.paid) {
        await next.pay(this._kernel)
      }
      await next.sign(this._kernel)

      tx = next._buildBsvTransaction(this._kernel).tx

      // Check that we have all signatures. This is a more friendly error than when we broadcast.
      for (let i = 0; i < spentJigs.length; i++) {
        if (!tx.inputs[i].isFullySigned()) {
          const line1 = `origin: ${spentJigs[i].origin}`
          const line2 = `location: ${spentLocations[i]}`
          const line3 = `owner: ${spentJigs[i].owner}`
          const details = `${line1}\n${line2}\n${line3}`
          const reason = tx.inputs[i].script.toBuffer().length ? 'Bad signature' : 'Missing signature'
          throw new Error(`${reason} for ${spentJigs[i].constructor.name}\n\n${details}`)
        }
      }

      try {
        await this._kernel._blockchain.broadcast(tx)
      } catch (e) {
        throw await this._addDetailsToBroadcastError(e, tx)
      }

      this._onBroadcastListeners.forEach(listener => listener(tx))
    } catch (e) {
      // an error occurred either while building or sending the transaction

      // notify each listener that is waiting for sync() to return
      const unhandled = this._syncListeners.length === 0
      if (unhandled) Log._error(TAG, 'Unhandled', e)
      this._syncListeners.forEach(c => c.reject(e))
      this._syncListeners = []

      // roll back for each pending transaction including this one
      // if the error is unhandled (no call to sync), then make the jigs permanently unusable
      this._queued.forEach(protoTx => protoTx.rollback(this._lastPosted, this._kernel, e, unhandled))

      // empty the queue and reset
      this._queued = []
      this._lastPosted = new Map()

      return
    }

    // the transaction was successfully posted. updated _lastPosted with this transaction
    // for all jigs that are still queued, and notify each definition to update its
    // origin and location with the now-known transaction.

    const stillQueued = target => this._queued.slice(1).some(
      protoTx => protoTx.outputs.some(target2 => _sameJig(target, target2)))

    next.outputs.forEach((target, index) => {
      const vout = 1 + next.code.length + index
      if (target.origin[0] === '_') { target.origin = `${tx.hash}_o${vout}` }
      if (stillQueued(target)) {
        this._lastPosted.set(target.origin, `${tx.hash}_o${vout}`)
      } else {
        target.location = `${tx.hash}_o${vout}`; this._lastPosted.delete(target.origin)
      }

      // also update after because we're going to use it to cache its state
      next.after.get(target).restore().origin = target.origin
      next.after.get(target).restore().location = `${tx.hash}_o${vout}`
    })

    next.code.forEach((def, index) => def.success(`${tx.hash}_o${index + 1}`))

    // cache each jig's state. the format for caching is a packed reference model
    // where local locations are preferred over full locations, and only outputs
    // are used, never inputs. only outputs are used because if a jig is inputted,
    // then it will also be outputted, and we are always referring to a cached
    // state after a transaction.
    for (const jig of next.outputs) {
      const after = next.after.get(jig)

      // Note: Converting saved state json to rich and then back to json again is a
      // tad excessive. We could probably do a transformation on the json itself.

      const restored = after.restore()

      const restoredLocation = restored.location
      if (restored.origin.startsWith(tx.hash)) delete restored.origin
      if (restored.location.startsWith(tx.hash)) delete restored.location

      const serialized = JigControl._disableSafeguards(() => {
        const tokenSaver = token => {
          const location = this._lastPosted.get(token.origin) || token.location
          return location.startsWith(tx.hash) ? location.slice(64) : location
        }

        return TokenJSON._serialize(restored, {
          _replacer: TokenJSON._replace._cache(
            TokenJSON._replace._multiple(
              TokenJSON._replace._tokens(tokenSaver),
              TokenJSON._replace._arbitraryObjects()))
        })
      })

      // TODO: If I could use the actions protocol, then I could have the saved state be
      // the state cache state of the jig. For now, I would just deserialize and serialize again.

      let type = jig.constructor[`origin${net}`]
      if (type.startsWith(tx.hash)) type = type.slice(64)

      const cachedState = { type, state: serialized }
      await this._kernel._state.set(restoredLocation, cachedState)
    }

    // Update the inventory
    // TODO: Remove inputs. We haven't done this because inputs don't get destroyed
    const inventory = this._kernel._inventory
    next.code.forEach(def => inventory._notify(def.sandbox))
    next.outputs.forEach(jig => inventory._notify(next.proxies.get(jig)))

    this._finish()
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

  async _finish () {
    this._queued.shift()
    if (this._queued.length) { this._publishNext(); return }
    this._syncListeners.forEach(c => c.resolve())
    this._syncListeners = []
  }

  async sync (options = {}) {
    // put all published TXIDs into a do not refresh set to speed up forward sync
    const recentlyPublishedTxids = new Set()
    const onBroadcast = tx => recentlyPublishedTxids.add(tx.hash)
    this._onBroadcastListeners.add(onBroadcast)

    // Helper method to forward sync if enabled and we have a jig to update. Returns the jig
    const forwardSync = async () => {
      const shouldForwardSync = typeof options.forward === 'undefined' || options.forward

      if (shouldForwardSync && options.target) {
        return this._fastForward(options.target, recentlyPublishedTxids)
      } else {
        return options.target
      }
    }

    // if there are no pending transactions being published, then immediately forward sync
    if (!this._queued.length) return forwardSync()

    // otherwise, create a promise that resolves when the current sync is done.
    // we will start forward syncing after
    const donePublishing = new Promise((resolve, reject) => {
      this._syncListeners.push({ resolve, reject })
    })

    // after the pending transactions are published, forward sync regardless of whether there
    // were errors. this lets the user get into a good state again if they were out of sync.
    const removeListener = () => this._onBroadcastListeners.delete(onBroadcast)
    const forwardSyncThenThrowError = e => forwardSync().then(() => { throw e }).catch(e2 => { throw e })
    return donePublishing
      .then(() => { removeListener(); return forwardSync() })
      .catch(e => { removeListener(); return forwardSyncThenThrowError(e) })
  }

  /**
   * Fast-forwards a jig and all jigs it references to their latest state
   * @param {Jig} jig jig to update
   * @param {Set<txid: string>} alreadyForceFetched Transaction IDs that were force-refreshed already
   * @param {Map<origin: string, latestState: Jig>} synced jigs already updated
   */
  async _fastForward (jig, alreadyForceFetched = new Set(), synced = new Map()) {
    // If we have already fast-forwarded this jig, copy its state and return
    const cached = synced.get(jig.origin)
    if (cached) {
      return JigControl._disableSafeguards(() => {
        return JigControl._disableProxy(() => {
          Object.assign(jig, cached)
        })
      })
    }

    // Load the transaction this jig is in to see if it's spent
    let loc = Location.parse(jig.location)
    let tx = await this._kernel._blockchain.fetch(loc.txid, !alreadyForceFetched.has(loc.txid))
    alreadyForceFetched.add(loc.txid)

    // Update this jig transaction by transaction until there are no more updates left
    while (tx.outputs[loc.vout].spentTxId !== null) {
      tx = await this._fetchNextTransaction(tx, loc.vout, alreadyForceFetched)
      await this._updateJigWithNextTransaction(jig, tx)
      loc = Location.parse(jig.location)
    }

    // Mark this jig as updated so it isn't updated again by a circular reference
    synced.set(jig.origin, jig)

    // Fast forward all jigs inside of this one so the whole thing is up to date
    await this._fastForwardInnerTokens(jig, alreadyForceFetched, synced)

    return jig
  }

  async _fetchNextTransaction (tx, vout, alreadyForceFetched) {
    const output = tx.outputs[vout]

    // If we don't know if this output is spent, then we throw an error, because we don't want
    // users to think they are in the latest state when they are not.
    if (typeof output.spentTxId === 'undefined') {
      const message = 'Failed to forward sync jig'
      const reason = 'The blockchain API does not support the spentTxId field.'
      const hint = 'Hint: To just publish updates without forward sync, use `jig.sync({ forward: false })`.'
      throw new Error(`${message}\n\n${reason}\n\n${hint}`)
    }

    // Fetch the next transaction this jig is in
    const nextTx = await this._kernel._blockchain.fetch(output.spentTxId, !alreadyForceFetched.has(output.spentTxId))
    alreadyForceFetched.add(output.spentTxId)

    const input = nextTx.inputs[output.spentIndex]
    if (!input) {
      const message = 'Blockchain API returned an incorrect spentIndex'
      const data = `Txid: ${tx.hash}\nSpent Index: ${output.spentIndex}`
      const hint = 'Hint: Check that the blockchain API is working correctly'
      throw new Error(`${message}\n\n${data}\n\n${hint}`)
    }

    if (input.prevTxId.toString('hex') !== tx.hash || input.outputIndex !== vout) {
      const message = 'Blockchain API returned an incorrect spentTxId'
      const data = `Txid: ${tx.hash}\nSpent Txid: ${output.spentTxId}`
      const hint = 'Hint: Check that the blockchain API is working correctly'
      throw new Error(`${message}\n\n${data}\n\n${hint}`)
    }

    return nextTx
  }

  async _updateJigWithNextTransaction (jig, tx) {
    // Import the tx and update our jig, then make sure it was updated
    const protoTx = new _ProtoTransaction()
    await protoTx._import(tx, this._kernel, jig, true)
    const jigProxies = Array.from(protoTx.proxies.values())

    if (!jigProxies.some(proxy => proxy === jig)) {
      const message = 'Expected but did not find a jig in its spent transaction'
      const data = `Jig origin: ${jig.origin}\nTxid: ${tx.hash}`
      const hint = 'This is an internal Run bug. Please report it to the library developers.'
      throw new Error(`${message}\n\n${data}\n\n${hint}`)
    }
  }

  async _fastForwardInnerTokens (x, alreadyForceFetched, synced) {
    const jigs = []

    // Add the disable safeguards to make sure we don't end up in proxy hell
    // TODO: Fix this
    JigControl._disableSafeguards(() => {
      _deepTraverseObjects(x, obj => {
        if (_resourceType(obj) === 'jig') jigs.push(obj)
        return true
      })
    })

    for (const jig of jigs) {
      await this._fastForward(jig, alreadyForceFetched, synced)
    }
  }
}
