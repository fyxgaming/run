/**
 * syncer.js
 *
 * Enqueues transactions and syncs jigs
 */

const { ProtoTransaction } = require('./transaction')
const { JigControl } = require('./jig')
const { Owner } = require('./owner')
const Xray = require('./xray')
const util = require('./util')
const Location = require('./location')

/**
 * Proto-transaction: A temporary structure Run uses to build transactions. This structure
 * has every action and definition that will go into the real transaction, but stored using
 * actual references to the objects instead of location strings. Run turns the proto-transaction
 * into a real transaction by converting all references into location strings. This is necessary
 * when there are queued proto-transactions and the locations may not be known yet.
 */

module.exports = class Syncer {
  constructor (run) {
    this.run = run
    this.blockchain = run.blockchain
    this.code = run.code
    this.state = run.state
    this.pay = (...args) => { return run.purse.pay(...args) }
    this.sign = (...args) => { return run.owner.sign(...args) }
    this.queued = [] // queued proto-transactions to send
    this.syncListeners = [] // callbacks for when sync completes (Array<{resolve,reject}>)
    this.lastPosted = new Map() // The last onchain location for queued jigs (Origin->Location)
    this.onBroadcastListeners = new Set() // callbacks for when a transaction is broadcast
  }

  publish (protoTx) {
    for (const [key, value] of protoTx.locations) {
      if (!this.lastPosted.has(key)) this.lastPosted.set(key, value)
    }
    this.queued.push(protoTx)
    if (this.queued.length === 1) { this.publishNext().catch(e => {}) }
  }

  async publishNext () {
    // next is the proto-transaction to publish
    const next = this.queued[0]
    if (!next.actions.length && !next.code.length) return this.finish()

    const net = util.networkSuffix(this.blockchain.network)

    let tx = null

    try {
      const result = next.buildBsvTransaction(this.run)

      const { refs, spentJigs, spentLocations } = result
      tx = result.tx

      // check that each read reference is the latest
      const refTxids = refs.map(ref => ref.slice(0, 64))
      const refVouts = refs.map(ref => parseInt(ref.slice(66)))
      const refTxns = refTxids.length
        ? await Promise.all(refTxids.map(txid => this.blockchain.fetch(txid))) : []
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
      if (!next.imported) {
        tx = await this.pay(tx)
      }
      tx = await this.sign(tx)

      // check that we have all signatures. this is more of a friendly error.
      for (let i = 0; i < spentJigs.length; i++) {
        if (!tx.inputs[i].isFullySigned()) {
          throw new Error(`Signature missing for ${spentJigs[i].constructor.name}

origin: ${spentJigs[i].origin}
location: ${spentLocations[i]}
owner: ${spentJigs[i].owner}`)
        }
      }

      await this.broadcast(tx)

      this.onBroadcastListeners.forEach(listener => listener(tx))
    } catch (e) {
      // an error occurred either while building or sending the transaction

      // notify each listener that is waiting for sync() to return
      const unhandled = this.syncListeners.length === 0
      if (unhandled) this.run.logger.error(`Unhandled ${e.toString()}`)
      this.syncListeners.forEach(c => c.reject(e))
      this.syncListeners = []

      // roll back for each pending transaction including this one
      // if the error is unhandled (no call to sync), then make the jigs permanently unusable
      this.queued.forEach(protoTx => protoTx.rollback(this.lastPosted, this.run, e, unhandled))

      // empty the queue and reset
      this.queued = []
      this.lastPosted = new Map()

      return
    }

    // the transaction was successfully posted. updated lastPosted with this transaction
    // for all jigs that are still queued, and notify each definition to update its
    // origin and location with the now-known transaction.

    const stillQueued = target => this.queued.slice(1).some(
      protoTx => protoTx.outputs.some(target2 => util.sameJig(target, target2)))

    next.outputs.forEach((target, index) => {
      const vout = 1 + next.code.length + index
      if (target.origin[0] === '_') { target.origin = `${tx.hash}_o${vout}` }
      if (stillQueued(target)) {
        this.lastPosted.set(target.origin, `${tx.hash}_o${vout}`)
      } else {
        target.location = `${tx.hash}_o${vout}`; this.lastPosted.delete(target.origin)
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

      const serialized = JigControl.disableProxy(() => {
        const tokenSaver = token => {
          const location = this.lastPosted.get(token.origin) || token.location
          return location.startsWith(tx.hash) ? location.slice(64) : location
        }

        const xray = new Xray()
          .allowTokens()
          .useIntrinsics(this.run.code.intrinsics)
          .useTokenSaver(tokenSaver)

        return xray.serialize(restored)
      })

      // TODO: If I could use the actions protocol, then I could have the saved state be
      // the state cache state of the jig. For now, I would just deserialize and serialize again.

      let type = jig.constructor[`origin${net}`]
      if (type.startsWith(tx.hash)) type = type.slice(64)

      const cachedState = { type, state: serialized }
      await this.state.set(restoredLocation, cachedState)
    }

    // notify the owner
    const update = x => { if (this.run.owner instanceof Owner) this.run.owner.update(x) }
    next.code.forEach(def => update(def.sandbox))
    next.outputs.forEach(jig => update(next.proxies.get(jig)))

    this.finish()
  }

  async broadcast (tx) {
    try {
      await this.blockchain.broadcast(tx)
    } catch (e) {
      const eString = e.toString()
      let message = `Broadcast failed, ${e.message}`

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
          const prevTx = await this.run.blockchain.fetch(prevTxId, true)
          const prevOutput = prevTx.outputs[input.outputIndex]

          if (prevOutput.spentTxId) {
            const prevLocation = `${prevTxId}_o${input.outputIndex}`
            const type = util.outputType(prevTx, input.outputIndex)

            let typeString = 'Payment'
            switch (type) {
              case 'code':
                try {
                  typeString = (await this.run.load(prevLocation)).name
                } catch (e) { typeString = 'Code' }
                break
              case 'jig':
                try {
                  typeString = `${await this.run.load(prevLocation)}`
                } catch (e) { typeString = 'Jig' }
                break
            }

            message = `${message}\n\n${typeString} was spent in another transaction\n`
            message = `${message}\nLocation: ${prevLocation}`
            message = `${message}\nSpending Tx: ${prevOutput.spentTxId}`
          }
        }
      }

      throw new Error(message)
    }
  }

  async finish () {
    this.queued.shift()
    if (this.queued.length) { this.publishNext(); return }
    this.syncListeners.forEach(c => c.resolve())
    this.syncListeners = []
  }

  async sync (options = {}) {
    // put all published TXIDs into a do not refresh set to speed up forward sync
    const recentlyPublishedTxids = new Set()
    const onBroadcast = tx => recentlyPublishedTxids.add(tx.hash)
    this.onBroadcastListeners.add(onBroadcast)

    // Helper method to forward sync if enabled and we have a jig to update. Returns the jig
    const forwardSync = async () => {
      const shouldForwardSync = typeof options.forward === 'undefined' || options.forward

      if (shouldForwardSync && options.target) {
        return this.fastForward(options.target, recentlyPublishedTxids)
      } else {
        return options.target
      }
    }

    // if there are no pending transactions being published, then immediately forward sync
    if (!this.queued.length) return forwardSync()

    // otherwise, create a promise that resolves when the current sync is done.
    // we will start forward syncing after
    const donePublishing = new Promise((resolve, reject) => {
      this.syncListeners.push({ resolve, reject })
    })

    // after the pending transactions are published, forward sync regardless of whether there
    // were errors. this lets the user get into a good state again if they were out of sync.
    const removeListener = () => this.onBroadcastListeners.delete(onBroadcast)
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
  async fastForward (jig, alreadyForceFetched = new Set(), synced = new Map()) {
    // If we have already fast-forwarded this jig, copy its state and return
    const cached = synced.get(jig.origin)
    if (cached) return JigControl.disableProxy(() => Object.assign(jig, cached))

    // Load the transaction this jig is in to see if it's spent
    let loc = Location.parse(jig.location)
    let tx = await this.blockchain.fetch(loc.txid, !alreadyForceFetched.has(loc.txid))
    alreadyForceFetched.add(loc.txid)

    // Update this jig transaction by transaction until there are no more updates left
    while (tx.outputs[loc.vout].spentTxId !== null) {
      tx = await this.fetchNextTransaction(tx, loc.vout, alreadyForceFetched)
      await this.updateJigWithNextTransaction(jig, tx)
      loc = Location.parse(jig.location)
    }

    // Mark this jig as updated so it isn't updated again by a circular reference
    synced.set(jig.origin, jig)

    // Fast forward all jigs inside of this one so the whole thing is up to date
    await this.fastForwardInnerTokens(jig, alreadyForceFetched, synced)

    return jig
  }

  async fetchNextTransaction (tx, vout, alreadyForceFetched) {
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
    const nextTx = await this.blockchain.fetch(output.spentTxId, !alreadyForceFetched.has(output.spentTxId))
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

  async updateJigWithNextTransaction (jig, tx) {
    // Import the tx and update our jig, then make sure it was updated
    const protoTx = new ProtoTransaction()
    await protoTx.import(tx, this.run, jig, true)
    const jigProxies = Array.from(protoTx.proxies.values())
    if (!jigProxies.some(proxy => proxy === jig)) {
      const message = 'Expected but did not find a jig in its spent transaction'
      const data = `Jig origin: ${jig.origin}\nTxid: ${tx.hash}`
      const hint = 'This is an internal Run bug. Please report it to the library developers.'
      throw new Error(`${message}\n\n${data}\n\n${hint}`)
    }
  }

  async fastForwardInnerTokens (x, alreadyForceFetched, synced) {
    const xray = new Xray()
      .allowTokens()
      .deeplyScanTokens()
      .useIntrinsics(this.run.code.intrinsics)

    xray.scan(x)

    const { Jig } = require('.')

    for (const token of xray.tokens) {
      if (token !== x && token instanceof Jig) {
        await this.fastForward(token, alreadyForceFetched, synced)
      }
    }
  }
}
