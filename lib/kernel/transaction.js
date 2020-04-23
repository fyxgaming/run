/**
 * transaction.js
 *
 * Transaction API for inspecting and building bitcoin transactions
 */

const bsv = require('bsv')
const { JigControl } = require('./jig')
const Location = require('../util/location')
const { _pluckBerry } = require('./berry')
const { ResourceSet } = require('../util/datatypes')
const ResourceJSON = require('../util/json')
const Log = require('../util/log')
const { _populatePreviousOutputs } = require('../util/bsv')
const {
  _activeRun,
  _bsvNetwork,
  _networkSuffix,
  _resourceType,
  _sameJig,
  _display,
  _sourceCode,
  _deepReplaceObjects,
  _lockify
} = require('../util/misc')
const {
  PROTOCOL_VERSION,
  _extractRunData,
  _encryptRunData,
  _outputType
} = require('../util/opreturn')

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
    this._protoTx = new _ProtoTransaction(this._onReadyForPublish.bind(this)) // current proto-transaction

    // Overrides used during playback
    this._protoTxOverride = null
    this._resourceOwnerOverride = null
  }

  // Internal methods to get the actual or playback state
  get _activeProtoTx () { return this._protoTxOverride || this._protoTx }
  _nextResourceOwner () { return this._resourceOwnerOverride || this._kernel._owner.next() }

  // Methods to override the current proto tx and owner during playback
  _override (protoTx, resourceOwner) { this._protoTxOverride = protoTx; this._resourceOwnerOverride = resourceOwner }
  _removeOverride () { this._protoTxOverride = null; this._resourceOwnerOverride = null }

  // Methods to begin and end a batch transaction
  begin () { this._activeProtoTx.begin(); return _activeRun() }
  end () { this._activeProtoTx.end(); return _activeRun() }

  _onReadyForPublish () {
    // We don't publish when playing back transactions
    if (this._protoTxOverride) return

    this._kernel._syncer._publish(this._protoTx)
    this._protoTx = new _ProtoTransaction(this._onReadyForPublish.bind(this))
  }

  export () {
    if (this._kernel._syncer._queued.length > 0) {
      // TODO: Only have to check if referenced jigs are in the queue
      throw new Error('must not have any queued transactions before exporting')
    }

    if (this._activeProtoTx.beginCount === 0) {
      const suggestion = 'Hint: A transaction must first be created using begin() or loaded using import().'
      throw new Error(`No transaction in progress\n\n${suggestion}`)
    }

    return this._activeProtoTx._buildBsvTransaction(this._kernel).tx
  }

  import (tx) { return this._activeProtoTx._import(tx, this._kernel, false) }

  rollback () { this._activeProtoTx.rollback(this._kernel._syncer._lastPosted, this._kernel, false, 'intentional rollback') }

  async sign () { await this._activeProtoTx.sign(this._kernel) }

  async pay () { await this._activeProtoTx.pay(this._kernel) }

  // get inputs () {
  // TODO: filtering by inputs is broken
  // return this.protoTx.inputs
  // .filter(input => input.origin !== '_')
  // .map(input => this.protoTx.proxies.get(input))
  // }

  // get outputs () {
  // return this.protoTx.outputs.map(output => this.protoTx.proxies.get(output))
  // }

  get actions () {
    return this._activeProtoTx.actions.map(action => {
      return {
        target: this._activeProtoTx.proxies.get(action.target),
        method: action.method,
        args: action.args
      }
    })
  }

  _storeCode (type, sandbox, deps, props, success, error) {
    return this._activeProtoTx._storeCode(type, sandbox, deps, props, success, error,
      this._nextResourceOwner(), this._kernel._code, this._kernel)
  }

  _storeAction (target, method, args, inputs, outputs, reads, before, after, proxies) {
    this._activeProtoTx._storeAction(target, method, args, inputs, outputs, reads, before, after,
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
    const protoTx = new _ProtoTransaction()
    protoTx.importing = true
    const tx = await this._kernel._blockchain.fetch(txid)

    // Check that we are loading a resource
    // TODO: Rename this error in 0.6
    const outputType = _outputType(tx, vout)
    if (outputType !== 'jig' && outputType !== 'code') {
      throw new Error(`Not a token: ${location}`)
    }

    // Import the transaction
    await protoTx._import(tx, this._kernel, null, true, vout, options._partiallyInstalledCode)

    // if a definition, install
    if (vout > 0 && vout < protoTx.code.length + 1) {
      return this._kernel._code._getSandboxed(location) || options._partiallyInstalledCode.get(location)
    }

    // otherwise, a jig. get the jig.
    const proxies = protoTx.outputs.map(o => protoTx.proxies.get(o))
    const jigProxies = new Array(1 + protoTx.code.length).concat(proxies)
    // TODO: Notify shruggr if these error message change
    if (typeof jigProxies[vout] === 'undefined') throw new Error('not a jig output')
    return jigProxies[vout]
  }
}

// ------------------------------------------------------------------------------------------------
// _ProtoTransaction
// ------------------------------------------------------------------------------------------------

/**
 * Proto-transaction: A temporary structure Run uses to build transactions. This structure
 * has every action and definition that will go into the real transaction, but stored using
 * references to the actual objects instead of location strings. Run turns the proto-transaction
 * into a real transaction by converting all references into location strings. This is necessary
 * when there are queued proto-transactions and the locations may not be known yet.
 */
class _ProtoTransaction {
  constructor (_onReadyForPublish) {
    this._onReadyForPublish = _onReadyForPublish
    this.importing = false
    this.reset()
  }

  reset () {
    this.code = [] // Code definitions as types
    this.actions = [] // Jig updates

    this.before = new Map() // state of all updated jigs before (Target->{json,refs})
    this.after = new Map() // state of all updated jigs after (Target->{json,refs})

    this.inputs = [] // Targets spent (which may not be tx inputs if created within a batch)
    this.outputs = [] // Targets outputted
    this.reads = new Set() // All targets read
    this.proxies = new Map() // Target->Proxy
    this.locations = new Map() // Prior location for jigs (Origin->Location)

    this.beginCount = 0 // begin() depth, that is decremented for each end()
    this.paid = false
  }

  _empty () { return !this.code.length && !this.actions.length && !this.beginCount }

  async _import (tx, kernel, preexistingJig, immutable, vout, cache) {
    // Make sure we're not already creating a transaction
    if (!this._empty()) {
      throw new Error('Cannot import: Transaction already in progress')
    }

    // Fill in the transaction's previous inputs so we can load it
    _populatePreviousOutputs(tx, kernel._blockchain)

    // Imported transaction will not add more payments, because that will change the signatures
    this.paid = true

    // Transaction depth is automatically 1, so that we can import and then end() to publish
    this.beginCount = 1

    // Read the OP_RETURN data
    const data = _extractRunData(tx)
    const bsvNetwork = _bsvNetwork(kernel._blockchain.network)

    // Install code definitions
    let index = 1
    const loadedCode = []
    for (const def of data.code) {
      const location = `${tx.hash}_o${index++}`
      const T = await kernel._code.installFromTx(def, location, tx, kernel, bsvNetwork, cache)
      loadedCode.push(T)
    }

    if (vout && vout > 0 && vout < 1 + data.code.length) {
      // TODO: Fix this hack ... to just make the early out code work
      this.code = new Array(data.code.length)
      return
    }

    // load jig and class references used in args and reads
    const refs = new Map()
    if (data.refs) data.refs.forEach(ref => refs.set(ref, ref))

    for (const action of data.actions) {
      const addRef = id => {
        if (id[0] !== '_') { refs.set(id, id) }
        if (id[1] === 'i') {
          const txin = tx.inputs[parseInt(id.slice(2))]
          refs.set(id, `${txin.prevTxId.toString('hex')}_o${txin.outputIndex}`)
        }
      }

      if (action.target && action.method !== 'init') addRef(action.target)

      ResourceJSON._findAllResourceRefsInResourceJSON(action.args).forEach(ref => addRef(ref))
    }

    // make sure all of the refs we read are recent
    for (const [, value] of refs) {
      const refTx = await kernel._blockchain.fetch(value.slice(0, 64))
      const vout = parseInt(value.slice(66))
      if (typeof refTx.outputs[vout].spentTxId === 'undefined') {
        throw new Error('Cannot check if read is stale. Blockchain API does not support spentTxId.')
      }
      if (refTx.outputs[vout].spentTxId === null) continue
      const spentTx = await kernel._blockchain.fetch(refTx.outputs[vout].spentTxId)
      if (spentTx.time <= tx.time && spentTx.time >= refTx.time &&
        (tx.time - refTx.time) > 2 * 60 * 60 * 1000 && tx.hash !== spentTx.hash) {
        throw new Error(`${value} is stale. Aborting.`)
      }
    }

    // load the refs
    // TODO: make sure the target is recent when saved
    // TODO: would be better to do in parallel if possible...but Code is duplicated sometimes (why?)
    for (const [refId, refLocation] of refs) {
      if (preexistingJig && refLocation === preexistingJig.location) {
        refs.set(refId, preexistingJig)
      } else {
        try {
          refs.set(refId, await kernel._transaction.load(refLocation))
        } catch (e) {
          Log._error(TAG, e)
          throw new Error(`Error loading ref ${refId} at ${refLocation}\n\n${e}`)
        }
      }
    }

    if (preexistingJig) {
      refs.set(preexistingJig.location, preexistingJig)
    }

    // console.log('refs before dedup', refs)

    /*
    // Also load all inputs to spend (do we need to do this? These dedups?
    for (let vin = 0; vin < tx.inputs.length; vin++) {
      const input = tx.inputs[vin]
      try {
        const location = `${input.prevTxId.toString('hex')}_o${input.outputIndex}`
        if (preexistingJig && location === preexistingJig.location) {
          refs.set()
        }
        const refId = `_i${vin}`
        const jig = await run.transaction.load(location)
        refs.set(refId, jig)
      } catch (e) { }
    }
    */

    // dedupInnerRefs puts any internal objects in their referenced states using known references
    // ensuring that double-references refer to the same objects
    const dedupInnerRefs = jig => {
      const resourceReplacer = x => {
        if (_resourceType(x) === 'jig' && x !== jig) {
          // This doesn't capture everything. Why not? Are we getting all inner refs?
          const existing = Array.from(refs.values()).find(ref => ref.origin === x.origin)
          return existing || x
        }
        return x
      }
      // TODO: Doesn't dedup class properties...
      // Handle berries? Handle classes?
      JigControl._disableSafeguards(() => _deepReplaceObjects(jig, resourceReplacer))
    }

    // update the refs themselves with themselves
    for (const ref of refs.values()) dedupInnerRefs(ref)

    // ResourceJSON._serialize(refs, { _replacer: x => 'REPLACED' })
    // console.log('refs after dedup', refs)

    const argsToLog = []

    for (const action of data.actions) {
      // Deserialize the arguments
      const args = JigControl._disableSafeguards(() => {
        const resourceLoader = ref => {
          if (ref[0] !== '_' || ref[1] === 'i') {
            const resource = refs.get(ref)
            if (!resource) throw new Error(`Unexpected ref ${ref}`)
            return resource
          }
          if (ref[1] === 'r') {
            const resource = refs.get(data.refs[parseInt(ref.slice(2))])
            if (!resource) throw new Error(`Unexpected ref ${ref}`)
            return resource
          }
          if (ref[1] !== 'o') throw new Error(`Unexpected ref ${ref}`)
          const vout = parseInt(ref.slice(2)) - 1
          if (vout < data.code.length) return loadedCode[vout]
          return this.proxies.get(this.outputs[vout - data.code.length])
        }

        const deserializedArgs = ResourceJSON._deserialize(action.args, {
          _sandboxIntrinsics: kernel._code._sandboxIntrinsics,
          _reviver: ResourceJSON._revive._multiple(
            ResourceJSON._revive._resources(resourceLoader),
            ResourceJSON._revive._arbitraryObjects())
        })

        argsToLog.push(JigControl._disableSafeguards(() => `${deserializedArgs}`))

        return deserializedArgs
      })

      if (action.method === 'init') {
        if (action.target[0] === '_') {
          const vout = parseInt(action.target.slice(2))
          if (vout <= 0 || vout >= data.code.length + 1) throw new Error(`missing target ${action.target}`)
        }

        const loc = action.target[0] === '_' ? tx.hash + action.target : action.target
        const T = await kernel._transaction.load(loc)

        kernel._transaction._override(this, action.creator)
        try {
          new T(...args)  // eslint-disable-line
        } finally {
          kernel._transaction._removeOverride()
        }
      } else {
        const subject = refs.get(action.target) ||
          this.proxies.get(this.outputs[parseInt(action.target.slice(2)) - 1 - data.code.length])
        dedupInnerRefs(subject)
        if (typeof subject === 'undefined') throw new Error(`target ${action.target} missing`)

        kernel._transaction._override(this, null)
        try {
          subject[action.method](...args)
        } catch (e) {
          throw new Error(`unexpected exception in ${action.method}\n\n${e}`)
        } finally {
          kernel._transaction._removeOverride()
        }
      }
    }

    // TODO: use _buildBsvTransaction here to compare?

    const spentJigs = this.inputs.filter(i => i.origin[0] !== '_')

    if (data.jigs !== this.outputs.length) {
      const inputs = `Inputs: ${this.inputs}`
      const outputs = `Outputs: ${this.outputs}`
      const before = `Before: ${Array.from(this.before.values()).map(x => x.json)}`
      const after = `After: ${Array.from(this.after.values()).map(x => x.json)}`
      const info = `Args: ${inputs}\n${outputs}\n${before}\n${after}\n${argsToLog}`

      throw new Error(`bad number of jigs: ${data.jigs} != ${this.outputs.length}\n\n${info}`)
    }

    if (tx.inputs.length < spentJigs.length) throw new Error('not enough inputs')
    if (tx.outputs.length < data.code.length + data.jigs + 1) throw new Error('not enough outputs')
    spentJigs.forEach((i, n) => {
      const location = `${tx.inputs[n].prevTxId.toString('hex')}_o${tx.inputs[n].outputIndex}`
      const location2 = this.locations.get(i.origin) || i.location
      if (location !== location2) throw new Error(`bad input ${n}`)
    })
    this.outputs.forEach((o, n) => {
      const index = 1 + data.code.length + n
      const hex1 = Buffer.from(_lockify(o.owner, bsvNetwork).script).toString('hex')
      const hex2 = tx.outputs[index].script.toHex()
      if (hex1 !== hex2) throw new Error(`Owner mismatch on output ${index}`)
      if (tx.outputs[index].satoshis < Math.max(o.satoshis, bsv.Transaction.DUST_AMOUNT)) {
        throw new Error(`bad satoshis on output ${index}`)
      }
    })

    if (immutable) {
      this.outputs.forEach(o => {
        const oid = `${tx.hash}_o${1 + data.code.length + parseInt(o.location.slice(2))}`
        if (o.origin[0] === '_') o.origin = oid
        if (o.location[0] === '_') o.location = oid
      })
    }

    // cache all of the loaded jigs
    const proxies = this.outputs.map(o => this.proxies.get(o))
    const jigProxies = new Array(1 + data.code.length).concat(proxies)
    const net = _networkSuffix(kernel._blockchain.network)
    for (let vout = 0; vout < jigProxies.length; vout++) {
      if (!jigProxies[vout]) continue
      const jigLocation = `${tx.hash.slice(0, 64)}_o${vout}`

      // Serialize the state of the jig into a local reference form
      const serialized = JigControl._disableSafeguards(() => {
        const state = Object.assign({}, jigProxies[vout])

        if (state.origin.startsWith(tx.hash) || state.origin.startsWith('_')) delete state.origin
        if (state.location.startsWith(tx.hash) || state.location.startsWith('_')) delete state.location

        const resourceToRelativeLocation = x => x.location.startsWith(tx.hash) ? x.location.slice(64) : x.location

        return ResourceJSON._serialize(state, {
          _sandboxIntrinsics: kernel._code._sandboxIntrinsics,
          _replacer: ResourceJSON._replace._cache(
            ResourceJSON._replace._multiple(
              ResourceJSON._replace._resources(resourceToRelativeLocation),
              ResourceJSON._replace._arbitraryObjects()))
        })
      })

      let type = jigProxies[vout].constructor[`origin${net}`]
      if (type.startsWith(tx.hash)) type = type.slice(64)

      const cachedState = { type, state: serialized }
      await kernel._state.set(jigLocation, cachedState)
    }

    // clear the code, and load it directly from the transaction
    this.code = []
    data.code.forEach((code, index) => {
      const location = `${tx.hash}_o${index + 1}`
      const type = kernel._code._getSandboxed(location)
      this._storeCode(type, type, {}, kernel._code.extractProps(type).props, () => {}, () => {},
        code.owner, kernel._code, kernel)
    })

    const spentLocations = spentJigs.map(jig => this.locations.get(jig.origin) || jig.location)
    this._cachedTx = { tx, refs: data.refs || [], spentJigs, spentLocations }

    // Notify the inventory of all jigs and code now that we've loaded them
    // TODO: They may not be recent, so we don't do this. Do after sync
    // this.code.forEach(def => kernel._inventory._notify(def.sandbox))
    // this.outputs.forEach(target => kernel._inventory._notify(this.proxies.get(target)))
  }

  begin () { this.beginCount++ }

  end () {
    if (this.beginCount === 0) throw new Error('end transaction without begin')
    if (--this.beginCount === 0 && this._onReadyForPublish && (this.code.length || this.actions.length)) {
      this._onReadyForPublish()
    }
  }

  rollback (_lastPosted, kernel, error, unhandled) {
    // TODO: Shruggr said this method was throwing a previous update failed?
    // Outputs are supposed to be targets. Maybe the inventory? That would be fixed in 0.5.

    delete this._cachedTx

    // notify the definition. this will undo the location/origin to allow a retry.
    this.code.forEach(def => def.error())

    // Update the inventory's code
    this.code.forEach(def => kernel._inventory._notify(def.sandbox))

    // revert the state of each jig
    this.outputs.forEach(jig => {
      // if the jig was never deployed, or if there was an unhandled error leading to this
      // rollback, then make this jig permanently unusable by setting a bad origin.
      if (jig.origin[0] === '_' || unhandled) {
        const err = `!${jig.origin[0] === '_' ? 'Deploy failed'
          : 'A previous update failed'}\n\n${error}`
        // TODO: log the error here
        Object.keys(jig).forEach(key => delete jig[key])
        jig.origin = jig.location = err
        return
      }

      // if this jig was already reverted, continue
      if (jig.location[0] !== '_') return

      // revert the state of the jig to its state before this transaction
      const origin = jig.origin
      const restored = this.before.get(jig).restore()
      JigControl._disableSafeguards(() => {
        Object.keys(jig).forEach(key => delete jig[key])
        Object.assign(jig, restored)
      })
      jig.origin = origin
      jig.location = _lastPosted.get(origin)

      // TODO: Deserialize saved state
    })

    // Update the inventory's jigs
    this.outputs.forEach(jig => kernel._inventory._notify(jig))

    this.reset()
  }

  _storeCode (type, sandbox, deps, props, success, error, owner, code, kernel) {
    delete this._cachedTx

    this.begin()
    try {
      if (typeof owner === 'object') kernel._deploy(owner.constructor)
      this.code.push({ type, sandbox, deps, props, success, error, owner })
      const tempLocation = `_d${this.code.length - 1}`
      type.owner = sandbox.owner = owner // TODO: Sandbox owner
      if (!this.importing) kernel._inventory._notify(code._getSandboxed(type))
      return tempLocation
    } finally {
      this.end()
    }
  }

  _storeAction (target, method, args, inputs, outputs, reads, before, after, proxies, kernel) {
    delete this._cachedTx

    this.begin()
    try {
      // ------------------------------------------------------------------------------------------
      // CHECK FOR MULTIPLE DIFFERENT JIG REFERENCES
      // ------------------------------------------------------------------------------------------

      // This doesn't cover the case of undeployed locations. We must run this again in publish.
      // Also, inner references that aren't read aren't checked, but this isn't a problem because
      // the user can 'sync' these up to their latest state before they read them in the future.

      const resources = new ResourceSet([target])
      inputs.forEach(jig => resources.add(jig))
      outputs.forEach(jig => resources.add(jig))
      reads.forEach(jig => resources.add(jig))

      // ------------------------------------------------------------------------------------------
      // STORE NEW BEFORE STATES AND ALL AFTER STATES FOR JIGS IN THE PROTO TRANSACTION
      // ------------------------------------------------------------------------------------------

      before.forEach((checkpoint, target) => {
        this.before.set(target, this.before.get(target) || checkpoint)
      })

      after.forEach((checkpoint, target) => { this.after.set(target, checkpoint) })

      // ------------------------------------------------------------------------------------------
      // ADD INPUTS TO THE PROTO TRANSACTION
      // ------------------------------------------------------------------------------------------

      inputs.forEach(newTarget => {
        const isDifferentInstance = currTarget => _sameJig(newTarget, currTarget) &&
          currTarget.location !== newTarget.location
        if (this.inputs.some(isDifferentInstance)) {
          const differentInstance = this.inputs.find(isDifferentInstance)
          const differentLocation = this.before.get(differentInstance).serialized.location
          const line1 = `origin: ${newTarget.origin}`
          const line2 = `1st location (after update): ${differentInstance.location}`
          const line3 = `1st location (before update): ${differentLocation}`
          const line4 = `2nd location: ${newTarget.location}`
          const info = `${line1}\n${line2}\n${line3}\n${line4}`
          const hint = differentLocation === newTarget.location
            ? 'Hint: Multiple dfferent up-to-date instances of this jig were found. Try updating without the batch.'
            : `Hint: Try syncing all instances of this jig before calling ${method}`
          const description = `Different location for ${differentInstance} found in ${method}()`
          throw new Error(`${description}\n\n${info}\n\n${hint}`)
        }

        if (!this.inputs.some(currTarget => _sameJig(newTarget, currTarget))) {
          this.inputs.push(newTarget)
        }
      })

      // ------------------------------------------------------------------------------------------
      // ADD OUTPUTS TO THE PROTO TRANSACTION AND SET TEMP LOCATIONS
      // ------------------------------------------------------------------------------------------

      outputs.forEach(jig => {
        const index = this.outputs.findIndex(previousJig => _sameJig(jig, previousJig))

        if (index !== -1) {
          jig.location = `_o${index}`
          jig.origin = jig.origin || jig.location
          return
        }

        this.outputs.push(jig)

        const updating = jig => (jig.origin && jig.origin[0] !== '_' && jig.location &&
          jig.location[0] !== '_' && !this.locations.has(jig.origin))

        if (updating(jig)) this.locations.set(jig.origin, jig.location)

        jig.location = `_o${this.outputs.length - 1}`
        jig.origin = jig.origin || jig.location
      })

      // ------------------------------------------------------------------------------------------
      // REMEMBER READS AND PROXIES FOR LATER
      // ------------------------------------------------------------------------------------------

      reads.forEach(proxy => this.reads.add(proxy))

      proxies.forEach((v, k) => this.proxies.set(k, v))

      // ------------------------------------------------------------------------------------------
      // STORE THE ACTION IN THE PROTO TRANSACTION
      // ------------------------------------------------------------------------------------------

      const creator = before.get(target).restore().owner

      this.actions.push({ target, method, creator, args, inputs, outputs, reads })
    } finally {
      this.end()
    }

    // Notify the inventory of each output
    if (!this.importing) outputs.forEach(target => kernel._inventory._notify(proxies.get(target)))
  }

  async pay (kernel) {
    if (this.paid) return
    if (!this._cachedTx) this._buildBsvTransaction(kernel)
    this._cachedTx.tx = await kernel._purse.pay(this._cachedTx.tx) || this._cachedTx.tx
    this.paid = true
  }

  async sign (kernel) {
    if (!this._cachedTx) this._buildBsvTransaction(kernel)
    const spentJigs = this.inputs.filter(jig => jig.origin[0] !== '_')
    const numPayments = this._cachedTx.tx.inputs.length - spentJigs.length
    const locks = spentJigs
      .map(target => this.before.get(target))
      .map(checkpoint => checkpoint.restore())
      .map(resource => _lockify(resource.owner))
      .concat(new Array(numPayments))
    const tx = await kernel._owner.sign(this._cachedTx.tx, locks)
    this._cachedTx.tx = tx || this._cachedTx.tx
  }

  _buildBsvTransaction (kernel) {
    if (this._cachedTx) return this._cachedTx

    const { _blockchain: blockchain, _syncer: syncer } = kernel

    const net = _networkSuffix(blockchain.network)
    const bsvNetwork = _bsvNetwork(blockchain.network)

    // build the read references array, checking for different locations of the same jig
    const spentJigs = this.inputs.filter(jig => jig.origin[0] !== '_')
    const readRefs = new Map()
    this.reads.forEach(jig => {
      if (spentJigs.includes(jig) || this.outputs.includes(jig)) return
      const location = syncer._lastPosted.get(jig.origin) ||
        this.locations.get(jig.origin) || jig.location
      const prevLocation = readRefs.get(jig.origin)
      if (prevLocation && prevLocation !== location) {
        throw new Error(`read different locations of same jig ${jig.origin}`)
      }
      readRefs.set(jig.origin, location)
    })
    const refs = Array.from(readRefs.values())

    // Jig arguments, class props, and code need to be turned into resource references
    const jigToRelativeLocation = jig => {
      // find the jig if it is a proxy. it may not be a proxy if it wasn't used, but then
      // we won't have trouble reading origin/location. (TODO: is this true? might be queued)
      let target = jig
      const targets = Array.from(this.proxies.entries())
        .filter(([pk, pv]) => pv === target).map(([pk, pv]) => pk)
      if (targets.length) { target = targets[0] }

      // if the jig is an input, use it
      const inputIndex = spentJigs.findIndex(i => _sameJig(i, target))
      if (inputIndex !== -1) return `_i${inputIndex}`

      // if the jig is an output, use it
      const outputIndex = this.outputs.findIndex(o => _sameJig(o, target))
      if (outputIndex !== -1) return `_o${1 + this.code.length + outputIndex}`

      // if the jig is a read reference, use it
      const refIndex = refs.indexOf(readRefs.get(target.origin))
      if (refIndex !== -1) return `_r${refIndex}`

      // otherwise, use the actual location
      return syncer._lastPosted.get(target.origin) || target.location
    }

    const berryToRelativeLocation = berry => {
      const error = Location.parse(berry.location).error
      if (error) throw new Error(`Cannot serialize berry: ${error}`)
      return berry.location
    }

    const codeToRelativeLocation = T => {
      return T[`location${net}`][0] === '_'
        ? `_o${parseInt(T[`location${net}`].slice(2)) + 1}`
        : T[`location${net}`]
    }

    const resourceToRelativeLocation = resource => {
      switch (_resourceType(resource)) {
        case 'jig': return jigToRelativeLocation(resource)
        case 'berry': return berryToRelativeLocation(resource)
        case 'code': return codeToRelativeLocation(resource)
        default: throw new Error(`Unknown resource type: ${_display(resource)}`)
      }
    }

    const opts = {
      _sandboxIntrinsics: kernel._code._sandboxIntrinsics,
      _replacer: ResourceJSON._replace._cache(
        ResourceJSON._replace._multiple(
          ResourceJSON._replace._resources(resourceToRelativeLocation),
          ResourceJSON._replace._arbitraryObjects()))
    }

    // build each action
    const actions = this.actions.map(action => {
      const { method } = action

      const args = ResourceJSON._serialize(action.args, opts)

      // if init, this is a special case. find the definition and owner.
      if (method === 'init') {
        const targetLocation = action.target.constructor[`origin${net}`] ||
            action.target.constructor[`location${net}`]
        const target = targetLocation[0] === '_' ? `_o${1 + parseInt(targetLocation.slice(2))}` : targetLocation
        const creator = ResourceJSON._serialize(action.creator, opts)
        return { target, method, args, creator }
      }

      // if the jig has an input, use it
      const inputIndex = spentJigs.findIndex(i => _sameJig(i, action.target))
      if (inputIndex !== -1) return { target: `_i${inputIndex}`, method, args }

      // if the jig has an output, use it (example: created within the transaction)
      const outputIndex = this.outputs.findIndex(o => _sameJig(o, action.target))
      if (outputIndex !== -1) return { target: `_o${1 + this.code.length + outputIndex}`, method, args }

      // the target was not updated in the transaction
      const target = action.target.location[0] !== '_' ? action.target.location
        : syncer._lastPosted.get(action.target.origin)
      return { target, method, args }
    })

    // Build each definition
    const code = this.code.map(def => {
      // Turn dependencies into references
      const fixloc = id => id[0] === '_' ? `_o${1 + parseInt(id.slice(2))}` : id
      const depsArr = Object.entries(def.deps).map(([k, v]) => ({ [k]: fixloc(v[`location${net}`]) }))
      const deps = depsArr.length ? Object.assign(...depsArr) : undefined

      // Serialize class props
      const props = Object.keys(def.props).length ? ResourceJSON._serialize(def.props, opts) : undefined

      // Serialize owner
      const creator = ResourceJSON._serialize(def.owner, opts)

      return { text: _sourceCode(def.type), deps, props, creator }
    })

    // Calculate hashes for each output
    // this.outputs.forEach(output => {
    // console.log(output)
    // })
    // Maybe origin and location are removed, to make it deterministic
    // Origin is kept. If __, then removed. But what if 3 are pending? Maybe always remove origin.
    // But then how does state get reconstructed? Location is assigned. Sure. But what origin?
    // How do you know it was the original to put it on? What about refs that haven't been posted yet?
    // This is a bit of a problem. No it isn't. We know origin when we post. Not before. You don't
    // have pending stuff at this time. Include origin, if it's there. References will always be past
    // refs.

    // build our json payload
    const data = { code, actions, jigs: this.outputs.length, refs: refs.length ? refs : undefined }

    const encrypted = _encryptRunData(data)
    const { Buffer } = bsv.deps
    const prefix = Buffer.from('run', 'utf8')
    const protocolVersion = Buffer.from([PROTOCOL_VERSION], 'hex')
    const appId = Buffer.from(kernel._app, 'utf8')
    const payload = Buffer.from(encrypted, 'utf8')
    const debugInfo = Buffer.from('r11r', 'utf8')
    const script = bsv.Script.buildSafeDataOut([prefix, protocolVersion, appId, payload, debugInfo])
    const tx = new bsv.Transaction().addOutput(new bsv.Transaction.Output({ script, satoshis: 0 }))

    // build inputs
    const spentLocations = spentJigs.map(jig => syncer._lastPosted.get(jig.origin) ||
      this.locations.get(jig.origin) || jig.location)
    spentJigs.forEach((jig, index) => {
      const txid = spentLocations[index].slice(0, 64)
      const vout = parseInt(spentLocations[index].slice(66))
      const before = this.before.get(jig)
      const satoshis = Math.max(bsv.Transaction.DUST_AMOUNT, before.restore().satoshis)
      const scriptBuffer = _lockify(before.restore().owner, bsvNetwork).script
      const script = bsv.Script.fromBuffer(Buffer.from(scriptBuffer))
      const utxo = { txid, vout, script, satoshis }
      tx.from(utxo)
    })

    // Build run outputs first by adding code then by adding jigs

    this.code.forEach(def => {
      const scriptBuffer = _lockify(def.owner, bsvNetwork).script
      const script = bsv.Script.fromBuffer(Buffer.from(scriptBuffer))
      const satoshis = bsv.Transaction.DUST_AMOUNT
      tx.addOutput(new bsv.Transaction.Output({ script, satoshis }))
    })

    this.outputs.forEach(jig => {
      const restored = this.after.get(jig).restore()
      const scriptBuffer = _lockify(restored.owner, bsvNetwork).script
      const script = bsv.Script.fromBuffer(Buffer.from(scriptBuffer))
      const satoshis = Math.max(bsv.Transaction.DUST_AMOUNT, restored.satoshis)
      tx.addOutput(new bsv.Transaction.Output({ script, satoshis }))
    })

    this._cachedTx = { tx, refs, spentJigs, spentLocations }
    return this._cachedTx
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { _ProtoTransaction, Transaction }
