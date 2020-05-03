/**
 * record.js
 *
 * A recording of a set of actions that can be turned into a Bitcoin transaction
 */

const bsv = require('bsv')
const { JigControl } = require('./jig')
const ResourceJSON = require('../util/json')
const { _populatePreviousOutputs } = require('../util/bsv')
const { ResourceSet } = require('../util/datatypes')
const Log = require('../util/log')
const Location = require('../util/location')
const {
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
  _encryptRunData
} = require('../util/opreturn')

// ------------------------------------------------------------------------------------------------
// Record
// ------------------------------------------------------------------------------------------------

const TAG = 'Record'

/**
 * A temporary structure Run uses to build transactions
 *
 * This structure has every action and definition that will go into the real transaction, but
 * stored using references to the actual objects instead of location strings. Run turns the record
 * into a real transaction by converting all references into location strings. This is necessary
 * when there are queued records and the locations may not be known yet.
 */
class Record {
  constructor (_onReadyForPublish) {
    this._onReadyForPublish = _onReadyForPublish
    this._reset()
  }

  _reset () {
    this._code = [] // Code definitions as types
    this._actions = [] // Jig updates

    this._before = new Map() // state of all updated jigs before (Target->{json,refs})
    this._after = new Map() // state of all updated jigs after (Target->{json,refs})

    this._inputs = [] // Targets spent (which may not be tx inputs if created within a batch)
    this._outputs = [] // Targets outputted
    this._reads = new Set() // All targets read
    this._proxies = new Map() // Target->Proxy
    this._locations = new Map() // Prior location for jigs (Origin->Location)

    this._beginCount = 0 // begin() depth, that is decremented for each end()
    this._importing = false
    this._paid = false
    this._cachedTx = null
  }

  _empty () {
    if (this._code.length) return false
    if (this._actions.length) return false
    if (this._beginCount) return false
    return true
  }

  async _import (tx, kernel, preexistingJig, immutable, vout, cache) {
    // Make sure we're not already creating a transaction
    if (!this._empty()) throw new Error('Cannot import: Transaction already in progress')

    // Fill in the transaction's previous inputs so we can load it
    _populatePreviousOutputs(tx, kernel._blockchain)

    // Importing transactions will only notify the inventory at the end
    this._importing = true

    // Transaction depth is automatically 1, so that we can import and then end() to publish
    this._beginCount = 1

    // Read the OP_RETURN data
    const data = _extractRunData(tx)
    const bsvNetwork = _bsvNetwork(kernel._blockchain.network)

    // Install code definitions
    let index = 1
    const loadedCode = []
    for (const def of data.code) {
      const location = `${tx.hash}_o${index++}`
      const T = await kernel._code._installFromTx(def, location, tx, kernel, bsvNetwork, cache)
      loadedCode.push(T)
    }

    if (vout && vout > 0 && vout < 1 + data.code.length) {
      // TODO: Fix this hack ... to just make the early out code work
      this._code = new Array(data.code.length)
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

    for (const action of data.actions) {
      const resourceLoader = ref =>
        JigControl._disableSafeguards(() => {
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
          return this._proxies.get(this._outputs[vout - data.code.length])
        })

      const opts = {
        _sandboxIntrinsics: kernel._code._sandboxIntrinsics,
        _reviver: ResourceJSON._revive._multiple(
          ResourceJSON._revive._resources(resourceLoader),
          ResourceJSON._revive._arbitraryObjects())
      }

      const args = ResourceJSON._deserialize(action.args, opts)

      if (action.method === 'init') {
        if (action.target[0] === '_') {
          const vout = parseInt(action.target.slice(2))
          if (vout <= 0 || vout >= data.code.length + 1) throw new Error(`missing target ${action.target}`)
        }

        const loc = action.target[0] === '_' ? tx.hash + action.target : action.target
        const S = await kernel._transaction.load(loc)

        const creator = ResourceJSON._deserialize(action.creator, opts)
        kernel._transaction._override(this, creator)
        try {
          new S(...args)  // eslint-disable-line
        } finally {
          kernel._transaction._removeOverride()
        }
      } else {
        const subject = refs.get(action.target) ||
          this._proxies.get(this._outputs[parseInt(action.target.slice(2)) - 1 - data.code.length])
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

    const _spentJigs = this._inputs.filter(i => i.origin[0] !== '_')

    if (data.jigs !== this._outputs.length) throw new Error(`bad number of jigs: ${data.jigs} != ${this._outputs.length}`)
    if (tx.inputs.length < _spentJigs.length) throw new Error('not enough inputs')
    if (tx.outputs.length < data.code.length + data.jigs + 1) throw new Error('not enough outputs')
    _spentJigs.forEach((i, n) => {
      const location = `${tx.inputs[n].prevTxId.toString('hex')}_o${tx.inputs[n].outputIndex}`
      const location2 = this._locations.get(i.origin) || i.location
      if (location !== location2) throw new Error(`bad input ${n}`)
    })
    this._outputs.forEach((o, n) => {
      const index = 1 + data.code.length + n
      const hex1 = Buffer.from(_lockify(o.owner, bsvNetwork).script).toString('hex')
      const hex2 = tx.outputs[index].script.toHex()
      if (hex1 !== hex2) throw new Error(`Owner mismatch on output ${index}`)
      if (tx.outputs[index].satoshis < Math.max(o.satoshis, bsv.Transaction.DUST_AMOUNT)) {
        throw new Error(`bad satoshis on output ${index}`)
      }
    })

    if (immutable) {
      this._outputs.forEach(o => {
        const oid = `${tx.hash}_o${1 + data.code.length + parseInt(o.location.slice(2))}`
        if (o.origin[0] === '_') o.origin = oid
        if (o.location[0] === '_') o.location = oid
      })
    }

    // cache all of the loaded jigs
    const proxies = this._outputs.map(o => this._proxies.get(o))
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
    this._code = []
    data.code.forEach((def, index) => {
      const location = `${tx.hash}_o${index + 1}`
      const S = kernel._code._getSandboxed(location)
      const deps = {}
      const props = kernel._code.extractProps(S).props
      const creator = S.owner
      const success = () => {}
      const error = () => {}
      this._storeCode(S, S, deps, props, success, error, creator, kernel._code, kernel)
    })

    const _spentLocations = _spentJigs.map(jig => this._locations.get(jig.origin) || jig.location)
    this._cachedTx = { tx, refs: data.refs || [], _spentJigs, _spentLocations }

    // Notify the inventory of all loaded resources that are unspent
    for (let i = 0; i < this._code.length; i++) {
      if (tx.outputs[i + 1].spentTxId === null) {
        const S = this._code[i].S
        kernel._inventory._notify(S)
      }
    }
    for (let i = 0; i < this._outputs.length; i++) {
      if (tx.outputs[i + 1 + this._code.length].spentTxId === null) {
        const target = this._outputs[i]
        const proxy = this._proxies.get(target)
        kernel._inventory._notify(proxy)
      }
    }

    // We are done importing, so we can allow notifying now
    this._importing = false

    // Imported transaction will not add more payments, because that will change the signatures
    this._paid = true
  }

  _begin () { this._beginCount++ }

  _end () {
    if (this._beginCount === 0) throw new Error('end transaction without begin')
    if (--this._beginCount === 0 && this._onReadyForPublish && !this._empty()) {
      this._onReadyForPublish()
    }
  }

  _rollback (_lastPosted, kernel, error, unhandled) {
    // TODO: Shruggr said this method was throwing a previous update failed?
    // Outputs are supposed to be targets. Maybe the inventory? That would be fixed in 0.5.

    delete this._cachedTx

    // notify the definition. this will undo the location/origin to allow a retry.
    this._code.forEach(def => def.error())

    // Update the inventory's code
    this._code.forEach(def => kernel._inventory._notify(def.S))

    // revert the state of each jig
    this._outputs.forEach(jig => {
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
      const restored = this._before.get(jig).restore()
      JigControl._disableSafeguards(() => {
        Object.keys(jig).forEach(key => delete jig[key])
        Object.assign(jig, restored)
        jig.origin = origin
        if (!jig.location) jig.location = _lastPosted.get(origin)
      })

      // TODO: Deserialize saved state
    })

    // Update the inventory's jigs
    this._outputs.forEach(jig => kernel._inventory._notify(jig))

    this._reset()
  }

  _storeCode (T, S, deps, props, success, error, owner, code, kernel) {
    delete this._cachedTx
    this._paid = false

    this._begin()
    try {
      if (typeof owner === 'object') kernel._deploy(owner.constructor)
      this._code.push({ T, S, deps, props, success, error, owner })
      const tempLocation = `_d${this._code.length - 1}`
      T.owner = S.owner = owner // TODO: Sandbox owner
      if (!this._importing) kernel._inventory._notify(S)
      return tempLocation
    } finally {
      this._end()
    }
  }

  _storeAction (target, method, args, inputs, outputs, reads, before, after, proxies, kernel) {
    delete this._cachedTx
    this._paid = false

    this._begin()
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
        this._before.set(target, this._before.get(target) || checkpoint)
      })

      after.forEach((checkpoint, target) => { this._after.set(target, checkpoint) })

      // ------------------------------------------------------------------------------------------
      // ADD INPUTS TO THE PROTO TRANSACTION
      // ------------------------------------------------------------------------------------------

      inputs.forEach(newTarget => {
        const isDifferentInstance = currTarget => _sameJig(newTarget, currTarget) &&
          currTarget.location !== newTarget.location
        if (this._inputs.some(isDifferentInstance)) {
          const differentInstance = this._inputs.find(isDifferentInstance)
          const differentLocation = this._before.get(differentInstance)._serialized.location
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

        if (!this._inputs.some(currTarget => _sameJig(newTarget, currTarget))) {
          this._inputs.push(newTarget)
        }
      })

      // ------------------------------------------------------------------------------------------
      // ADD OUTPUTS TO THE PROTO TRANSACTION AND SET TEMP LOCATIONS
      // ------------------------------------------------------------------------------------------

      outputs.forEach(jig => {
        const index = this._outputs.findIndex(previousJig => _sameJig(jig, previousJig))

        if (index !== -1) {
          jig.location = `_o${index}`
          jig.origin = jig.origin || jig.location
          return
        }

        this._outputs.push(jig)

        const updating = jig => (jig.origin && jig.origin[0] !== '_' && jig.location &&
          jig.location[0] !== '_' && !this._locations.has(jig.origin))

        if (updating(jig)) this._locations.set(jig.origin, jig.location)

        jig.location = `_o${this._outputs.length - 1}`
        jig.origin = jig.origin || jig.location
      })

      // ------------------------------------------------------------------------------------------
      // REMEMBER READS AND PROXIES FOR LATER
      // ------------------------------------------------------------------------------------------

      reads.forEach(proxy => this._reads.add(proxy))

      proxies.forEach((v, k) => this._proxies.set(k, v))

      // ------------------------------------------------------------------------------------------
      // STORE THE ACTION IN THE PROTO TRANSACTION
      // ------------------------------------------------------------------------------------------

      const creator = before.get(target).restore().owner

      this._actions.push({ target, method, creator, args, inputs, outputs, reads })
    } finally {
      this._end()
    }

    // Notify the inventory of each output
    if (!this._importing) outputs.forEach(target => kernel._inventory._notify(proxies.get(target)))
  }

  async _pay (kernel) {
    if (!this._cachedTx) this._buildBsvTransaction(kernel)
    this._cachedTx.tx = await kernel._purse.pay(this._cachedTx.tx) || this._cachedTx.tx
    this._paid = true
  }

  async _sign (kernel) {
    if (!this._cachedTx) this._buildBsvTransaction(kernel)

    // Sign with the owner
    const _spentJigs = this._inputs.filter(jig => jig.origin[0] !== '_')
    const numPayments = this._cachedTx.tx.inputs.length - _spentJigs.length
    const locks = _spentJigs
      .map(target => this._before.get(target))
      .map(checkpoint => checkpoint.restore())
      .map(resource => _lockify(resource.owner))
      .concat(new Array(numPayments))
    const tx = await kernel._owner.sign(this._cachedTx.tx, locks)
    this._cachedTx.tx = tx || this._cachedTx.tx

    // Sign with the purse, if necessary
    if (typeof kernel._purse.sign === 'function' && kernel._purse !== kernel._owner) {
      const tx = await kernel._purse.sign(this._cachedTx.tx)
      this._cachedTx.tx = tx || this._cachedTx.tx
    }
  }

  _buildBsvTransaction (kernel) {
    if (this._cachedTx) return this._cachedTx

    const blockchain = kernel._blockchain
    const publisher = kernel._publisher
    const net = _networkSuffix(blockchain.network)
    const bsvNetwork = _bsvNetwork(blockchain.network)

    // build the read references array, checking for different locations of the same jig
    const _spentJigs = this._inputs.filter(jig => jig.origin[0] !== '_')
    const readRefs = new Map()
    this._reads.forEach(jig => {
      if (_spentJigs.includes(jig) || this._outputs.includes(jig)) return
      const location =
        this._locations.get(jig.origin) ||
        publisher._lastPosted.get(jig.origin) ||
        jig.location
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
      const targets = Array.from(this._proxies.entries())
        .filter(([pk, pv]) => pv === target).map(([pk, pv]) => pk)
      if (targets.length) { target = targets[0] }

      // if the jig is an input, use it
      const inputIndex = _spentJigs.findIndex(i => _sameJig(i, target))
      if (inputIndex !== -1) return `_i${inputIndex}`

      // if the jig is an output, use it
      const outputIndex = this._outputs.findIndex(o => _sameJig(o, target))
      if (outputIndex !== -1) return `_o${1 + this._code.length + outputIndex}`

      // if the jig is a read reference, use it
      const refIndex = refs.indexOf(readRefs.get(target.origin))
      if (refIndex !== -1) return `_r${refIndex}`

      // otherwise, use the actual location
      return publisher._lastPosted.get(target.origin) || target.location
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
    const actions = this._actions.map(action => {
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
      const inputIndex = _spentJigs.findIndex(i => _sameJig(i, action.target))
      if (inputIndex !== -1) return { target: `_i${inputIndex}`, method, args }

      // if the jig has an output, use it (example: created within the transaction)
      const outputIndex = this._outputs.findIndex(o => _sameJig(o, action.target))
      if (outputIndex !== -1) return { target: `_o${1 + this._code.length + outputIndex}`, method, args }

      // the target was not updated in the transaction
      const target = action.target.location[0] !== '_' ? action.target.location
        : publisher._lastPosted.get(action.target.origin)
      return { target, method, args }
    })

    // Build each definition
    const code = this._code.map(def => {
      // Turn dependencies into references
      const fixloc = id => id[0] === '_' ? `_o${1 + parseInt(id.slice(2))}` : id
      const depsArr = Object.entries(def.deps).map(([k, v]) => ({ [k]: fixloc(v[`location${net}`]) }))
      const deps = depsArr.length ? Object.assign(...depsArr) : undefined

      // Serialize class props
      const props = Object.keys(def.props).length ? ResourceJSON._serialize(def.props, opts) : undefined

      // Serialize owner
      const owner = ResourceJSON._serialize(def.owner, opts)

      return { text: _sourceCode(def.T), deps, props, owner }
    })

    // Calculate hashes for each output
    // this._outputs.forEach(output => {
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
    const data = { code, actions, jigs: this._outputs.length, refs: refs.length ? refs : undefined }

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
    const _spentLocations = _spentJigs.map(jig =>
      this._locations.get(jig.origin) ||
      publisher._lastPosted.get(jig.origin) ||
      jig.location)
    _spentJigs.forEach((jig, index) => {
      const txid = _spentLocations[index].slice(0, 64)
      const vout = parseInt(_spentLocations[index].slice(66))
      const before = this._before.get(jig)
      const satoshis = Math.max(bsv.Transaction.DUST_AMOUNT, before.restore().satoshis)
      const scriptBuffer = _lockify(before.restore().owner, bsvNetwork).script
      const script = bsv.Script.fromBuffer(Buffer.from(scriptBuffer))
      const utxo = { txid, vout, script, satoshis }
      tx.from(utxo)
    })

    // Build run outputs first by adding code then by adding jigs

    this._code.forEach(def => {
      const scriptBuffer = _lockify(def.owner, bsvNetwork).script
      const script = bsv.Script.fromBuffer(Buffer.from(scriptBuffer))
      const satoshis = bsv.Transaction.DUST_AMOUNT
      tx.addOutput(new bsv.Transaction.Output({ script, satoshis }))
    })

    this._outputs.forEach(jig => {
      const restored = this._after.get(jig).restore()
      const scriptBuffer = _lockify(restored.owner, bsvNetwork).script
      const script = bsv.Script.fromBuffer(Buffer.from(scriptBuffer))
      const satoshis = Math.max(bsv.Transaction.DUST_AMOUNT, restored.satoshis)
      tx.addOutput(new bsv.Transaction.Output({ script, satoshis }))
    })

    // Mark all of the current outputs as unspent since we just built this
    tx.outputs.forEach(output => {
      output.spentTxId = null
      output.spentIndex = null
      output.spentHeight = null
    })

    this._cachedTx = { tx, refs, _spentJigs, _spentLocations }
    return this._cachedTx
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Record
