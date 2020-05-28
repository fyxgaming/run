/**
 * syncer.js
 *
 * Syncs resources to their latest state
 */

const { Transaction } = require('bsv')
const Record = require('./record')
const { JigControl } = require('./jig')
const Location = require('../util/location')
const { _deepVisit } = require('../util/deep')
const { _resourceType } = require('../util/misc')
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
    const publisher = this._kernel._publisher

    // Publish transactions, then forward sync
    try {
      await publisher._ready()
    } catch (e) {
      // Forward sync regardless of whether there were errors during publishing, because unsynced
      // resources may be the cause of those errors.
      if (shouldForwardSync) {
        try {
          await this._fastForward(resource)
        } catch (e) { /* Swallow because we'll throw the publish error */ }
      }

      throw e
    }

    if (shouldForwardSync) {
      try {
        await this._fastForward(resource)
      } catch (e) {
        throw new Error(`Failed to forward sync jig\n\n${e}`)
      }
    }

    return resource
  }

  /**
   * Fast-forwards a jig and all jigs it references to their latest state
   * @param {Jig} jig jig to update
   * @param {Map<origin: string, latestState: Jig>} synced jigs already updated
   */
  async _fastForward (jig, synced = new Map()) {
    const blockchain = this._kernel._blockchain

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
    const rawtx = await blockchain.fetch(loc.txid)
    let tx = new Transaction(rawtx)
    let spend = await blockchain.spends(loc.txid, loc.vout)

    // Update this jig transaction by transaction until there are no more updates left
    while (spend) {
      tx = await this._fetchNextTransaction(tx, loc.vout, spend)
      await this._updateJigWithNextTransaction(jig, tx)
      loc = Location.parse(jig.location)
      spend = await blockchain.spends(loc.txid, loc.vout)
    }

    // Mark this jig as updated so it isn't updated again by a circular reference
    synced.set(jig.origin, jig)

    // Fast forward all jigs inside of this one so the whole thing is up to date
    await this._fastForwardInnerJigs(jig, synced)

    return jig
  }

  async _fetchNextTransaction (tx, vout, spend) {
    // Fetch the next transaction this jig is in
    const nextraw = await this._kernel._blockchain.fetch(spend)
    const nexttx = new Transaction(nextraw)

    // But we do need to check if the next txid is valid
    const spends = nexttx.inputs.some(input =>
      input.prevTxId.toString('hex') === tx.hash && input.outputIndex === vout)
    if (!spends) {
      const message = 'Blockchain returned an incorrect spend'
      const data = `Txid: ${tx.hash}\nSpent Txid: ${spend}`
      const hint = 'Hint: Check that the blockchain API is working correctly'
      throw new Error(`${message}\n\n${data}\n\n${hint}`)
    }

    return nexttx
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

  async _fastForwardInnerJigs (jig, synced) {
    const jigs = []

    // Add the disable safeguards to make sure we don't end up in proxy hell
    // TODO: Fix this
    JigControl._disableSafeguards(() => {
      _deepVisit(jig, x => {
        if (x === jig) return false
        if (_resourceType(x) === 'jig') jigs.push(x)
      })
    })

    for (const jig of jigs) {
      await this._fastForward(jig, synced)
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Syncer
