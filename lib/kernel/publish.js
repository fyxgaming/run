/**
 * publish.js
 *
 * Creates and broadcasts a transaction for a commit
 */

const bsv = require('bsv')
const Membrane = require('./membrane')
const Loader = require('./loader')
const { _assert, _sameJig, _hasJig, _addJigs, _checkState } = require('../util/misc')
const { _deepVisit } = require('../util/deep')
const Log = require('../util/log')
const Codec = require('../util/codec')
const { _location, _owner } = require('../util/bindings')
const command = require('./command')
const { Transaction, Script } = bsv

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Publish'

const PROTOCOL_VERSION = [0x03]

// ------------------------------------------------------------------------------------------------
// _publish
// ------------------------------------------------------------------------------------------------

async function _publish (commit) {
  try {
    Log._debug(TAG, 'Publish', commit._id)

    _assert(!commit._upstream.length)

    // Assigns initial unbound owners in the jigs after snapshots
    await assignInitialOwners(commit)

    // Create the sorted master list used to serialize actions
    const masterList = createMasterList(commit)

    // Calculate the serialized states of output and deleted jigs
    const states = await calculateStates(commit)

    // Calculate state hashes
    const hashes = calculateHashes(states)

    // Convert the actions to commands
    const cmds = createCommands(commit, masterList)

    // Create the OP_RETURN json
    const json = createJson(commit, hashes, cmds, masterList)

    // Create the unpaid and unsigned tx
    const partialtx = createPartialTx(commit, json)

    // Add inputs and outputs to pay for the transaction
    const paidtx = await payForTx(partialtx, commit)

    // Sign the jig owners
    const signedtx = await signTx(paidtx, commit)

    // Check that we have all signatures. Friendlier error.
    checkTx(signedtx, commit)

    // Print information for debugging
    printDebugInfo(commit, json, signedtx)

    // Broadcast
    await broadcastTx(commit, signedtx)

    // Calculate tx hash
    const txid = signedtx.hash

    // Apply bindings to output and deleted jigs and their after snapshots
    applyJigBindings(commit, txid)

    // Add to cache, both outputs and deleted states
    await cacheJigState(commit, states, txid)

    // Emit events for each jig created, deleted or updated
    emitJigEvents(commit)

    commit._onPublishSucceed()
  } catch (e) {
    commit._onPublishFail(e)
  }
}

// ------------------------------------------------------------------------------------------------

async function assignInitialOwners (commit) {
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

      const owners = await commit._kernel._owner.owner()
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

async function calculateStates (commit) {
  const states = new Map()
  const jigs = commit._outputs.concat(commit._deletes)

  for (const jig of jigs) {
    const state = await calculateState(commit, jig, commit._importLimit)
    states.set(jig, state)
  }

  return states
}

// ------------------------------------------------------------------------------------------------

async function calculateState (commit, jig, importLimit) {
  const after = commit._after.get(jig)
  _assert(after)

  // Create the state to encode
  const state = { }
  state.version = Buffer.from(PROTOCOL_VERSION).toString('hex')
  state.kind = after._kind
  state.props = Object.assign({}, after._props)
  if (after._cls) state.cls = after._cls
  if (after._innerType) state.src = after._innerType.toString()

  // Localize origin and location
  const vout = commit._outputs.findIndex(x => _sameJig(x, jig))
  const vdel = commit._deletes.findIndex(x => _sameJig(x, jig))
  const localLocation = vout === -1 ? `_d${vdel}` : `_o${vout + 1}`

  if (state.props.origin.startsWith(commit._id)) state.props.origin = localLocation
  state.props.location = localLocation

  // Load the previous state's references to use when we don't spend
  const referenceMap = await createReferenceMap(commit, jig, importLimit)

  // Create the codec used to encode the state
  const codec = new Codec()._saveJigs(x => {
    const vout = commit._outputs.findIndex(y => _sameJig(x, y))
    if (vout >= 0) return `_o${vout + 1}`

    const vdel = commit._deletes.findIndex(y => _sameJig(x, y))
    if (vdel >= 0) return `_d${vdel}`

    const vref = commit._reads.findIndex(y => _sameJig(x, y))
    if (vref >= 0) return commit._refs[vref]

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

async function createReferenceMap (commit, jig, importLimit) {
  if (_hasJig(commit._creates, jig)) return new Map()

  const location = commit._before.get(jig)._props.location

  // Load the jig before. Ideally, with no inners.
  const loader = new Loader(commit._kernel, importLimit)
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

function calculateHashes (states) {
  const hashes = new Map()

  for (const [jig, state] of states) {
    if (hashes.has(jig)) continue

    const stateString = JSON.stringify(state)
    const stateBuffer = bsv.deps.Buffer.from(stateString, 'utf8')

    const stateHashBuffer = bsv.crypto.Hash.sha256(stateBuffer)
    const stateHashString = stateHashBuffer.toString('hex')

    hashes.set(jig, stateHashString)
  }

  return hashes
}

// ------------------------------------------------------------------------------------------------

function createCommands (commit, masterList) {
  const codec = new Codec()._saveJigs(x => {
    const index = masterList.indexOf(x)
    _assert(index >= 0)
    return index
  })

  return commit._actions.map(action => command(action, codec))
}

// ------------------------------------------------------------------------------------------------

function createJson (commit, hashes, cmds, masterList) {
  const out = commit._outputs.map(jig => hashes.get(jig))
  const del = commit._deletes.map(jig => hashes.get(jig))

  const ownersCodec = new Codec()._saveJigs(x => {
    const index = masterList.indexOf(x)
    _assert(index >= 0)
    return index
  })

  const owners = commit._creates.map(jig => commit._after.get(jig)._props.owner)
  const lock = ownersCodec._encode(owners)

  return {
    in: commit._inputs.length,
    ref: commit._refs,
    out,
    del,
    lock,
    cmds
  }
}

// ------------------------------------------------------------------------------------------------

function createPartialTx (commit, json) {
  const tx = new Transaction()

  const Buffer = bsv.deps.Buffer
  const prefix = Buffer.from('run', 'utf8')
  const protocol = Buffer.from(PROTOCOL_VERSION, 'hex')
  const app = Buffer.from(commit._kernel._app, 'utf8')
  const payload = Buffer.from(JSON.stringify(json), 'utf8')
  const script = Script.buildSafeDataOut([prefix, protocol, app, payload])
  const payloadOutput = new Transaction.Output({ script, satoshis: 0 })

  tx.addOutput(payloadOutput)

  for (const jig of commit._inputs) {
    const before = commit._before.get(jig)
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

  for (const jig of commit._outputs) {
    const after = commit._after.get(jig)
    const satoshis = Math.max(Transaction.DUST_AMOUNT, after._props.satoshis)
    const owner = after._props.owner
    const lock = _owner(owner)
    const scriptBuffer = Buffer.from(lock.script())
    const script = Script.fromBuffer(scriptBuffer)
    tx.addOutput(new Transaction.Output({ script, satoshis }))
  }

  return tx
}

// ------------------------------------------------------------------------------------------------

function applyJigBindings (commit, txid) {
  commit._outputs.forEach((jig, index) => {
    const vout = index + 1
    const after = commit._after.get(jig)
    const location = `${txid}_o${vout}`

    if (after._props.origin.startsWith('commit://')) after._props.origin = location
    after._props.location = location

    Membrane._sudo(() => {
      if (jig.origin.startsWith('commit://')) jig.origin = location
      if (!commit._spentDownstream(jig)) jig.location = location
    })
  })

  commit._deletes.forEach((jig, index) => {
    const after = commit._after.get(jig)
    const location = `${txid}_d${index}`

    if (after._props.origin.startsWith('commit://')) after._props.origin = location
    after._props.location = location

    Membrane._sudo(() => {
      if (jig.origin.startsWith('commit://')) jig.origin = location
      jig.location = location
    })
  })
}

// ------------------------------------------------------------------------------------------------

async function payForTx (tx, commit) {
  const Buffer = bsv.deps.Buffer

  const locks = getLocks(commit)
  const parents = getParents(commit)

  // Add placeholder scripts for jig inputs
  const placeholders = locks.map(lock => Buffer.alloc(lock.domain()))
  const indices = [...Array(locks.length).keys()].filter(i => !tx.inputs[i].script.toBuffer().length)
  indices.forEach(i => tx.inputs[i].setScript(placeholders[i]))

  // Pay for the transaction
  const rawtx = tx.toString('hex')
  const paidhex = await commit._kernel._purse.pay(rawtx, parents)
  const paidtx = new Transaction(paidhex)

  // Remove placeholder scripts
  indices.forEach(i => tx.inputs[i].setScript(''))

  return paidtx
}

// ------------------------------------------------------------------------------------------------

function getLocks (commit) {
  const locks = commit._inputs
    .map(jig => commit._before.get(jig))
    .map(snapshot => snapshot._props.owner)
    .map(owner => _owner(owner))

  return locks
}

// ------------------------------------------------------------------------------------------------

function getParents (commit) {
  const Buffer = bsv.deps.Buffer

  const scripts = commit._inputs
    .map(jig => commit._before.get(jig))
    .map(snapshot => snapshot._props.owner)
    .map(owner => _owner(owner))
    .map(lock => Buffer.from(lock.script()))
    .map(scriptBuffer => Script.fromBuffer(scriptBuffer))

  const satoshis = commit._inputs
    .map(jig => commit._before.get(jig))
    .map(snapshot => Math.max(snapshot._props.satoshis, Transaction.DUST_AMOUNT))

  const parents = scripts.map((script, i) => { return { script, satoshis: satoshis[i] } })

  return parents
}

// ------------------------------------------------------------------------------------------------

async function signTx (tx, commit) {
  const locks = getLocks(commit)
  const parents = getParents(commit)

  // Sign the transaction
  const rawtx = tx.toString('hex')
  const signedhex = await commit._kernel._owner.sign(rawtx, parents, locks)
  const signedtx = new Transaction(signedhex)

  return signedtx
}

// ------------------------------------------------------------------------------------------------

function checkTx (tx, commit) {
  commit._inputs.forEach((jig, i) => {
    if (tx.inputs[i].isFullySigned()) return
    const before = commit._before.get(jig)
    const line1 = `origin: ${before._props.origin}`
    const line2 = `location: ${before._props.location}`
    const line3 = `owner: ${before._props.owner}`
    const details = `${line1}\n${line2}\n${line3}`
    const reason = tx.inputs[i].script.toBuffer().length ? 'Bad signature' : 'Missing signature'
    throw new Error(`${reason} for ${jig.constructor.name}\n\n${details}`)
  })
}

// ------------------------------------------------------------------------------------------------

function printDebugInfo (commit, json, tx) {
  const info = {}
  info.id = commit._id
  info.nin = commit._inputs.length
  info.nout = commit._outputs.length
  info.nref = commit._refs.length
  info.ndel = commit._deletes.length
  info.ncre = commit._creates.length
  info.json = json
  info.tx = tx
  Log._debug(TAG, 'Info', JSON.stringify(info, 0, 2))
}

// ------------------------------------------------------------------------------------------------

async function broadcastTx (commit, tx) {
  // Notify the purse of the broadcast
  if (typeof commit._kernel._purse.broadcast === 'function') {
    try {
      await commit._kernel._purse.broadcast(tx.toString('hex'))
    } catch (e) {
      Log._error(TAG, e.toString())
    }
  }

  // Broadcast to the blockchain
  try {
    await commit._kernel._blockchain.broadcast(tx.toString('hex'))
  } catch (e) {
    throw await addDetailsToBroadcastError(e, commit, tx)
  }
}

// ------------------------------------------------------------------------------------------------

async function addDetailsToBroadcastError (e, commit, tx) {
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
    for (const input of tx.inputs) {
      try {
        const prevtxid = input.prevTxId.toString('hex')
        const prevvout = input.outputIndex
        const prevlocation = `${prevtxid}_o${prevvout}`
        const prevspend = await commit._kernel._blockchain.spends(prevtxid, prevvout)
        if (!prevspend) continue

        let typeString = 'Payment'
        try {
          const loader = new Loader(commit._kernel, commit._importLimit)
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

async function cacheJigState (commit, states, txid) {
  for (let i = 0; i < commit._outputs.length; i++) {
    const jig = commit._outputs[i]
    const state = states.get(jig)
    const vout = i + 1
    const key = `jig://${txid}_o${vout}`
    await commit._kernel._cache.set(key, state)
  }

  for (let i = 0; i < commit._deletes.length; i++) {
    const jig = commit._deletes[i]
    const state = states.get(jig)
    const vdel = i
    const key = `jig://${txid}_d${vdel}`
    await commit._kernel._cache.set(key, state)
  }
}

// ------------------------------------------------------------------------------------------------

function emitJigEvents (commit) {
  commit._outputs.forEach(jig => commit._kernel._emit('jig', jig))
  commit._deletes.forEach(jig => commit._kernel._emit('jig', jig))
}

// ------------------------------------------------------------------------------------------------

_publish._PROTOCOL_VERSION = PROTOCOL_VERSION

module.exports = _publish
