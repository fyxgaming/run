/**
 * publish.js
 *
 * Creates and broadcasts a transaction for a commit
 */

const bsv = require('bsv')
const Membrane = require('./membrane')
const Loader = require('./loader')
const { _kernel, _assert, _sameJig, _hasJig, _addJigs, _checkState } = require('../util/misc')
const { _deepVisit } = require('../util/deep')
const Log = require('../util/log')
const Codec = require('../util/codec')
const { _location, _owner } = require('../util/bindings')
const { Transaction, Script } = bsv

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Publisher'

const PROTOCOL_VERSION = [0x03]

// ------------------------------------------------------------------------------------------------
// Publisher
// ------------------------------------------------------------------------------------------------

class Publisher {
  constructor (commit) {
    this._commit = commit
    this._publishing = false
    this._kernel = _kernel()
  }

  // ------------------------------------------------------------------------------------------------
  // _publish
  // ------------------------------------------------------------------------------------------------

  async _publish () {
    try {
      Log._debug(TAG, 'Publish', this._commit._id)

      _assert(!this._commit._upstream.length)
      _assert(!this._publishing)
      this._publishing = true

      // Assigns initial unbound owners in the jigs after snapshots
      await assignInitialOwners(this._commit, this._kernel)

      // Create the sorted master list used to serialize actions
      const masterList = createMasterList(this._commit)
      console.log(masterList)

      // Calculate the serialized states of output and deleted jigs
      // await this._calculateStates()

      // Calculate state hashes
      // this._calculateStateHashes()

      // Create the OP_RETURN json
      // this._createPayload()

      // Create the unpaid and unsigned tx
      // this._createPartialTx()

      /*
      // Pays and signs the transaction
      await this._completeTx()

      // Print information for debugging
      this._printDebugInfo()

      // Broadcast
      await this._broadcastTx()

      // Mark as published
      this._txid = this._tx.hash
      */

      // TODO: Remove
      this._tx = new Transaction()
      this._txid = this._tx.hash

      // Apply bindings to output and deleted jigs and their after snapshots
      this._applyJigBindings()

      /*
      // Add to cache, both outputs and deleted
      await this._cacheJigState()

      // Emit events for each jig created, deleted or updated
      this._emitJigEvents()
      */

      this._commit._onPublishSucceed()
    } catch (e) {
      this._commit._onPublishFail(e)

      // Swallow error because the commit will handle
    }
  }

  // ------------------------------------------------------------------------------------------------

  // ------------------------------------------------------------------------------------------------

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
  // ------------------------------------------------------------------------------------------------

  async _calculateStates () {
    const jigs = this._commit._outputs.concat(this._commit._deletes)

    for (const jig of jigs) {
      const state = await this._calculateState(jig)

      this._states.set(jig, state)
    }
  }

  // ------------------------------------------------------------------------------------------------

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
    const vout = this._outputs.findIndex(x => _sameJig(x, jig))
    const vdel = this._deletes.findIndex(x => _sameJig(x, jig))
    const localLocation = vout === -1 ? `_d${vdel}` : `_o${vout + 1}`

    if (state.props.origin.startsWith(this._id)) state.props.origin = localLocation
    state.props.location = localLocation

    // Load the previous state's references to use when we don't spend
    const referenceMap = await this._createReferenceMap(jig)

    // Create the codec used to encode the state
    const codec = new Codec()._saveJigs(x => {
      const vout = this._outputs.findIndex(y => _sameJig(x, y))
      if (vout >= 0) return `_o${vout + 1}`

      const vdel = this._deletes.findIndex(y => _sameJig(x, y))
      if (vdel >= 0) return `_d${vdel}`

      const vref = this._reads.findIndex(y => _sameJig(x, y))
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

  // ------------------------------------------------------------------------------------------------

  async _createReferenceMap (jig) {
    if (_hasJig(this._creates, jig)) return new Map()

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

  // ------------------------------------------------------------------------------------------------

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

  // ------------------------------------------------------------------------------------------------

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

  // ------------------------------------------------------------------------------------------------

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

  // ------------------------------------------------------------------------------------------------

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

  // ------------------------------------------------------------------------------------------------

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

  // ------------------------------------------------------------------------------------------------

  _getLocks () {
    const locks = this._spends
      .map(jig => this._before.get(jig))
      .map(snapshot => snapshot._props.owner)
      .map(owner => _owner(owner))

    return locks
  }

  // ------------------------------------------------------------------------------------------------

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

  // ------------------------------------------------------------------------------------------------

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

  // ------------------------------------------------------------------------------------------------

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

  // ------------------------------------------------------------------------------------------------

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

  // ------------------------------------------------------------------------------------------------

  _applyJigBindings () {
    this._commit._outputs.forEach((jig, index) => {
      const vout = index + 1
      const after = this._commit._after.get(jig)
      const location = `${this._txid}_o${vout}`

      if (after._props.origin.startsWith('commit://')) after._props.origin = location
      after._props.location = location

      Membrane._sudo(() => {
        if (jig.origin.startsWith('commit://')) jig.origin = location
        if (!this._commit._spentDownstream(jig)) jig.location = location
      })
    })

    this._commit._deletes.forEach((jig, index) => {
      const after = this._commit._after.get(jig)
      const location = `${this._txid}_d${index}`

      if (after._props.origin.startsWith('commit://')) after._props.origin = location
      after._props.location = location

      Membrane._sudo(() => {
        if (jig.origin.startsWith('commit://')) jig.origin = location
        jig.location = location
      })
    })
  }

  // ------------------------------------------------------------------------------------------------

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

  // ------------------------------------------------------------------------------------------------

  _emitJigEvents () {
    this._outputs.forEach(jig => this._kernel._emit('jig', jig))
    this._deletes.forEach(jig => this._kernel._emit('jig', jig))
  }

  // ------------------------------------------------------------------------------------------------

  static _payload (tx) {
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
}

// ------------------------------------------------------------------------------------------------

async function assignInitialOwners (commit, kernel) {
  Log._debug(TAG, 'Assigning initial owners to', commit._id)

  const Unbound = require('../util/unbound')
  const Code = require('./code')
  const Jig = require('./jig')
  const Berry = require('./berry')

  function hasUndeterminedOwner () {
    return commit._creates
      .map(jig => commit._after.get(jig)._props.owner)
      .some(owner => owner instanceof Unbound && !owner._value)
  }

  let numLoops = 0
  while (hasUndeterminedOwner()) {
    if (++numLoops === 10) {
      const hint = 'Hint: Deploying your owner locks separately'
      throw new Error(`Stack overflow while deploying owners\n\n${hint}`)
    }

    // Get owners for new creates
    for (let i = 0; i < commit._creates.length; i++) {
      const jig = commit._creates[i]
      const state = commit._after.get(jig)
      const prevowner = state._props.owner

      if (!(prevowner instanceof Unbound && !prevowner._value)) continue

      const owners = await kernel._owner.owner()
      const owner = Array.isArray(owners) ? owners[0] : owners

      state._props.owner = new Unbound(owner)
    }

    const owners = commit._creates.map(jig => commit._after.get(jig)._props.owner)

    // Make sure all owners are already deployed
    _deepVisit(owners, x => {
      if (x instanceof Code || x instanceof Jig || x instanceof Berry) {
        const location = Membrane._sudo(() => x.location)
        const { txid, native } = _location(location)
        _checkState(txid || native, 'Lock must be deployed')
      }
    })
  }

  // For outputs, bind owners and satoshis
  commit._outputs.forEach(jig => {
    const ssprops = commit._after.get(jig)._props
    if (ssprops.owner instanceof Unbound) ssprops.owner = ssprops.owner._value
    if (ssprops.satoshis instanceof Unbound) ssprops.satoshis = ssprops.satoshis._value || 0

    if (commit._spentDownstream(jig)) return

    Membrane._sudo(() => {
      if (jig.owner instanceof Unbound) jig.owner = ssprops.owner
      if (jig.satoshis instanceof Unbound) jig.satoshis = ssprops.value || 0
    })
  })

  // For deleted, unbind owners and satoshis
  commit._deletes.forEach(jig => {
    Membrane._sudo(() => {
      jig.owner = undefined
      jig.satoshis = 0
    })

    Membrane._sudo(() => {
      const ssprops = commit._after.get(jig)._props
      ssprops.owner = undefined
      ssprops.satoshis = 0
    })
  })
}

// ------------------------------------------------------------------------------------------------

function createMasterList (commit) {
  let masterList = _addJigs(commit._inputs, commit._refs)
  masterList = _addJigs(masterList, commit._creates)
  masterList = _addJigs(masterList, commit._deletes)
  return masterList
}

// ------------------------------------------------------------------------------------------------

Publisher._PROTOCOL_VERSION = PROTOCOL_VERSION

module.exports = Publisher
