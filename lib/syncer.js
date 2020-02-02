/**
 * syncer.js
 *
 * Enqueues transactions and syncs jigs
 */

const { ProtoTransaction } = require('./transaction')
const { JigControl } = require('./jig')
const Xray = require('./v2/xray')
const util = require('./util')

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

      // also update stateAfter because we're going to use it to cache its state
      next.stateAfter.get(target).json.origin = target.origin
      next.stateAfter.get(target).json.location = `${tx.hash}_o${vout}`
    })

    next.code.forEach((def, index) => def.success(`${tx.hash}_o${index + 1}`))

    // cache each jig's state. the format for caching is a packed reference model
    // where local locations are preferred over full locations, and only outputs
    // are used, never inputs. only outputs are used because if a jig is inputted,
    // then it will also be outputted, and we are always referring to a cached
    // state after a transaction.
    for (const jig of next.outputs) {
      const stateAfter = next.stateAfter.get(jig)

      // Note: Converting saved state json to rich and then back to json again is a
      // tad excessive. We could probably do a transformation on the json itself.

      const richState = util.jsonToRichObject(stateAfter.json,
        [util.injectJigsAndCodeFromArray(stateAfter.refs)])

      const { Jig } = require('.')
      const packedState = util.richObjectToJson(richState, [target => {
        if (util.deployable(target) || target instanceof Jig) {
          const location = this.lastPosted.get(target.origin) || target.location
          const relativeLocation = location.startsWith(tx.hash) ? location.slice(64) : location
          return { $ref: relativeLocation }
        }
      }])

      // TODO: If I could use the actions protocol, then I could have the saved state be
      // the state cache state of the jig. For now, I would just deserialize and serialize again.

      if (packedState.origin.startsWith(tx.hash)) delete packedState.origin
      if (packedState.location.startsWith(tx.hash)) delete packedState.location

      let type = jig.constructor[`origin${net}`]
      if (type.startsWith(tx.hash)) type = type.slice(64)

      const cachedState = { type, state: packedState }
      await this.state.set(stateAfter.json.location, cachedState)
    }

    // notify the owner
    next.code.forEach(def => this.run.owner._update(def.sandbox))
    next.outputs.forEach(jig => this.run.owner._update(next.proxies.get(jig)))

    this.finish()
  }

  async broadcast (tx) {
    try {
      await this.blockchain.broadcast(tx)
    } catch (e) {
      let message = `Broadcast failed, ${e.message}`

      if (e.toString().indexOf('tx has no inputs') !== -1 || e.toString().indexOf('tx fee too low') !== -1) {
        const suggestion = 'Hint: Is the purse funded to pay for this transaction?'
        message = `${message}\n\n${suggestion}`
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

    // helper method to forward sync if enabled and we have a jig to update, and then return that jig
    const forwardSync = async () => {
      if (options.target && (typeof options.forward === 'undefined' || options.forward)) {
        return this.fastForward(options.target, recentlyPublishedTxids).then(() => options.target)
      } else return options.target
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
   * @param {Set<txid: string>} dontRefresh Transaction IDs that were force-refreshed already
   * @param {Map<origin: string, latestState: Jig>} seen jigs already updated
   */
  async fastForward (jig, dontRefresh = new Set(), seen = new Map()) {
    // if we have already fast-forwarded this jig, copy its state and return
    const cached = seen.get(jig.origin)
    if (cached) {
      JigControl.enforce = false
      Object.assign(jig, cached)
      JigControl.enforce = true
      return jig
    }

    // load the transaction this jig is in to see if it's spent
    let txid = jig.location.slice(0, 64)
    let vout = parseInt(jig.location.slice(66))
    let tx = await this.blockchain.fetch(txid, !dontRefresh.has(txid))
    dontRefresh.add(txid)

    // update this jig transaction by transaction until there are no more updates left
    while (true) {
      const output = tx.outputs[vout]

      // if we don't know if this output is spent, then we throw an error, because we don't want
      // users to think they are in the latest state when they are not.
      if (typeof output.spentTxId === 'undefined') {
        const errorMessage = 'Blockchain API does not support forward syncing.'
        const possibleFix = 'To just publish pending transactions, use `jig.sync({ forward: false })`.'
        throw new Error(`${errorMessage}\n\n${possibleFix}`)
      }

      // if this jig's output is not spent, then there is nothing left to update
      if (output.spentTxId === null) break

      // update the jig with this next transaction
      tx = await this.blockchain.fetch(output.spentTxId, !dontRefresh.has(txid))
      const protoTx = new ProtoTransaction()
      await protoTx.import(tx, this.run, jig, true)
      dontRefresh.add(output.spentTxId)
      const jigProxies = Array.from(protoTx.proxies.values())
      if (!jigProxies.some(proxy => proxy === jig)) throw new Error('jig not found')
      txid = jig.location.slice(0, 64)
      vout = parseInt(jig.location.slice(66))
    }

    // Mark this jig as updated so it isn't updated again by a circular reference
    seen.set(jig.origin, jig)

    this.fastForwardInnerTokens(jig, dontRefresh, seen)
  }

  async fastForwardInnerTokens (x, dontRefresh, seen) {
    const intrinsics = new Xray.Intrinsics()
      .use(this.code.evaluator.intrinsics)

    const xray = new Xray()
      .allowTokens()
      .deeplyScanTokens()
      .useIntrinsics(intrinsics)

    JigControl.disableProxy(() => xray.scan(x))

    const { Jig } = require('.')

    for (const token of xray.tokens) {
      if (token !== x && token instanceof Jig) {
        await this.fastForward(token, dontRefresh, seen)
      }
    }
  }
}
