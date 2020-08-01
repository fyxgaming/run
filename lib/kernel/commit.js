/**
 * Commit.js
 *
 * A record that has been "locked in" and will be converted into a transaction
 */

const bsv = require('bsv')
const { crypto, Transaction, Script } = bsv
const Membrane = require('./membrane')
const Loader = require('./loader')
const { _kernel, _assert, _text } = require('../util/misc')
const { _deepVisit, _deepClone } = require('../util/deep')
const { _location, _owner, _BINDINGS, _UNDEPLOYED } = require('../util/bindings')
const Snapshot = require('../util/snapshot')
const Log = require('../util/log')
const Codec = require('../util/codec')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Commit'

const COMMITS = new Map() // Unpublished, ID -> Commit

let PUBLISH_INTERCEPT = null

let RECORDING = false

const PROTOCOL_VERSION = [0x03]

// Commit state
const STATE_EDITING = 1
const STATE_COMMITTED = 2
const STATE_PUBLISHING = 3
const STATE_PUBLISHED = 4
const STATE_ROLLBACK = 5

// ------------------------------------------------------------------------------------------------
// Commit
// ------------------------------------------------------------------------------------------------

class Commit {
  constructor () {
    const { _ImportLimit } = require('./import')

    this._id = 'commit://' + crypto.Random.getRandomBuffer(32).toString('hex')
    COMMITS.set(this._id, this)

    Log._debug(TAG, 'Create', this._id)

    this._kernel = _kernel()
    this._state = STATE_EDITING
    this._importLimit = new _ImportLimit()

    this._exec = []

    this._jigs = [] // all jigs or berries involved
    this._spends = [] // spends become outputs if not deleted
    this._deletes = [] // jigs spent or created but not outputs
    this._creates = [] // new jigs created
    this._reads = [] // jigs or berries read that are not spends, deletes, or creates
    this._nocreates = [] // jigs that may not be created in this transaction

    this._before = new Map() // Jig -> Snapshot
    this._after = new Map() // Jig -> Snapshot

    this._inputs = null
    this._outputs = null
    this._refs = null

    this._states = new Map() // Jig -> Object
    this._stateHashes = new Map() // Jig -> string
    this._payload = null

    this._tx = null
    this._txid = null

    this._upstream = [] // commits we depend on
    this._downstream = [] // commits that depend on us

    this._syncListeners = []
  }

  _cmd (name, data) {
    Log._debug(TAG, 'Command', name, data)

    const { _COMMANDS } = require('./command')
    _assert(_COMMANDS.includes(name))
    _assert(Array.isArray(data))

    const Code = require('./code')
    const Jig = require('./jig')
    const Berry = require('./berry')

    _deepVisit(data, x => {
      if (x instanceof Code || x instanceof Jig || x instanceof Berry) {
        this._read(x)
        return false
      }
    })

    this._exec.push({ _cmd: name, _data: data })
  }

  _spend (jig, snapshot = null) {
    _assert(this._state === STATE_EDITING)
    _assert(COMMITS.has(this._id))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)

    const undeployed = Membrane._sudo(() => jig.origin === _UNDEPLOYED)
    _assert(!undeployed, 'Cannot spend undeployed code')

    const native = Membrane._sudo(() => _location(jig.origin).native)
    _assert(!native, 'Cannot spend native code')

    if (hasJig(this._spends, jig)) return
    if (hasJig(this._creates, jig)) return
    if (hasJig(this._deletes, jig)) return

    this._spends.push(jig)

    Log._debug(TAG, 'Spend', _text(jig))

    this._before.set(jig, snapshot || new Snapshot(jig))

    this._reads = this._reads.filter(jig2 => !sameJig(jig, jig2))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)

    this._link(jig)
  }

  _nocreate (jig) {
    _assert(this._state === STATE_EDITING)
    _assert(COMMITS.has(this._id))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)

    _assert(!hasJig(this._creates, jig), 'Jig must not be created in this transaction')

    if (hasJig(this._nocreates, jig)) return

    this._nocreates.push(jig)

    Log._debug(TAG, 'No create', _text(jig))
  }

  _delete (jig) {
    _assert(this._state === STATE_EDITING)
    _assert(COMMITS.has(this._id))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)

    const native = Membrane._sudo(() => _location(jig.origin).native)
    _assert(!native, 'Cannot delete native code')

    _assert(hasJig(this._spends, jig) || hasJig(this._creates, jig))

    if (hasJig(this._deletes, jig)) return

    this._deletes.push(jig)

    Log._debug(TAG, 'Delete', _text(jig))

    this._reads = this._reads.filter(jig2 => !sameJig(jig, jig2))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)

    // Note: We don't need to link or set before because this jig was already spent or created
  }

  _create (jig) {
    _assert(this._state === STATE_EDITING)
    _assert(COMMITS.has(this._id))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)

    const native = Membrane._sudo(() => _location(jig.origin).native)
    _assert(!native, 'Cannot create native code')

    _assert(!hasJig(this._jigs, jig))
    _assert(!hasJig(this._nocreates, jig), 'Jig must not be created in this transaction')

    if (hasJig(this._creates, jig)) return

    this._creates.push(jig)

    Log._debug(TAG, 'Create', _text(jig))

    this._before.set(jig, new Snapshot(jig))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)
  }

  _read (jig) {
    _assert(this._state === STATE_EDITING)
    _assert(COMMITS.has(this._id))

    const Code = require('./code')
    const Jig = require('./jig')
    const Berry = require('./berry')
    _assert(jig instanceof Code || jig instanceof Jig || jig instanceof Berry)

    if (hasJig(this._jigs, jig)) return

    this._reads.push(jig)
    this._jigs.push(jig)

    Log._debug(TAG, 'Read', _text(jig))

    this._before.set(jig, new Snapshot(jig))

    this._link(jig)
  }

  _commit () {
    Log._debug(TAG, `Commit ${this._id}`)

    _assert(this._state === STATE_EDITING)
    _assert(COMMITS.has(this._id))

    const Jig = require('./jig')
    const Code = require('./jig')
    const Berry = require('./berry')

    // Clone and save the exec
    this._exec = _deepClone(this._exec, null, x => {
      if (x instanceof Jig || x instanceof Code || x instanceof Berry) {
        this._read(x)
        return x
      }
    })

    // Assign temporary location to all jigs
    Membrane._sudo(() => {
      this._jigs.forEach((jig, index) => {
        if (hasJig(this._reads, jig)) return

        const location = `${this._id}_j${index}`
        const deployed = !_location(jig.origin).undeployed

        jig.origin = deployed ? jig.origin : location
        jig.location = location
        jig.nonce = jig.nonce + 1

        const ss = new Snapshot(jig)
        this._after.set(jig, ss)
      })
    })

    this._state = STATE_COMMITTED
  }

  _rollback (e) {
    if (!COMMITS.has(this._id)) return

    this._downstream.forEach(r => r._rollback(e))

    const unhandled = e && this._syncListeners.length === 0

    Log._error(TAG, unhandled ? 'Unhandled' : '', e)
    Log._debug(TAG, `Rollback ${this._id}`)

    this._state = STATE_ROLLBACK

    for (const [, snapshot] of this._before) {
      snapshot._rollback()
    }

    // If unhandled, all outputs and deleted have the error
    if (unhandled) {
      const errorLocation = `error://Unhandled ${e}`

      Membrane._sudo(() => {
        this._spends
          .filter(jig => !hasJig(this._deletes, jig))
          .forEach(jig => { jig.locatin = errorLocation })
        this._deletes.forEach(jig => { jig.location = errorLocation })
      })
    }

    // Notify sync listeners of the failure if it is a failure
    if (e) {
      this._syncListeners.forEach(listener => listener.reject(e))
      this._syncListeners = []
    }

    COMMITS.delete(this._id)
  }

  _combine (record) {
    Log._debug(TAG, 'Combining', record._id, 'into', this._id)

    _assert(this._state === STATE_COMMITTED)
    _assert(record._state === STATE_COMMITTED)
    _assert(this._kernel === record._kernel)

    record._spends.forEach(jig => _assert(!hasJig(this._deletes, jig)))
    record._nocreates.forEach(jig => _assert(!hasJig(this._creates, jig)))
    record._spends.forEach(jig => _assert(spendableBinding(record._before.get(jig)._props.owner)))
    record._spends.forEach(jig => _assert(spendableBinding(record._before.get(jig)._props.satoshis)))

    // Find all jigs that are spent in both to reduce nonces
    const outputs = this._creates.concat(this._spends).filter(jig => !hasJig(this._deletes, jig))
    const reduceNonce = record._spends.filter(jig => hasJig(outputs, jig))

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

    record._nocreates
      .filter(jig => !hasJig(this._nocreates, jig))
      .forEach(jig => this._nocreates.push(jig))

    record._before.forEach((snapshot, jig) => {
      if (this._before.has(jig)) return
      this._before.set(jig, snapshot)
    })

    record._after.forEach((snapshot, jig) => {
      this._after.set(jig, snapshot)

      if (hasJig(this._reads, jig)) return

      const location = `${this._id}_j${this._jigs.indexOf(jig)}`

      if (hasJig(this._creates, jig)) snapshot._props.origin = location
      snapshot._props.location = location

      if (hasJig(reduceNonce, jig)) snapshot._props.nonce -= 1
    })

    record._upstream.forEach(r => {
      if (this._upstream.includes(r)) return
      if (r === this) return
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

    this._downstream = this._downstream.filter(x => x !== record)

    this._exec = this._exec.concat(record._exec)

    Membrane._sudo(() => {
      this._jigs.forEach((jig, index) => {
        if (hasJig(this._reads, jig)) return

        const location = `${this._id}_j${index}`

        if (hasJig(this._creates, jig)) jig.origin = location
        jig.location = location

        if (hasJig(reduceNonce, jig)) jig.nonce -= 1
      })
    })

    this._state = STATE_COMMITTED

    this._tx = null
    this._txid = null

    COMMITS.delete(record._id)
  }

  _link (jig) {
    const location = Membrane._sudo(() => jig.location)
    const { record: recordId } = _location(location)
    if (!recordId) return

    const record = COMMITS.get(recordId)
    _assert(record, `Commit not found: ${recordId}`)
    _assert(record._state !== STATE_EDITING)

    if (!record._downstream.includes(this)) record._downstream.push(this)
    if (!this._upstream.includes(record)) this._upstream.push(record)
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
    _assert(this._exec.length)
    _assert(this._state === STATE_COMMITTED)

    if (PUBLISH_INTERCEPT) return PUBLISH_INTERCEPT(this)

    if (this._upstream.length) return
    if (!this._spends.length && !this._creates.length) return

    this.state = STATE_PUBLISHING

    this._publishInternal().catch(e => this._rollback(e))
  }

  async _publishInternal () {
    // Get owners in the after snapshots
    await this._determineOwners()

    // If the owners now depend on another transaction, wait for them
    if (this._upstream.size) return

    Log._debug(TAG, 'Publish', this._id)

    // Prepare the record for publish. This fills in all properties.
    await this._buildPartialTx()

    // Pays and signs the transaction
    await this._completeTx()

    // Print information for debugging
    this._printDebugInfo()

    // Broadcast
    await this._broadcastTx()

    // Mark as published
    this._markPublished()

    // Save state and apply final jig bindings
    await this._finalizeJigs()

    // Begin publishing downstream transaction
    this._downstream.forEach(r => r._upstreamPublished(this))

    // The record is no longer needed
    COMMITS.delete(this._id)

    // Notify sync listeners and mark published
    this._syncListeners.forEach(s => s.resolve())
    this._syncListeners = []
  }

  async _determineOwners () {
    Log._debug(TAG, 'Getting owners for', this._id)

    const Unbound = require('../util/unbound')
    const Code = require('./code')
    const Jig = require('./jig')
    const Berry = require('./berry')

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
        if (x instanceof Code || x instanceof Jig || x instanceof Berry) {
          const location = Membrane._sudo(() => x.location)
          const { record, error, undeployed } = _location(location)

          if (x instanceof Berry || record) {
            const oldState = this._state
            this._state = STATE_EDITING
            try {
              this._read(x)
              this._link(x)
              this._after.set(x, new Snapshot(x))
            } finally {
              this._state = oldState
            }
          }

          if (error) {
            _assert(undeployed)

            const oldPublishIntercept = PUBLISH_INTERCEPT

            try {
              const records = []
              PUBLISH_INTERCEPT = record => records.push(record)

              const File = require('./file')
              const file = new File(x)
              file._deploy()

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

          return x instanceof Berry
        }
      })
    }
  }

  async _buildPartialTx () {
    // Check if we've already built the tx
    if (this._tx) return

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
  }

  async _completeTx () {
    // Add inputs and outputs to pay for the transaction
    await this._payForTx()

    // Sign the jig owners
    await this._signTx()

    // Check that we have all signatures. Friendlier error.
    this._spends.forEach((jig, i) => {
      if (this._tx.inputs[i].isFullySigned()) return
      const before = this._before.get(jig)
      const line1 = `origin: ${before._props.origin}`
      const line2 = `location: ${before._props.location}`
      const line3 = `owner: ${before._props.owner}`
      const details = `${line1}\n${line2}\n${line3}`
      const reason = this._tx.inputs[i].script.toBuffer().length ? 'Bad signature' : 'Missing signature'
      throw new Error(`${reason} for ${jig.constructor.name}\n\n${details}`)
    })
  }

  _determineTransactionJigs () {
    this._inputs = this._spends
    this._refs = this._reads.map(jig => this._before.get(jig)._props.location)
    this._outputs = this._spends.filter(jig => !hasJig(this._deletes, jig))
    this._creates.filter(jig => jig => !hasJig(this._deletes, jig)).forEach(jig => this._outputs.push(jig))
  }

  _assignOwnersAndSatoshis () {
    const Unbound = require('../util/unbound')

    // For outputs, bind owners and satoshis
    this._outputs.forEach(jig => {
      const ssprops = this._after.get(jig)._props
      if (ssprops.owner instanceof Unbound) ssprops.owner = ssprops.owner._value
      if (ssprops.satoshis instanceof Unbound) ssprops.satoshis = ssprops.satoshis._value || 0

      if (this._spentDownstream(jig)) return

      Membrane._sudo(() => {
        if (jig.owner instanceof Unbound) jig.owner = ssprops.owner
        if (jig.satoshis instanceof Unbound) jig.satoshis = ssprops.value || 0
      })
    })

    // For deleted, unbind owners and satoshis
    this._deletes.forEach(jig => {
      Membrane._sudo(() => {
        jig.owner = undefined
        jig.satoshis = 0
      })

      Membrane._sudo(() => {
        const ssprops = this._after.get(jig)._props
        ssprops.owner = undefined
        ssprops.satoshis = 0
      })
    })
  }

  _sortJigsForReplayability () {
    this._jigs.sort((a, b) => {
      const spendsA = hasJig(this._spends, a)
      const spendsB = hasJig(this._spends, b)

      if (spendsA && spendsB) return 0
      if (spendsA) return -1
      if (spendsB) return 1

      const readsA = hasJig(this._reads, a)
      const readsB = hasJig(this._reads, b)

      if (readsA && readsB) return 0
      if (readsA) return -1
      if (readsB) return 1

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
    state.version = Buffer.from(PROTOCOL_VERSION).toString('hex')
    state.kind = after._kind
    state.props = Object.assign({}, after._props)
    if (after._cls) state.cls = after._cls
    if (after._innerType) state.src = after._innerType.toString()

    // Localize origin and location
    const vout = this._outputs.findIndex(x => sameJig(x, jig))
    const vdel = this._deletes.findIndex(x => sameJig(x, jig))
    const localLocation = vout === -1 ? `_d${vdel}` : `_o${vout + 1}`

    if (state.props.origin.startsWith(this._id)) state.props.origin = localLocation
    state.props.location = localLocation

    // Load the previous state's references to use when we don't spend
    const referenceMap = await this._createReferenceMap(jig)

    // Create the codec used to encode the state
    const codec = new Codec()._saveJigs(x => {
      const vout = this._outputs.findIndex(y => sameJig(x, y))
      if (vout >= 0) return `_o${vout + 1}`

      const vdel = this._deletes.findIndex(y => sameJig(x, y))
      if (vdel >= 0) return `_d${vdel}`

      const vref = this._reads.findIndex(y => sameJig(x, y))
      if (vref >= 0) return this._refs[vref]

      const origin = Membrane._sudo(() => x.origin)
      if (origin.startsWith('native://')) return origin

      const referenceLocation = referenceMap.get(origin)
      _assert(referenceLocation)
      return referenceLocation
    })

    // Encode the state with local locations
    const encodedState = codec._encode(state)

    return encodedState
  }

  async _createReferenceMap (jig) {
    if (hasJig(this._creates, jig)) return new Map()

    const location = this._before.get(jig)._props.location

    // Load the jig before. Ideally, with no inners.
    const loader = new Loader(this._kernel, this._importLimit)
    const prev = await loader._load(location)

    const map = new Map()

    const Jig = require('./jig')
    const Berry = require('./berry')
    const Code = require('./code')

    // Map all inner origins to locations
    _deepVisit(prev, x => {
      if (x instanceof Jig || x instanceof Code || x instanceof Berry) {
        Membrane._sudo(() => map.set(x.origin || x.location, x.location))
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

    const exec = this._exec.map(x => {
      const dataCodec = new Codec()._saveJigs(x => {
        const index = this._jigs.indexOf(x)
        _assert(index >= 0)
        return index
      })

      const data = x._data.map(x => dataCodec._encode(x))

      return { cmd: x._cmd, data }
    })

    const ownersCodec = new Codec()._saveJigs(x => {
      const index = this._jigs.indexOf(x)
      _assert(index >= 0)
      return index
    })

    const owners = this._creates.map(jig => this._after.get(jig)._props.owner)
    const lock = ownersCodec._encode(owners)

    const json = { in: this._inputs.length, ref: this._refs, out, del, lock, exec }

    this._payload = json
  }

  _createPartialTx () {
    const tx = new Transaction()

    const Buffer = bsv.deps.Buffer
    const prefix = Buffer.from('run', 'utf8')
    const protocol = Buffer.from(PROTOCOL_VERSION, 'hex')
    const app = Buffer.from(this._kernel._app, 'utf8')
    const payload = Buffer.from(JSON.stringify(this._payload), 'utf8')
    const script = Script.buildSafeDataOut([prefix, protocol, app, payload])
    const output = new Transaction.Output({ script, satoshis: 0 })

    tx.addOutput(output)

    for (const jig of this._spends) {
      const before = this._before.get(jig)
      const location = before._props.location
      const { txid, vout } = _location(location)
      const satoshis = before._props.satoshis
      const owner = before._props.owner
      const lock = _owner(owner)
      const scriptBuffer = Buffer.from(lock.script())
      const script = Script.fromBuffer(scriptBuffer)
      const utxo = { txid, vout, script, satoshis }
      tx.from(utxo)
    }

    for (const jig of this._outputs) {
      const after = this._after.get(jig)
      const satoshis = Math.max(Transaction.DUST_AMOUNT, after._props.satoshis)
      const owner = after._props.owner
      const lock = _owner(owner)
      const scriptBuffer = Buffer.from(lock.script())
      const script = Script.fromBuffer(scriptBuffer)
      tx.addOutput(new Transaction.Output({ script, satoshis }))
    }

    this._tx = tx
  }

  async _payForTx () {
    const Buffer = bsv.deps.Buffer

    const locks = this._getLocks()
    const parents = this._getParents()

    // Add placeholder scripts for jig inputs
    const placeholders = locks.map(lock => Buffer.alloc(lock.domain()))
    const indices = [...Array(locks.length).keys()].filter(i => !this._tx.inputs[i].script.toBuffer().length)
    indices.forEach(i => this._tx.inputs[i].setScript(placeholders[i]))

    // Pay for the transaction
    const rawtx = this._tx.toString('hex')
    const paidhex = await this._kernel._purse.pay(rawtx, parents)
    const paidtx = new Transaction(paidhex)

    // Save the paid tx as our new tx
    this._tx = paidtx

    // Remove placeholder scripts
    indices.forEach(i => this._tx.inputs[i].setScript(''))
  }

  async _signTx () {
    const locks = this._getLocks()
    const parents = this._getParents()

    // Sign the transaction
    const rawtx = this._tx.toString('hex')
    const signedhex = await this._kernel._owner.sign(rawtx, parents, locks)
    const signedtx = new Transaction(signedhex)

    // Save the paid tx as our new tx
    this._tx = signedtx
  }

  _getLocks () {
    const locks = this._spends
      .map(jig => this._before.get(jig))
      .map(snapshot => snapshot._props.owner)
      .map(owner => _owner(owner))

    return locks
  }

  _getParents () {
    const Buffer = bsv.deps.Buffer

    const scripts = this._spends
      .map(jig => this._before.get(jig))
      .map(snapshot => snapshot._props.owner)
      .map(owner => _owner(owner))
      .map(lock => Buffer.from(lock.script()))
      .map(scriptBuffer => Script.fromBuffer(scriptBuffer))

    const satoshis = this._spends
      .map(jig => this._before.get(jig))
      .map(snapshot => Math.max(snapshot._props.satoshis, Transaction.DUST_AMOUNT))

    const parents = scripts.map((script, i) => { return { script, satoshis: satoshis[i] } })

    return parents
  }

  async _broadcastTx () {
    // Notify the purse of the broadcast
    if (typeof this._kernel._purse.broadcast === 'function') {
      try {
        await this._kernel._purse.broadcast(this._tx.toString('hex'))
      } catch (e) {
        Log._error(TAG, e.toString())
      }
    }

    // Broadcast to the blockchain
    try {
      await this._kernel._blockchain.broadcast(this._tx.toString('hex'))
    } catch (e) {
      throw await this._addDetailsToBroadcastError(e)
    }
  }

  _markPublished () {
    this._state = STATE_PUBLISHED
    this._txid = this._tx.hash
  }

  async _finalizeJigs () {
    // Apply bindings to output and deleted jigs and their after snapshots
    this._applyJigBindings()

    // Add to cache, both outputs and deleted
    await this._cacheJigState()

    // Emit events for each jig created, deleted or updated
    this._emitJigEvents()
  }

  async _addDetailsToBroadcastError (e) {
    const eString = e.toString()
    let message = `Broadcast failed: ${e.message}`

    // These errors are hints that the transaction is unpaid for
    if (eString.indexOf('tx has no inputs') !== -1 || eString.indexOf('insufficient priority') !== -1) {
      const suggestion = 'Hint: Is the purse funded to pay for this transaction?'
      message = `${message}\n\n${suggestion}`
    }

    // These errors are hints that an input was already spent
    if (eString.indexOf('Missing inputs') !== -1 || eString.indexOf('txn-mempool-conflict') !== -1) {
      // Figure out which input was spent
      for (const input of this._tx.inputs) {
        try {
          const prevtxid = input.prevTxId.toString('hex')
          const prevvout = input.outputIndex
          const prevlocation = `${prevtxid}_o${prevvout}`
          const prevspend = await this._kernel._blockchain.spends(prevtxid, prevvout)
          if (!prevspend) continue

          let typeString = 'Payment'
          try {
            const loader = new Loader(this._kernel, this._importLimit)
            const jig = await loader._load(prevlocation)
            const Code = require('./code')
            typeString = jig instanceof Code ? jig.name : jig.toString()
          } catch { }

          message = `${message}\n\n${typeString} was spent in another transaction\n`
          message = `${message}\nLocation: ${prevlocation}`
          message = `${message}\nSpending Tx: ${prevspend}`
        } catch (e) {
          // Ignore errors in this error handler
        }
      }
    }

    return new Error(message)
  }

  _printDebugInfo () {
    const info = {}
    info.id = this._id
    info.nspends = this._spends.length
    info.ncreates = this._creates.length
    info.nreads = this._reads.length
    info.ndeletes = this._deletes.length
    if (this._inputs) info.ninputs = this._inputs.length
    if (this._outputs) info.noutputs = this._outputs.length
    if (this._refs) info.nrefs = this._refs.length
    if (this._states) info.nstates = this._states.size
    if (this._payload) info.payload = this._payload
    if (this._tx) info.tx = this._tx

    Log._debug(TAG, 'Info', JSON.stringify(info, 0, 2))
  }

  _applyJigBindings () {
    this._outputs.forEach((jig, index) => {
      const vout = index + 1
      const after = this._after.get(jig)
      const location = `${this._txid}_o${vout}`

      if (after._props.origin.startsWith('commit://')) after._props.origin = location
      after._props.location = location

      Membrane._sudo(() => {
        if (jig.origin.startsWith('commit://')) jig.origin = location
        if (!this._spentDownstream(jig)) jig.location = location
      })
    })

    this._deletes.forEach((jig, index) => {
      const after = this._after.get(jig)
      const location = `${this._txid}_d${index}`

      if (after._props.origin.startsWith('commit://')) after._props.origin = location
      after._props.location = location

      Membrane._sudo(() => {
        if (jig.origin.startsWith('commit://')) jig.origin = location
        jig.location = location
      })
    })
  }

  async _cacheJigState () {
    for (let i = 0; i < this._outputs.length; i++) {
      const jig = this._outputs[i]
      const state = this._states.get(jig)
      const vout = i + 1
      const key = `jig://${this._txid}_o${vout}`
      await this._kernel._cache.set(key, state)
    }

    for (let i = 0; i < this._deletes.length; i++) {
      const jig = this._deletes[i]
      const state = this._states.get(jig)
      const vdel = i
      const key = `jig://${this._txid}_d${vdel}`
      await this._kernel._cache.set(key, state)
    }
  }

  _emitJigEvents () {
    this._outputs.forEach(jig => this._kernel._emit('jig', jig))
    this._deletes.forEach(jig => this._kernel._emit('jig', jig))
  }

  _upstreamPublished (commit) {
    this._upstream = this._upstream.filter(r => r !== commit)

    for (const [jig, prevss] of commit._after) {
      const ours = this._jigs.find(j => sameJig(j, jig))
      if (!ours) continue

      const before = this._before.get(ours)
      if (!before) continue

      _BINDINGS.forEach(binding => { before._props[binding] = prevss._props[binding] })

      const Unbound = require('../util/unbound')

      const after = this._after.get(ours)
      if (after) {
        const props = after._props
        after._props.origin = prevss._props.origin
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

  async _sync () {
    Log._debug(TAG, 'Sync', this._id)

    _assert(this._state !== STATE_EDITING)
    _assert(COMMITS.has(this._id))

    // If already published, nothing to sync
    if (this._state === STATE_PUBLISHED) return

    return new Promise((resolve, reject) => {
      this._syncListeners.push({ resolve, reject })
    })
  }

  _intercept (callback) {
    const oldPublishIntercept = PUBLISH_INTERCEPT
    try {
      PUBLISH_INTERCEPT = newCommit => this._combine(newCommit)
      callback()
    } finally {
      PUBLISH_INTERCEPT = oldPublishIntercept
    }
  }
}

// ------------------------------------------------------------------------------------------------
// _record
// ------------------------------------------------------------------------------------------------

Commit._record = callback => {
  _assert(!RECORDING)

  const record = new Commit()

  try {
    RECORDING = true

    const ret = callback(record)

    if (ret instanceof Promise) {
      throw new Error('Transactions must not include any asyncronous code')
    }

    record._commit()
    record._publish()

    return ret
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

Commit._recordMultiple = callback => {
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

    PUBLISH_INTERCEPT = oldPublishIntercept

    if (records.length) records[0]._publish()

    return ret
  } catch (e) {
    PUBLISH_INTERCEPT = oldPublishIntercept

    records.reverse().forEach(r => r._rollback(e))

    throw e
  }
}

// ------------------------------------------------------------------------------------------------
// _delete
// ------------------------------------------------------------------------------------------------

Commit._delete = record => {
  COMMITS.delete(record._id)
}

// ------------------------------------------------------------------------------------------------
// _get
// ------------------------------------------------------------------------------------------------

Commit._get = id => {
  return COMMITS.get(id)
}

// ------------------------------------------------------------------------------------------------
// _payload
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------

Commit._payload = tx => {
  const badPayloadStructure = 'Not a run transaction: Bad payload structure'
  const badPayloadJSON = 'Not a run transaction: Bad payload JSON'
  const unsupportedRunProtocol = 'Unsupported run protocol'

  _assert(tx.outputs.length, badPayloadStructure)

  const chunks = tx.outputs[0].script.chunks

  _assert(chunks.length >= 6, badPayloadStructure)
  _assert(chunks[0].opcodenum === 0, badPayloadStructure) // OP_FALSE
  _assert(chunks[1].opcodenum === 106, badPayloadStructure) // OP_RETURN
  _assert(chunks[2].buf.toString() === 'run', badPayloadStructure)

  const protocolHex = Buffer.from(PROTOCOL_VERSION).toString('hex')
  _assert(chunks[3].buf.toString('hex') === protocolHex, unsupportedRunProtocol)

  try {
    const json = chunks[5].buf.toString('utf8')
    const payload = JSON.parse(json)

    _assert(typeof payload.in === 'number', badPayloadJSON)
    _assert(Array.isArray(payload.ref), badPayloadJSON)
    _assert(Array.isArray(payload.out), badPayloadJSON)
    _assert(Array.isArray(payload.del), badPayloadJSON)
    _assert(Array.isArray(payload.lock), badPayloadJSON)
    _assert(Array.isArray(payload.exec), badPayloadJSON)

    _assert(!payload.ref.some(ref => typeof ref !== 'string'), badPayloadJSON)
    _assert(!payload.out.some(hash => typeof hash !== 'string'), badPayloadJSON)
    _assert(!payload.del.some(hash => typeof hash !== 'string'), badPayloadJSON)
    _assert(!payload.exec.some(hash => typeof hash !== 'object'), badPayloadJSON)

    return payload
  } catch (e) { _assert(false, badPayloadJSON) }
}

// ------------------------------------------------------------------------------------------------
// _sync
// ------------------------------------------------------------------------------------------------

Commit._syncAll = async () => {
  const promises = []
  for (const record of COMMITS.values()) {
    promises.push(record._sync())
  }
  return Promise.all(promises)
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

const spendableBinding = binding => !(binding instanceof require('../util/unbound')) || !binding._value

// ------------------------------------------------------------------------------------------------

Commit._PROTOCOL_VERSION = PROTOCOL_VERSION

module.exports = Commit
