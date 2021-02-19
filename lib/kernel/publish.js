/**
 * publish.js
 *
 * Creates and broadcasts a transaction for a commit
 */

const bsv = require('bsv')
const Loader = require('./loader')
const { _assert, _text, _bsvNetwork, _addCreations, _Timeout, _kernel, _defined } = require('../util/misc')
const { _deepClone, _deepVisit } = require('../util/deep')
const { StateError } = require('../util/errors')
const Log = require('../util/log')
const Codec = require('../util/codec')
const { _calculateDust } = require('../util/bsv')
const { _location, _owner } = require('../util/bindings')
const { _sudo } = require('../util/admin')
const SerialTaskQueue = require('../util/queue')
const SI = require('../sandbox/sandbox')._sandboxIntrinsics
const { _getPayloadVersion } = require('../util/version')
const Editor = require('./editor')
const Record = require('./record')
const { Transaction, Script } = bsv

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Publish'

// Serializes the assignment of new owners to prevent circular dependencies
const OWNER_SAFETY_QUEUE = new SerialTaskQueue()

// Serializes a portion of the publish function for purses to work more reliably
const PURSE_SAFETY_QUEUE = new SerialTaskQueue()

// ------------------------------------------------------------------------------------------------
// _publish
// ------------------------------------------------------------------------------------------------

async function _publish (commit) {
  try {
    if (Log._debugOn) Log._debug(TAG, 'Publish', commit._record._id)

    const start = new Date()
    const kernel = commit._kernel
    const record = commit._record

    if (!commit._publishing()) commit._setPublishing(true)

    // Create a timeout
    const timeout = new _Timeout('publish', kernel._timeout)

    // Assigns initial owners in the jigs after snapshots
    await assignInitialOwners(commit)
    timeout._check()

    // Generate the output scripts which might add new refs
    const outputScripts = await generateOutputScripts(commit)
    timeout._check()

    // Verify no referenced jigs are older than prior references
    await checkNoTimeTravel(commit, timeout)
    timeout._check()

    // Make owners and satoshis bound properties
    finalizeOwnersAndSatoshis(commit)

    // Create the sorted master list used to serialize actions
    const masterList = createMasterList(record)

    // Calculate the serialized states of output and deleted jigs
    const states = await captureStates(commit, timeout)
    timeout._check()

    // Calculate state hashes
    const hashes = await hashStates(commit, states)

    // Convert the actions to executable statements
    const exec = createExec(record, masterList)

    // Create the OP_RETURN payload json
    const payload = createPayload(commit, hashes, exec, masterList)

    // Create the unpaid and unsigned tx
    const feePerKb = bsv.Transaction.FEE_PER_KB
    const partialtx = createPartialTx(commit, payload, outputScripts, feePerKb)

    // Preverify the transaction we generated so we have some assurance it will load.
    // This is a safety check for Run bugs. It is not intended to catch consensus failures.
    await preverify(kernel, record, states, payload, partialtx, timeout)
    timeout._check()

    // Serialize from pay to broadcast because the purse may consume outputs that should not be
    // consumed again in another parallel publish, but the purse may not mark them as spent right
    // away. In the future we might consider making this serialization optional for smarter purses.
    const txid = await PURSE_SAFETY_QUEUE._enqueue(async () => {
      // Add inputs and outputs to pay for the transaction
      const paidtx = await payForTx(partialtx, commit, feePerKb)
      timeout._check()

      // Sign the jig owners
      const signedtx = await signTx(paidtx, commit, feePerKb)
      timeout._check()

      // Check that we have all signatures and the tx didn't change
      checkTx(signedtx, record, partialtx)

      // Broadcast
      const txid = await broadcastTx(commit, signedtx, timeout)
      if (typeof txid !== 'string' || txid.length !== 64) {
        throw new StateError(`Invalid txid: ${_text(txid)}`)
      }
      timeout._check()

      return txid
    })
    timeout._check()

    // Apply bindings to output and deleted jigs and their after snapshots
    finalizeLocationsAndOrigins(commit, txid)

    // Add to cache, both outputs and deleted states
    await cacheStates(commit, states, txid)
    timeout._check()

    // Add this txid to the trusted set if there were any deploys or upgrades
    const anythingToTrust =
      payload.exec.some(action => action.op === 'DEPLOY') ||
      payload.exec.some(action => action.op === 'UPGRADE')

    if (anythingToTrust) {
      kernel._trustlist.add(txid)
    }

    commit._onPublishSucceed()

    if (Log._debugOn) Log._debug(TAG, 'Publish (end): ' + (new Date() - start) + 'ms')
  } catch (e) {
    commit._onPublishFail(e)
  }
}

// ------------------------------------------------------------------------------------------------

async function checkNoTimeTravel (commit, timeout) {
  const refmap = await commit._buildRefmap()

  const record = commit._record

  for (const jig of record._refs) {
    const before = record._before.get(jig)

    if (!(before._props.origin in refmap)) continue

    const refmapNonce = refmap[before._props.origin][1]
    if (before._props.nonce < refmapNonce) throw new StateError(`Time travel for ${_text(jig)}`)
  }
}

// ------------------------------------------------------------------------------------------------

async function assignInitialOwners (commit) {
  const Creation = require('./creation')
  const record = commit._record

  if (Log._debugOn) Log._debug(TAG, 'Assign owners')

  async function generateInitialOwners () {
    const initialOwners = []
    for (let i = 0; i < record._creates.length; i++) {
      const jig = record._creates[i]
      const after = commit._after.get(jig)
      const prevowner = after._props.owner
      const needsOwner = typeof prevowner === 'undefined'
      const owner = needsOwner && await commit._kernel._ownerAPI().nextOwner()
      initialOwners.push(owner)
    }
    return initialOwners
  }

  function addOwnerRefs (owners) {
    _deepVisit(owners, x => {
      if (x instanceof Creation) {
        commit._record._read(x)
        return false // Don't traverse to 2nd levels, because not used in states
      }
    })
  }

  // Get owners for every new creation that requires it. We synchronize this
  // to ensure that within a single deployment, all new owners that change
  // the record do not create loops in the commit dependency graph.
  await OWNER_SAFETY_QUEUE._enqueue(async () => {
    const initialOwners = await generateInitialOwners()

    // Deploy each new owner if necessary
    const deployedOwners = []
    const savedRecord = Record._CURRENT_RECORD
    try {
      Record._CURRENT_RECORD = commit._record
      commit._record._autopublish = false

      for (const owner of initialOwners) {
        if (!owner) { deployedOwners.push(owner); continue }

        const deployCode = x => {
          if (typeof x !== 'function') return
          const C = Editor._lookupOrCreateCode(x)
          Editor._get(C)._deploy()
          return C
        }

        const deployedOwner = _deepClone(owner, SI, deployCode)
        deployedOwners.push(deployedOwner)
      }
    } finally {
      Record._CURRENT_RECORD = savedRecord
    }

    // Add references to each creation used in the new owners so that they can
    // be saved in the state. We may also create new upstream dependencies.
    addOwnerRefs(deployedOwners)

    // Generate the after state for the new jigs
    commit._generateAfterStates()

    // Assign new owners to the after state. We don't assign directly to the jig
    // because we are in async code, and that jig may already be updated. The
    // finalizeOwnersAndSatoshis() method will determine whether to set on the jig.
    deployedOwners.forEach((owner, n) => {
      if (!owner) return
      const jig = record._creates[n]
      const after = commit._after.get(jig)
      after._props.owner = owner
    })

    // Generate additional initial owners for any new deployed owners!
    // We only do this once. No loops allowed.
    const initialOwners2 = await generateInitialOwners()

    // Clone the owner for use in sandboxed code
    const deployedOwners2 = []
    for (const owner of initialOwners2) {
      if (!owner) { deployedOwners2.push(owner); continue }

      const getDeployedCode = x => {
        if (typeof x !== 'function') return
        const C = Editor._lookupOrCreateCode(x)
        // TODO: Check if deployed
        return C
      }

      const deployedOwner2 = _deepClone(owner, SI, getDeployedCode)
      deployedOwners2.push(deployedOwner2)
    }

    // Assign our new owners
    deployedOwners2.forEach((owner, n) => {
      if (!owner) return
      const jig = record._creates[n]
      const after = commit._after.get(jig)
      after._props.owner = owner
    })

    // Add new refs again
    addOwnerRefs(deployedOwners2)

    // After adding refs and deploying, we need to finalize the record again
    commit._record._finalize()
  })

  // Wait for any new upstream commits to publish
  await commit._onReady()
}

// ------------------------------------------------------------------------------------------------

async function generateOutputScripts (commit) {
  const bsvNetwork = _bsvNetwork(commit._kernel._blockchainAPI().network)
  const allowNullOwner = false
  const scripts = []

  const savedRecord = Record._CURRENT_RECORD
  try {
    Record._CURRENT_RECORD = commit._record
    commit._record._outputs.forEach(creation => {
      try {
        commit._record._push(creation)
        const after = commit._after.get(creation)
        const owner = after._props.owner
        const lock = _owner(owner, allowNullOwner, bsvNetwork)
        const script = lock.script()
        scripts.push(script)
      } finally {
        commit._record._pop()
      }
    })
    commit._record._finalize()
  } finally {
    Record._CURRENT_RECORD = savedRecord
  }

  // The calling of script() may generate new refs that we have to wait on
  await commit._onReady()

  return scripts
}

// ------------------------------------------------------------------------------------------------

function finalizeOwnersAndSatoshis (commit) {
  const record = commit._record

  record._outputs.forEach(creation => {
    const after = commit._after.get(creation)
    const props = after._props

    props.satoshis = props.satoshis || 0

    _sudo(() => {
      if (!_defined(creation.owner)) creation.owner = props.owner
      if (!_defined(creation.satoshis)) creation.satoshis = props.satoshis
    })
  })

  record._deletes.forEach(creation => {
    _sudo(() => {
      _assert(creation.owner === null)
      _assert(creation.satoshis === 0)
    })
  })
}

// ------------------------------------------------------------------------------------------------

function createMasterList (record) {
  let masterList = _addCreations(record._inputs, record._refs)
  masterList = _addCreations(masterList, record._creates)
  // Deletes don't need to be added, because anything deleted must be an input or create
  return masterList
}

// ------------------------------------------------------------------------------------------------

async function captureStates (commit, timeout) {
  if (commit._states) return commit._states

  const { _captureJig } = require('./state')

  const states = new Map()
  const record = commit._record
  const jigs = record._outputs.concat(record._deletes)

  for (const jig of jigs) {
    const state = await _captureJig(jig, commit, timeout)
    states.set(jig, state)
  }

  commit._states = states

  return states
}

// ------------------------------------------------------------------------------------------------

async function hashStates (commit, states) {
  if (commit._stateHashes) return commit._stateHashes

  const { _hashState } = require('./state')

  const hashes = new Map()
  const promises = []

  for (const [jig, state] of states) {
    if (hashes.has(jig)) continue

    const promise = await _hashState(state)
      .then(hash => hashes.set(jig, hash))

    promises.push(promise)
  }

  await Promise.all(promises)

  commit._stateHashes = hashes

  return hashes
}

// ------------------------------------------------------------------------------------------------

function createExec (record, masterList) {
  const codec = new Codec()._saveJigs(x => {
    const index = masterList.indexOf(x)
    _assert(index >= 0)
    return index
  })

  return record._actions.map(action => {
    const op = action.op()
    const data = codec._encode(action.data())
    return { op, data }
  })
}

// ------------------------------------------------------------------------------------------------

function createPayload (commit, hashes, exec, masterList) {
  const record = commit._record

  const out = record._outputs.map(jig => hashes.get(jig))
  const del = record._deletes.map(jig => hashes.get(jig))

  const ownersCodec = new Codec()._saveJigs(x => {
    const index = masterList.indexOf(x)
    _assert(index >= 0)
    return index
  })

  const owners = record._creates.map(jig => commit._after.get(jig)._props.owner)
  const cre = owners.map(owner => ownersCodec._encode(owner))

  const ref = record._refs.map(jig => record._before.get(jig)._props.location)

  const app = commit._app
  const version = commit._version

  const payload = {
    app,
    version,
    in: record._inputs.length,
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

function createPartialTx (commit, payload, outputScripts, feePerKb) {
  if (Log._debugOn) Log._debug(TAG, 'Create partial tx')

  const tx = new Transaction()

  const Buffer = bsv.deps.Buffer
  const prefix = Buffer.from('run', 'utf8')
  const protocolHex = _getPayloadVersion(payload.version)
  const protocol = Buffer.from(protocolHex, 'hex')
  const app = Buffer.from(payload.app, 'utf8')
  const jsonObj = Object.assign({}, payload)
  delete jsonObj.app
  delete jsonObj.version
  const json = Buffer.from(JSON.stringify(jsonObj), 'utf8')
  const script = Script.buildSafeDataOut([prefix, protocol, app, json])
  const payloadOutput = new Transaction.Output({ script, satoshis: 0 })

  tx.addOutput(payloadOutput)

  const bsvNetwork = _bsvNetwork(commit._kernel._blockchainAPI().network)
  const allowNullOwner = false
  const record = commit._record

  record._inputs.forEach(jig => {
    const before = record._before.get(jig)
    const location = before._props.location
    const { _txid, _vout } = _location(location)
    const satoshis = before._props.satoshis
    const owner = before._props.owner
    const lock = _owner(owner, allowNullOwner, bsvNetwork)
    const scriptHex = lock.script()
    const script = Script.fromHex(scriptHex)
    const utxo = { txid: _txid, vout: _vout, script, satoshis }
    tx.from(utxo)
  })

  record._outputs.forEach((jig, i) => {
    const after = commit._after.get(jig)
    const scriptLen = outputScripts[i].length / 2
    const satoshis = Math.max(after._props.satoshis, _calculateDust(scriptLen, feePerKb))
    const script = Script.fromHex(outputScripts[i])
    tx.addOutput(new Transaction.Output({ script, satoshis }))
  })

  return tx
}

// ------------------------------------------------------------------------------------------------

async function preverify (kernel, record, states, payload, partialtx, timeout) {
  if (kernel._preverify) {
    if (Log._infoOn) Log._info(TAG, 'Preverify')

    const start = new Date()

    try {
      const _replay = require('./replay')
      const { _Preverify } = _replay
      const mocktxid = '0000000000000000000000000000000000000000000000000000000000000000'
      const published = false
      const jigToSync = null
      const preverify = new _Preverify(record, states)
      await _replay(partialtx, mocktxid, payload, kernel, published, jigToSync, timeout, preverify)
    } catch (e) {
      if (Log._errorOn) Log._error(TAG, e)
      throw new Error(`Pre-verification failed: ${e.message}`)
    }

    if (Log._debugOn) Log._debug(TAG, 'Preverify (end): ' + (new Date() - start) + 'ms')
  }
}

// ------------------------------------------------------------------------------------------------

function finalizeLocationsAndOrigins (commit, txid) {
  const Code = require('./code')
  const record = commit._record

  record._outputs.forEach((jig, index) => {
    const vout = index + 1
    const after = commit._after.get(jig)
    const location = `${txid}_o${vout}`

    if (after._props.origin.startsWith('record://')) after._props.origin = location
    after._props.location = location

    _sudo(() => {
      if (jig.origin.startsWith('record://')) jig.origin = location
      if (!commit._spentDownstream(jig)) jig.location = location
    })

    // Set local bindings for ease of learning Run
    if (jig instanceof Code) {
      Editor._get(jig)._copyBindingsToLocalType(after._props)
    }
  })

  record._deletes.forEach((jig, index) => {
    const after = commit._after.get(jig)
    const location = `${txid}_d${index}`

    if (after._props.origin.startsWith('record://')) after._props.origin = location
    after._props.location = location

    _sudo(() => {
      if (jig.origin.startsWith('record://')) jig.origin = location
      jig.location = location
    })

    // Set local bindings for ease of learning Run
    if (jig instanceof Code) {
      Editor._get(jig)._copyBindingsToLocalType(after._props)
    }
  })
}

// ------------------------------------------------------------------------------------------------

async function payForTx (tx, commit, feePerKb) {
  const Buffer = bsv.deps.Buffer

  const locks = getInputLocks(commit._record)
  const parents = await getParents(tx, commit._record, locks, feePerKb)

  // Add placeholder scripts for jig inputs
  const placeholders = locks.map(lock => Buffer.alloc(lock.domain()))
  const indices = [...Array(locks.length).keys()].filter(i => !tx.inputs[i].script.toBuffer().length)
  indices.forEach(i => tx.inputs[i].setScript(placeholders[i]))

  // Pay for the transaction
  const rawtx = tx.toString('hex')
  const paidhex = await commit._kernel._purseAPI().pay(rawtx, parents)
  const paidtx = new Transaction(paidhex)

  // Remove placeholder scripts
  indices.forEach(i => paidtx.inputs[i].setScript(''))

  return paidtx
}

// ------------------------------------------------------------------------------------------------

function getInputLocks (record) {
  const locks = record._inputs
    .map(jig => record._before.get(jig))
    .map(snapshot => snapshot._props.owner)
    .map(owner => _owner(owner))

  return locks
}

// ------------------------------------------------------------------------------------------------

async function getParents (tx, record, locks, feePerKb) {
  const jigScripts = locks.map(lock => lock.script())

  const jigSatoshis = record._inputs
    .map((jig, i) => record._before.get(jig))
    .map((snapshot, i) => Math.max(snapshot._props.satoshis, _calculateDust(jigScripts[i].length / 2, feePerKb)))

  const jigParents = jigScripts.map((script, i) => { return { script, satoshis: jigSatoshis[i] } })

  const payInputs = tx.inputs.slice(record._inputs.length)
  const payRawTransactions = await Promise.all(
    payInputs.map(input => _kernel()._blockchainAPI().fetch(input.prevTxId.toString('hex'))))
  const payTransactions = payRawTransactions.map(rawtx => new bsv.Transaction(rawtx))

  const payOutputs = payInputs.map((input, n) => payTransactions[n].outputs[input.outputIndex])
  const payScripts = payOutputs.map(output => output.script.toHex())
  const paySatoshis = payOutputs.map(output => output.satoshis)

  const payParents = payScripts.map((script, i) => { return { script, satoshis: paySatoshis[i] } })

  const parents = jigParents.concat(payParents)
  return parents
}

// ------------------------------------------------------------------------------------------------

async function signTx (tx, commit, feePerKb) {
  const record = commit._record
  const locks = getInputLocks(record)
  const parents = await getParents(tx, record, locks, feePerKb)

  // Sign the transaction
  const rawtx = tx.toString('hex')
  const signedhex = await commit._kernel._ownerAPI().sign(rawtx, parents, locks)
  const signedtx = new Transaction(signedhex)

  return signedtx
}

// ------------------------------------------------------------------------------------------------

function checkTx (tx, record, partialtx) {
  record._inputs.forEach((jig, i) => {
    if (tx.inputs[i].isFullySigned()) return
    const before = record._before.get(jig)
    const line1 = `origin: ${before._props.origin}`
    const line2 = `location: ${before._props.location}`
    const line3 = `owner: ${before._props.owner}`
    const details = `${line1}\n${line2}\n${line3}`
    const reason = tx.inputs[i].script.toBuffer().length ? 'Bad signature' : 'Missing signature'
    throw new StateError(`${reason} for ${_text(jig)}\n\n${details}`)
  })

  for (let vin = 0; vin < partialtx.inputs.length; vin++) {
    if (partialtx.inputs[vin].prevTxId.toString('hex') !== tx.inputs[vin].prevTxId.toString('hex') ||
      partialtx.inputs[vin].outputIndex !== tx.inputs[vin].outputIndex) {
      throw new StateError(`Transaction input ${vin} changed`)
    }
  }

  for (let vout = 0; vout < partialtx.outputs.length; vout++) {
    if (partialtx.outputs[vout].script.toHex() !== tx.outputs[vout].script.toHex()) {
      throw new StateError(`Transaction output ${vout} changed`)
    }
  }
}

// ------------------------------------------------------------------------------------------------

async function broadcastTx (commit, tx, timeout) {
  let txid = null

  // Notify the purse of the broadcast
  try {
    await commit._kernel._purseAPI().broadcast(tx.toString('hex'))
  } catch (e) {
    if (Log._errorOn) Log._error(TAG, e.toString())
  }

  // Broadcast to the blockchain
  try {
    txid = await commit._kernel._blockchainAPI().broadcast(tx.toString('hex'))
  } catch (e) {
    throw await addDetailsToBroadcastError(e, commit, tx, timeout)
  }

  return txid
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
        const prevspend = await commit._kernel._blockchainAPI().spends(prevtxid, prevvout)
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

  const record = commit._record

  for (let i = 0; i < record._outputs.length; i++) {
    const jig = record._outputs[i]
    const state = states.get(jig)
    _assert(state)
    const vout = i + 1
    const key = `jig://${txid}_o${vout}`
    promises.push(commit._kernel._cacheAPI().set(key, state))
  }

  for (let i = 0; i < record._deletes.length; i++) {
    const jig = record._deletes[i]
    const state = states.get(jig)
    _assert(state)
    const vdel = i
    const key = `jig://${txid}_d${vdel}`
    promises.push(commit._kernel._cacheAPI().set(key, state))
  }

  await Promise.all(promises)
}

// ------------------------------------------------------------------------------------------------

_publish._checkNoTimeTravel = checkNoTimeTravel
_publish._assignInitialOwners = assignInitialOwners
_publish._generateOutputScripts = generateOutputScripts
_publish._finalizeOwnersAndSatoshis = finalizeOwnersAndSatoshis
_publish._createMasterList = createMasterList
_publish._captureStates = captureStates
_publish._hashStates = hashStates
_publish._createExec = createExec
_publish._createPayload = createPayload
_publish._createPartialTx = createPartialTx
_publish._preverify = preverify
_publish._PURSE_SAFETY_QUEUE = PURSE_SAFETY_QUEUE
_publish._payForTx = payForTx
_publish._signTx = signTx
_publish._checkTx = checkTx
_publish._broadcastTx = broadcastTx
_publish._finalizeLocationsAndOrigins = finalizeLocationsAndOrigins
_publish._cacheStates = cacheStates

module.exports = _publish
