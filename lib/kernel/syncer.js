/**
 * syncer.js
 *
 * Syncs resources to their latest state
 */

const Record = require('./record')
const { JigControl } = require('./jig')
const Location = require('../util/location')
const { _deepTraverseObjects, _resourceType } = require('../util/misc')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Syncer
// ------------------------------------------------------------------------------------------------

const TAG = 'Syncer'

class Syncer {
  constructor (kernel) {
    this._kernel = kernel
  }

  async _syncResource (resource, forward) {
    Log._info(TAG, 'Syncing')

    // Forward sync only if we are syncing on a target, and { forward: false } is not passed
    const shouldForwardSync = typeof forward === 'undefined' || forward

    // Put all txids published during this method into a don't fetch set to speed up forward sync
    const dontForceFetch = new Set()
    const publisher = this._kernel._publisher
    const broadcastSubscription = publisher._broadcasts._subscribe(tx => dontForceFetch.add(tx.hash))

    // Publish transactions, then forward sync
    try {
      await publisher._ready()
    } catch (e) {
      // Forward sync regardless of whether there were errors during publishing, because unsynced
      // resources may be the cause of those errors.
      if (shouldForwardSync) {
        try {
          await this._fastForward(resource, dontForceFetch)
        } catch (e) { /* Swallow because we'll throw the publish error */ }
      }

      throw e
    } finally {
      broadcastSubscription._dispose()
    }

    if (shouldForwardSync) {
      await this._fastForward(resource, dontForceFetch)
    }

    return resource
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
    await this._fastForwardInnerResources(jig, alreadyForceFetched, synced)

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
    const record = new Record()
    await record._import(tx, this._kernel, jig, true)
    const jigProxies = Array.from(record._proxies.values())

    if (!jigProxies.some(proxy => proxy === jig)) {
      const message = 'Expected but did not find a jig in its spent transaction'
      const data = `Jig origin: ${jig.origin}\nTxid: ${tx.hash}`
      const hint = 'This is an internal Run bug. Please report it to the library developers.'
      throw new Error(`${message}\n\n${data}\n\n${hint}`)
    }
  }

  async _fastForwardInnerResources (x, alreadyForceFetched, synced) {
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

// ------------------------------------------------------------------------------------------------

module.exports = Syncer
