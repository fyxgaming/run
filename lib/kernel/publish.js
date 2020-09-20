/**
 * publish.js
 *
 * Creates and broadcasts a transaction for a commit
 */

const bsv = require('bsv')
const Loader = require('./loader')
const { _assert, _text, _bsvNetwork, _addJigs, _checkState, _Timeout, _kernel } = require('../util/misc')
const { _deepVisit } = require('../util/deep')
const { StateError } = require('../util/errors')
const Log = require('../util/log')
const Codec = require('../util/codec')
const { _location, _owner } = require('../util/bindings')
const { _sudo } = require('../util/admin')
const SerialTaskQueue = require('../util/queue')
const { Transaction, Script } = bsv

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Publish'

const PROTOCOL_VERSION = [0x04]

// Serializes a portion of the publish function for purses to work more reliably
const PURSE_SAFETY_QUEUE = new SerialTaskQueue()

// ------------------------------------------------------------------------------------------------
// _publish
// ------------------------------------------------------------------------------------------------

async function _publish (commit) {
  try {
    if (Log._debugOn) Log._debug(TAG, 'Publish', commit._id)

    _assert(!commit._upstream.length)
    _assert(!commit._done)
    _assert(!commit._publishing)
    commit._publishing = true

    // Create a timeout
    const timeout = new _Timeout('publish', commit._kernel._timeout)

    // Verify no referenced jigs are older than prior references
    await checkNoTimeTravel(commit, timeout)
    timeout._check()

    // Assigns initial unbound owners in the jigs after snapshots
    await assignInitialOwners(commit)
    timeout._check()

    // Make owners and satoshis bound properties
    finalizeOwnersAndSatoshis(commit)

    // Create the sorted master list used to serialize actions
    const masterList = createMasterList(commit)

    // Calculate the serialized states of output and deleted jigs
    const states = await captureStates(commit, timeout)
    timeout._check()

    // Calculate state hashes
    const hashes = hashStates(states)

    // Convert the actions to executable statements
    const exec = createExec(commit, masterList)

    // Create the OP_RETURN payload json
    const payload = createPayload(commit, hashes, exec, masterList)

    // Create the unpaid and unsigned tx
    const partialtx = createPartialTx(commit, payload)

    // Serialize from pay to broadcast because the purse may consume outputs that should not be
    // consumed again in another parallel publish, but the purse may not mark them as spent right
    // away. In the future we might consider making this serialization optional for smarter purses.
    const tx = await PURSE_SAFETY_QUEUE._enqueue(async () => {
      // Add inputs and outputs to pay for the transaction
      const paidtx = commit._pay ? await payForTx(partialtx, commit) : partialtx
      timeout._check()

      // Sign the jig owners
      const signedtx = commit._sign ? await signTx(paidtx, commit) : paidtx
      timeout._check()

      // Check that we have all signatures. Friendlier error.
      checkTx(signedtx, commit)

      // Broadcast
      await broadcastTx(commit, signedtx, timeout)
      timeout._check()

      return signedtx
    })
    timeout._check()

    // Calculate tx hash
    const txid = tx.hash

    // Apply bindings to output and deleted jigs and their after snapshots
    finalizeLocationsAndOrigins(commit, txid)

    // Add to cache, both outputs and deleted states
    await cacheStates(commit, states, txid)
    timeout._check()

    // Add this txid to the trusted set
    commit._kernel._trusts.add(txid)

    // Emit events for each jig created, deleted or updated
    emitJigEvents(commit)

    commit._onPublishSucceed()
  } catch (e) {
    commit._onPublishFail(e)

    // Emit events for each jig rolled back
    emitJigEvents(commit)
  }
}

// ------------------------------------------------------------------------------------------------

async function checkNoTimeTravel (commit, timeout) {
  const refmap = await commit._buildRefmap()

  for (const jig of commit._refs) {
    const before = commit._before.get(jig)
    const props = before._props

    if (!(props.origin in refmap)) continue

    const refmapNonce = refmap[props.origin][1]
    _checkState(props.nonce >= refmapNonce, `Time travel for ${_text(jig)}`)
  }
}

// ------------------------------------------------------------------------------------------------

async function assignInitialOwners (commit) {
  if (Log._debugOn) Log._debug(TAG, 'Assign owners')

  const Unbound = require('../util/unbound')
  const Universal = require('./universal')

  const needsOwners = commit._creates
    .map(jig => commit._after.get(jig)._props.owner)
    .some(owner => owner instanceof Unbound && !owner._value)

  if (needsOwners) {
    // Get owners for new creates
    for (let i = 0; i < commit._creates.length; i++) {
      const jig = commit._creates[i]
      const state = commit._after.get(jig)
      const prevowner = state._props.owner

      if (!(prevowner instanceof Unbound) || prevowner._value) continue

      let owner = null
      if (commit._kernel._owner.owner) {
        Log._warn(TAG, 'Owner.prototype.owner() is deprecated. Please rename owner() to nextOwner().')
        owner = await commit._kernel._owner.owner()
      } else {
        owner = await commit._kernel._owner.nextOwner()
      }

      state._props.owner = new Unbound(owner)
    }

    const owners = commit._creates.map(jig => commit._after.get(jig)._props.owner)

    // Make sure all owners are already deployed
    _deepVisit(owners, x => {
      if (x instanceof Universal) {
        const location = _sudo(() => x.location)
        const { txid, nativeid } = _location(location)
        _checkState(txid || nativeid, `${x.name} must first be deployed`)
      }
    })
  }
}

// ------------------------------------------------------------------------------------------------

function finalizeOwnersAndSatoshis (commit) {
  const Unbound = require('../util/unbound')

  // For outputs, bind owners and satoshis
  commit._outputs.forEach(jig => {
    const ssprops = commit._after.get(jig)._props
    if (ssprops.owner instanceof Unbound) ssprops.owner = ssprops.owner._value
    if (ssprops.satoshis instanceof Unbound) ssprops.satoshis = ssprops.satoshis._value || 0

    if (commit._spentDownstream(jig)) return

    _sudo(() => {
      if (jig.owner instanceof Unbound) jig.owner = ssprops.owner
      if (jig.satoshis instanceof Unbound) jig.satoshis = ssprops.satoshis || 0
    })
  })

  // For deleted, check that the owners and satoshis are correct
  commit._deletes.forEach(jig => {
    _sudo(() => {
      const ssprops = commit._after.get(jig)._props
      if (ssprops.owner instanceof Unbound) ssprops.owner = ssprops.owner._value
      if (ssprops.satoshis instanceof Unbound) ssprops.satoshis = ssprops.satoshis._value || 0

      if (jig.owner instanceof Unbound) jig.owner = jig.owner._value
      if (jig.satoshis instanceof Unbound) jig.satoshis = jig.satoshis._value || 0

      _assert(jig.owner === null)
      _assert(jig.satoshis === 0)
    })
  })
}

// ------------------------------------------------------------------------------------------------

function createMasterList (commit) {
  let masterList = _addJigs(commit._inputs, commit._refs)
  masterList = _addJigs(masterList, commit._creates)
  // Deletes don't need to be added, because anything deleted must be an input or create
  return masterList
}

// ------------------------------------------------------------------------------------------------

async function captureStates (commit, timeout) {
  const { _capture } = require('./state')

  const states = new Map()
  const jigs = commit._outputs.concat(commit._deletes)

  for (const jig of jigs) {
    const state = await _capture(jig, commit, timeout)
    states.set(jig, state)
  }

  return states
}

// ------------------------------------------------------------------------------------------------

function hashStates (states) {
  const { _hash } = require('./state')

  const hashes = new Map()
  for (const [jig, state] of states) {
    if (hashes.has(jig)) continue

    const hash = _hash(state)
    hashes.set(jig, hash)
  }

  return hashes
}

// ------------------------------------------------------------------------------------------------

function createExec (commit, masterList) {
  const codec = new Codec()._saveJigs(x => {
    const index = masterList.indexOf(x)
    _assert(index >= 0)
    return index
  })

  return commit._actions.map(action => {
    const op = action.op()
    const data = codec._encode(action.data())
    return { op, data }
  })
}

// ------------------------------------------------------------------------------------------------

function createPayload (commit, hashes, exec, masterList) {
  const out = commit._outputs.map(jig => hashes.get(jig))
  const del = commit._deletes.map(jig => hashes.get(jig))

  const ownersCodec = new Codec()._saveJigs(x => {
    const index = masterList.indexOf(x)
    _assert(index >= 0)
    return index
  })

  const owners = commit._creates.map(jig => commit._after.get(jig)._props.owner)
  const cre = ownersCodec._encode(owners)

  const ref = commit._refs.map(jig => commit._before.get(jig)._props.location)

  const payload = {
    in: commit._inputs.length,
    ref,
    out,
    del,
    cre,
    exec
  }

  if (Log._debugOn) Log._debug(TAG, 'Payload', JSON.stringify(payload, 0, 2))

  return payload
}

// ------------------------------------------------------------------------------------------------

function createPartialTx (commit, payloadJson) {
  if (Log._debugOn) Log._debug(TAG, 'Create partial tx')

  const tx = new Transaction()

  const Buffer = bsv.deps.Buffer
  const prefix = Buffer.from('run', 'utf8')
  const protocol = Buffer.from(PROTOCOL_VERSION, 'hex')
  const app = Buffer.from(commit._kernel._app, 'utf8')
  const payload = Buffer.from(JSON.stringify(payloadJson), 'utf8')
  const script = Script.buildSafeDataOut([prefix, protocol, app, payload])
  const payloadOutput = new Transaction.Output({ script, satoshis: 0 })

  tx.addOutput(payloadOutput)

  const bsvNetwork = _bsvNetwork(commit._kernel._blockchain.network)
  const allowNullOwner = false

  for (const jig of commit._inputs) {
    const before = commit._before.get(jig)
    const location = before._props.location
    const { txid, vout } = _location(location)
    const satoshis = before._props.satoshis
    const owner = before._props.owner
    const lock = _owner(owner, allowNullOwner, bsvNetwork)
    const scriptBuffer = Buffer.from(lock.script())
    const script = Script.fromBuffer(scriptBuffer)
    const utxo = { txid, vout, script, satoshis }
    tx.from(utxo)
  }

  for (const jig of commit._outputs) {
    const after = commit._after.get(jig)
    const satoshis = Math.max(Transaction.DUST_AMOUNT, after._props.satoshis)
    const owner = after._props.owner
    const lock = _owner(owner, allowNullOwner, bsvNetwork)
    const scriptBuffer = Buffer.from(lock.script())
    const script = Script.fromBuffer(scriptBuffer)
    tx.addOutput(new Transaction.Output({ script, satoshis }))
  }

  return tx
}

// ------------------------------------------------------------------------------------------------

function finalizeLocationsAndOrigins (commit, txid) {
  commit._outputs.forEach((jig, index) => {
    const vout = index + 1
    const after = commit._after.get(jig)
    const location = `${txid}_o${vout}`

    if (after._props.origin.startsWith('commit://')) after._props.origin = location
    after._props.location = location

    _sudo(() => {
      if (jig.origin.startsWith('commit://')) jig.origin = location
      if (!commit._spentDownstream(jig)) jig.location = location
    })
  })

  commit._deletes.forEach((jig, index) => {
    const after = commit._after.get(jig)
    const location = `${txid}_d${index}`

    if (after._props.origin.startsWith('commit://')) after._props.origin = location
    after._props.location = location

    _sudo(() => {
      if (jig.origin.startsWith('commit://')) jig.origin = location
      jig.location = location
    })
  })
}

// ------------------------------------------------------------------------------------------------

async function payForTx (tx, commit) {
  const Buffer = bsv.deps.Buffer

  const locks = getLocks(commit)
  const parents = await getParents(tx, commit)

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

async function getParents (tx, commit) {
  const Buffer = bsv.deps.Buffer

  const jigScripts = commit._inputs
    .map(jig => commit._before.get(jig))
    .map(snapshot => snapshot._props.owner)
    .map(owner => _owner(owner))
    .map(lock => Buffer.from(lock.script()))
    .map(scriptBuffer => scriptBuffer.toString('hex'))

  const jigSatoshis = commit._inputs
    .map(jig => commit._before.get(jig))
    .map(snapshot => Math.max(snapshot._props.satoshis, Transaction.DUST_AMOUNT))

  const jigParents = jigScripts.map((script, i) => { return { script, satoshis: jigSatoshis[i] } })

  const payInputs = tx.inputs.slice(commit._inputs.length)
  const payRawTransactions = await Promise.all(
    payInputs.map(input => _kernel()._blockchain.fetch(input.prevTxId.toString('hex'))))
  const payTransactions = payRawTransactions.map(rawtx => new bsv.Transaction(rawtx))

  const payOutputs = payInputs.map((input, n) => payTransactions[n].outputs[input.outputIndex])
  const payScripts = payOutputs.map(output => output.script.toHex())
  const paySatoshis = payOutputs.map(output => output.satoshis)

  const payParents = payScripts.map((script, i) => { return { script, satoshis: paySatoshis[i] } })

  const parents = jigParents.concat(payParents)
  return parents
}

// ------------------------------------------------------------------------------------------------

async function signTx (tx, commit) {
  const locks = getLocks(commit)
  const parents = await getParents(tx, commit)

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
    throw new StateError(`${reason} for ${jig.constructor.name}\n\n${details}`)
  })
}

// ------------------------------------------------------------------------------------------------

async function broadcastTx (commit, tx, timeout) {
  // Notify the purse of the broadcast
  if (typeof commit._kernel._purse.broadcast === 'function') {
    try {
      await commit._kernel._purse.broadcast(tx.toString('hex'))
    } catch (e) {
      if (Log._errorOn) Log._error(TAG, e.toString())
    }
  }

  // Broadcast to the blockchain
  try {
    await commit._kernel._blockchain.broadcast(tx.toString('hex'))
  } catch (e) {
    throw await addDetailsToBroadcastError(e, commit, tx, timeout)
  }
}

// ------------------------------------------------------------------------------------------------

async function addDetailsToBroadcastError (e, commit, tx, timeout) {
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
          const loader = new Loader(commit._kernel, timeout)
          const jig = await loader._load(prevlocation)
          const Code = require('./code')
          typeString = jig instanceof Code ? jig.name : jig.toString()
        } catch (e) { }

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

async function cacheStates (commit, states, txid) {
  const promises = []

  for (let i = 0; i < commit._outputs.length; i++) {
    const jig = commit._outputs[i]
    const state = states.get(jig)
    _assert(state)
    const vout = i + 1
    const key = `jig://${txid}_o${vout}`
    promises.push(commit._kernel._cache.set(key, state))
  }

  for (let i = 0; i < commit._deletes.length; i++) {
    const jig = commit._deletes[i]
    const state = states.get(jig)
    _assert(state)
    const vdel = i
    const key = `jig://${txid}_d${vdel}`
    promises.push(commit._kernel._cache.set(key, state))
  }

  await Promise.all(promises)
}

// ------------------------------------------------------------------------------------------------

function emitJigEvents (commit) {
  commit._outputs
    .filter(jig => !commit._spentDownstream(jig))
    .forEach(jig => commit._kernel._emit('publish', jig))

  commit._deletes
    .filter(jig => !commit._spentDownstream(jig))
    .forEach(jig => commit._kernel._emit('publish', jig))
}

// ------------------------------------------------------------------------------------------------

_publish._PROTOCOL_VERSION = PROTOCOL_VERSION

_publish._checkNoTimeTravel = checkNoTimeTravel
_publish._assignInitialOwners = assignInitialOwners
_publish._finalizeOwnersAndSatoshis = finalizeOwnersAndSatoshis
_publish._createMasterList = createMasterList
_publish._captureStates = captureStates
_publish._hashStates = hashStates
_publish._createExec = createExec
_publish._createPayload = createPayload
_publish._createPartialTx = createPartialTx
_publish._PURSE_SAFETY_QUEUE = PURSE_SAFETY_QUEUE
_publish._payForTx = payForTx
_publish._signTx = signTx
_publish._finalizeLocationsAndOrigins = finalizeLocationsAndOrigins
_publish._cacheStates = cacheStates
_publish._emitJigEvents = emitJigEvents

module.exports = _publish
