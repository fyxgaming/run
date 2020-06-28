/**
 * Record.js
 *
 * A record of a jig action that is turned into a transaction
 */

const bsv = require('bsv')
const { crypto, Transaction } = bsv
const Membrane = require('./membrane')
const { _kernel, _assert } = require('../../util/misc')
const { _text, _sourceCode, _parent } = require('../../util/type')
const { _deepVisit } = require('../../util/deep')
const { _location, _BINDINGS } = require('../../util/bindings')
const Snapshot = require('../../util/snapshot')
const Log = require('../../util/log')
const Codec = require('../../util/codec')

// TODO
// Published
// toJSON() needs to make sure nothing is unbound

// TODO
//    -publish async .. needs catch, and sync listeners

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Record'

const RECORDS = new Map() // Unpublished, ID -> Record

let PUBLISH_INTERCEPT = null

let RECORDING = false

// ------------------------------------------------------------------------------------------------
// Record
// ------------------------------------------------------------------------------------------------

class Record {
  constructor () {
    this._id = 'record://' + crypto.Random.getRandomBuffer(32).toString('hex')
    RECORDS.set(this._id, this)

    Log._debug(TAG, 'Create', this._id)

    this._kernel = _kernel()
    this._committed = false

    this._exec = []

    this._jigs = [] // all involved
    this._spends = [] // spends become outputs if not deleted
    this._deletes = [] // jigs spent or created but not outputs
    this._creates = [] // new jigs created
    this._reads = [] // jigs read that are not spends, deletes, or creates

    this._before = new Map() // Jig -> Snapshot
    this._after = new Map() // Jig -> Snapshot

    this._inputs = null
    this._outputs = null
    this._refs = null

    this._states = new Map() // Jig -> Object
    this._stateHashes = new Map() // Jig -> string
    this._payload = null
    this._tx = null

    this._upstream = [] // records we depend on
    this._downstream = [] // records that depend on us
  }

  _spend (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    if (hasJig(this._spends, jig)) return
    if (hasJig(this._creates, jig)) return
    if (hasJig(this._deletes, jig)) return

    this._spends.push(jig)

    this._before.set(jig, new Snapshot(jig))

    this._reads = this._reads.filter(jig2 => !sameJig(jig, jig2))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)

    this._link(jig)
  }

  _delete (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    _assert(hasJig(this._spends, jig) || hasJig(this._creates, jig))

    if (hasJig(this._deletes, jig)) return

    this._deletes.push(jig)

    this._reads = this._reads.filter(jig2 => !sameJig(jig, jig2))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)
  }

  _create (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    _assert(!hasJig(this._jigs, jig))

    if (hasJig(this._creates, jig)) return

    this._creates.push(jig)

    this._before.set(jig, new Snapshot(jig))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)
  }

  _read (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    if (hasJig(this._jigs, jig)) return

    this._reads.push(jig)

    this._before.set(jig, new Snapshot(jig))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)

    this._link(jig)
  }

  _commit () {
    _assert(this._exec.length)
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    Membrane._sudo(() => {
      this._jigs.forEach((jig, index) => {
        if (hasJig(this._reads, jig)) return

        const location = `${this._id}_j${index}`
        const deployed = !_location(jig.origin).error

        jig.origin = deployed ? jig.origin : location
        jig.location = location
        jig.nonce = jig.nonce + 1

        const ss = new Snapshot(jig)
        this._after.set(jig, ss)
      })
    })

    this._committed = true
  }

  _rollback (e) {
    if (!RECORDS.has(this._id)) return

    this._downstream.forEach(r => r._rollback(e))

    Log._debug(TAG, 'Rollback', this._id, ',', e)

    for (const [, snapshot] of this._before) {
      snapshot._rollback()
    }

    RECORDS.delete(this._id)
  }

  _combine (record) {
    _assert(this._committed)
    _assert(record._committed)
    _assert(this._kernel === record._kernel)

    record._spends.forEach(jig => _assert(!hasJig(this._deletes, jig)))
    record._spends.forEach(jig => _assert(spendableBinding(record._before.get(jig)._props.owner)))
    record._spends.forEach(jig => _assert(spendableBinding(record._before.get(jig)._props.satoshis)))

    record._jigs
      .filter(jig => !hasJig(this._jigs, jig))
      .forEach(jig => this._jigs.push(jig))

    record._spends
      .filter(jig => !hasJig(this._spends, jig))
      .filter(jig => !hasJig(this._creates, jig))
      .forEach(jig => this._spends.push(jig))

    record._creates
      .filter(jig => !hasJig(this._creates, jig))
      .forEach(jig => this._creates.push(jig))

    record._deletes
      .filter(jig => !hasJig(this._deletes, jig))
      .forEach(jig => this._deletes.push(jig))

    record._reads
      .filter(jig => !hasJig(this._jigs, jig))
      .forEach(jig => this._reads.push(jig))

    record._before.forEach((snapshot, jig) => {
      if (this._before.has(jig)) return
      this._before.set(jig, snapshot)
    })

    record._after.forEach((snapshot, jig) => {
      this._after.set(jig, snapshot)
    })

    record._upstream.forEach(r => {
      if (this._upstream.includes(r)) return
      this._upstream.push(r)
      r._downstream = r._downstream.filter(s => s !== record)
      r._downstream.push(this)
    })

    record._downstream.forEach(r => {
      if (this._downstream.includes(r)) return
      this._downstream.push(r)
      r._upstream = r._upstream.filter(s => s !== record)
      r._upstream.push(this)
    })

    this._exec = this._exec.concat(record._exec)

    Membrane._sudo(() => {
      this._jigs.forEach((jig, index) => {
        if (hasJig(this._reads, jig)) return

        const location = `${this._id}_j${index}`

        if (hasJig(this._creates, jig)) jig.origin = location
        jig.location = location
      })
    })

    this._committed = true

    RECORDS.delete(record._id)
  }

  _link (jig) {
    const location = Membrane._sudo(() => jig.location)
    const { record: recordId } = _location(location)
    if (!recordId) return

    const record = RECORDS.get(recordId)
    _assert(record, `Record not found: ${recordId}`)
    _assert(record._committed)

    if (!record._downstream.includes(this)) record._downstream.push(this)
    if (!this._upstream.includes(record)) this._upstream.push(record)
  }

  _upstreamPublished (record) {
    this._upstream = this._upstream.filter(r => r !== record)

    for (const [jig, prevss] of record._after) {
      const ours = this._jigs.find(j => sameJig(j, jig))
      if (!ours) continue

      const before = this._before.get(ours)
      if (!before) continue

      _BINDINGS.forEach(binding => { before._props[binding] = prevss._props[binding] })

      const Unbound = require('./unbound')

      const after = this._after.get(ours)
      if (after) {
        const props = after._props
        if (props.owner instanceof Unbound && !props.owner._value) props.owner = prevss._props.owner
        if (props.satoshis instanceof Unbound && !props.satoshis._value) props.satoshis = prevss._props.satoshis
      }

      if (!this._spentDownstream(ours)) {
        Membrane._sudo(() => {
          if (ours.owner instanceof Unbound && !ours.owner._value) ours.owner = prevss._props.owner
          if (ours.satoshis instanceof Unbound && !ours.satoshis._value) ours.satoshis = prevss._props.satoshis
        })
      }
    }

    this._publish()
  }

  _spentDownstream (jig) {
    for (const record of this._downstream) {
      for (const jig2 of record._spends) {
        if (sameJig(jig, jig2)) return true
      }
    }
    return false
  }

  _publish () {
    if (PUBLISH_INTERCEPT) return PUBLISH_INTERCEPT(this)

    if (this._upstream.length) return
    if (!this._spends.length && !this._creates.length) return

    this._publishInternal().catch(e => this._rollback(e))
  }

  async _publishInternal () {
    // Get owners in the after snapshots
    await this._determineOwners()

    // If the owners now depend on another transaction, wait for them
    if (this._upstream.size) return

    Log._debug(TAG, 'Publish', this._id)

    // Calculates inputs, outputs, and refs from our existing metadata
    this._determineTransactionJigs()

    // No more Unbound in owners and satoshis
    this._assignOwnersAndSatoshis()

    // Sort jigs by spends and refs, as they will be loaded later
    this._sortJigsForReplayability()

    // Calculate the serialized states of output and deleted jigs
    await this._calculateStates()

    // Calculate state hashes
    this._calculateStateHashes()

    // Create the OP_RETURN json
    this._createPayload()

    // Create the unpaid and unsigned tx
    this._createPartialTx()

    console.log('----------')
    console.log(JSON.stringify(this._exec))
    console.log('spends', this._spends.length)
    console.log('creates', this._creates.length)
    console.log('reads', this._reads.length)
    console.log('deletes', this._deletes.length)
    console.log('inputs', this._inputs.length)
    console.log('outputs', this._outputs.length)
    console.log('refs', this._refs.length)
    console.log('states', this._states.size)
    console.log('payload', JSON.stringify(this._payload, 0, 2))
    console.log('tx', this._tx.toJSON())
    console.log('----------')

    // Create TX
    // Pay for TX
    // Sign TX
    // Broadcast
    // Apply final bindings, outputs and deletes, and snapshots
    // Add to cache, both outputs and deleted
    // Add to inventory
    // Notify next transaction to start publishing

    //

    // this._spends.map(jig => this._before.get(jig)._props.location)

    // Create the transaction (separate method)
    // When a tx is imported, it is uncommitted
    // Jigs are assigned their record ID

    // Assign each owner to creates

    // How to know which commands go with which owners?

    // Owners that need to be deployed

    // Update snapshots

    // And actual jigs when not downstream

    // Find the jig at the key
    // Set the location and origin and owner and satoshis

    // For all non-downstream bindings, set here

    // Async, and rollback

    const bindings = new Map() // Jig -> Bindings

    this._downstream.forEach(r => r._upstreamPublished(this, bindings))

    RECORDS.delete(this.id)
  }

  async _determineOwners () {
    Log._debug(TAG, 'Getting owners for', this._id)

    const Unbound = require('./unbound')
    const Code = require('./code')
    const Jig = require('./jig')

    const hasUndeterminedOwner = () => this._creates
      .map(jig => this._after.get(jig)._props.owner)
      .some(owner => owner instanceof Unbound && !owner._value)

    let numLoops = 0
    while (hasUndeterminedOwner()) {
      if (++numLoops === 10) {
        const hint = 'Hint: Deploying your owner locks separately'
        throw new Error(`Stack overflow while deploying owners\n\n${hint}`)
      }

      // Get owners for new creates
      for (let i = 0; i < this._creates.length; i++) {
        const jig = this._creates[i]
        const after = this._after.get(jig)
        const prevowner = after._props.owner

        if (!(prevowner instanceof Unbound && !prevowner._value)) continue

        const owners = await this._kernel._owner.owner()
        const owner = Array.isArray(owners) ? owners[0] : owners

        after._props.owner = new Unbound(owner)
      }

      const owners = this._creates.map(jig => this._after.get(jig)._props.owner)

      // Deploy or link the code for the owners
      _deepVisit(owners, x => {
        if (x instanceof Code || x instanceof Jig) {
          const location = Membrane._sudo(() => x.location)
          const { record, error } = _location(location)

          if (record) {
            try {
              this._committed = false
              this._read(x)
              this._link(x)
              this._after.set(x, new Snapshot(x))
            } finally {
              this._committed = true
            }
          }

          if (error) {
            const oldPublishIntercept = PUBLISH_INTERCEPT

            try {
              const records = []
              PUBLISH_INTERCEPT = record => records.push(record)

              this._kernel._deploy2(x)

              while (records.length > 1) {
                const last = records.pop()
                records[records.length - 1]._combine(last)
              }

              this._combine(records[0])

              // Newly deployed locks might need owners too. So, we loop.
            } finally {
              PUBLISH_INTERCEPT = oldPublishIntercept
            }
          }

          return false
        }
      })
    }
  }

  _determineTransactionJigs () {
    this._inputs = this._spends
    this._refs = this._reads.map(jig => this._before.get(jig)._props.location)
    this._outputs = this._spends.filter(jig => !hasJig(this._deletes, jig))
    this._creates.filter(jig => jig => !hasJig(this._deletes, jig)).forEach(jig => this._outputs.push(jig))
  }

  _assignOwnersAndSatoshis () {
    const Unbound = require('./unbound')

    // For outputs, bind owners and satoshis
    this._outputs.forEach(jig => {
      const ssprops = this._after.get(jig)._props
      if (ssprops.owner instanceof Unbound) ssprops.owner = ssprops.owner._value
      if (ssprops.satoshis instanceof Unbound) ssprops.satoshis = ssprops.satoshis._value || 0

      if (this._spentDownstream(jig)) return

      Membrane._sudo(() => {
        if (jig.owner instanceof Unbound) jig.owner = ssprops.owner
        if (jig.satoshis instanceof Unbound) jig.satoshis = ssprops.value
      })
    })

    // For deleted, unbind owners and satoshis
    this._deletes.forEach(jig => {
      Membrane._sudo(() => {
        jig.owner = new Unbound(undefined)
        jig.satoshis = new Unbound(undefined)
      })

      const ssprops = this._after.get(jig)._props
      ssprops._props.owner = new Unbound(undefined)
      ssprops._props.satoshis = new Unbound(undefined)
    })
  }

  _sortJigsForReplayability () {
    this._jigs.sort((a, b) => {
      const spendsA = hasJig(this._spends, a)
      const spendsB = hasJig(this._spends, a)

      if (spendsA && spendsB) return 0
      if (spendsA) return -1
      if (spendsB) return 1

      const refsA = hasJig(this._refs, a)
      const refsB = hasJig(this._refs, a)

      if (refsA && refsB) return 0
      if (refsA) return -1
      if (refsB) return 1

      return 0
    })
  }

  async _calculateStates () {
    const jigs = this._outputs.concat(this._deletes)

    for (const jig of jigs) {
      const state = await this._calculateState(jig)

      this._states.set(jig, state)
    }
  }

  async _calculateState (jig) {
    const after = this._after.get(jig)
    _assert(after)

    // Create the state to encode
    const state = { }
    state.kind = after._kind
    state.props = Object.assign({}, after._props)
    if (after._cls) state.cls = after._cls
    if (after._src) state.src = after._src

    // Localize origin and location
    const vout = this._outputs.findIndex(x => sameJig(x, jig))
    const vdel = this._deletes.findIndex(x => sameJig(x, jig))
    const localLocation = vout === -1 ? `_d${vdel}` : `_o${vout + 1}`

    if (state.props.origin.startsWith(this._id)) state.props.origin = localLocation
    state.props.location = localLocation

    // Load the previous state's dependencies to use when we don't spend
    const dependencyMap = await this._createDependencyMap(jig)

    // Create the codec used to encode the state
    const codec = new Codec()._saveJigs(x => {
      const vout = this._outputs.findIndex(y => sameJig(x, y))
      if (vout >= 0) return `_o${vout + 1}`

      const vdel = this._deletes.findIndex(y => sameJig(x, y))
      if (vdel >= 0) return `_d${vout}`

      const vref = this._reads.findIndex(y => sameJig(x, y))
      if (vref >= 0) return this._refs[vref]

      const origin = Membrane._sudo(() => x.origin)
      const dependencyLocation = dependencyMap.get(origin)
      _assert(dependencyLocation)
      return dependencyLocation
    })

    // Encode the state with local locations
    const encodedState = codec._encode(state)

    return encodedState
  }

  async _createDependencyMap (jig) {
    if (hasJig(this._creates, jig)) return new Map()

    const location = this._before.get(jig)._props.location

    // Load the jig before. Ideally, with no inners.
    const prev = await this._kernel._load2(location)

    const map = new Map()

    const Jig = require('./jig')
    const { Berry } = require('../berry')
    const Code = require('./code')

    // Map all inner origins to locations
    _deepVisit(prev, x => {
      if (x instanceof Jig || x instanceof Code || x instanceof Berry) {
        Membrane._sudo(() => map.set(x.origin, x.location))
        return false
      }
    })

    return map
  }

  _calculateStateHashes () {
    for (const [jig, state] of this._states) {
      if (this._stateHashes.has(jig)) continue

      const stateString = JSON.stringify(state)
      const stateBuffer = bsv.deps.Buffer.from(stateString, 'utf8')

      const stateHashBuffer = bsv.crypto.Hash.sha256(stateBuffer)
      const stateHashString = stateHashBuffer.toString('hex')

      this._stateHashes.set(jig, stateHashString)
    }
  }

  _createPayload () {
    const out = this._outputs.map(jig => this._stateHashes.get(jig))
    const del = this._deletes.map(jig => this._stateHashes.get(jig))

    const jsonCodec = new Codec()._saveJigs(x => {
      const index = this._jigs.indexOf(x)
      _assert(index >= 0)
      return index
    })

    const exec = this._exec.map(x => jsonCodec._encode(x))

    const owners = this._creates.map(jig => this._after.get(jig)._props.owner)
    const lock = jsonCodec._encode(owners)

    const json = { in: this._inputs.length, ref: this._refs, out, del, lock, exec }

    this._payload = json
  }

  _createPartialTx () {
    const tx = new Transaction()

    this._tx = tx
  }

  _deploy (Cs) {
    _assert(Cs.length)
    _assert(!this._exec.length)

    Log._info(TAG, 'Deploy', Cs.map(C => _text(C)).join(', '))

    const cmd = { cmd: 'deploy', data: [] }

    // Spend parent inputs
    Cs.forEach(C => {
    // Utility classes don't need to be spent
      if (C.options && C.options.utility) return

      // No parent, no spend
      const Parent = _parent(C)
      if (!Parent) return

      // What if the parent is not yet created?
      this._spend(Parent)
    })

    // Create the arguments for the deploy action
    Cs.forEach(C => {
      const src = _sourceCode(C)
      const props = Membrane._sudo(() => Object.assign({}, C))

      // Remove bindings from the props because they won't be deployed
      _BINDINGS.forEach(x => delete props[x])

      // Make sure there are no presets
      _assert(!props.presets)

      cmd.data.push(src)
      cmd.data.push(props)

      this._create(C)
    })

    this._exec.push(cmd)
  }
}

// ------------------------------------------------------------------------------------------------
// _record
// ------------------------------------------------------------------------------------------------

Record._record = callback => {
  _assert(!RECORDING)

  const record = new Record()

  try {
    RECORDING = true

    const ret = callback(record)

    if (ret instanceof Promise) {
      throw new Error('Transactions must not include any asyncronous code')
    }

    record._commit()
    record._publish()
  } catch (e) {
    record._rollback(e)

    throw e
  } finally {
    RECORDING = false
  }
}

// ------------------------------------------------------------------------------------------------
// _recordMultiple
// ------------------------------------------------------------------------------------------------

Record._recordMultiple = callback => {
  const records = []
  const oldPublishIntercept = PUBLISH_INTERCEPT
  PUBLISH_INTERCEPT = record => records.push(record)

  try {
    const ret = callback()

    if (ret instanceof Promise) {
      throw new Error('Transactions must not include any asyncronous code')
    }

    while (records.length > 1) {
      const last = records.pop()
      records[records.length - 1]._combine(last)
    }

    if (records.length) records[0]._publish()
  } catch (e) {
    records.reverse().forEach(r => r._rollback(e))

    throw e
  } finally {
    PUBLISH_INTERCEPT = oldPublishIntercept
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function sameJig (a, b) {
  return Membrane._sudo(() => {
    if (a === b) return true
    if (_location(a.origin).error) return false
    if (_location(b.origin).error) return false
    if (a.origin !== b.origin) return false
    if (a.location !== b.location) throw new Error('Inconsistent worldview')
    return true
  })
}

// ------------------------------------------------------------------------------------------------

const hasJig = (arr, jig) => arr.some(x => sameJig(x, jig))

// ------------------------------------------------------------------------------------------------

const spendableBinding = binding => !(binding instanceof require('./Unbound')) || !binding

// ------------------------------------------------------------------------------------------------

module.exports = Record
