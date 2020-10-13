/**
 * replay.js
 *
 * Replays a transaction and generates a commit with live objects
 */

const { _text, _checkState, _addJigs, _deterministicJSONStringify, _Timeout } = require('../util/misc')
const Log = require('../util/log')
const Loader = require('./loader')
const Record = require('./record')
const { _unifyForReplay, _deunifyForReplay } = require('./unify')
const { _sudo } = require('../util/admin')
const Codec = require('../util/codec')
const {
  _createMasterList, _finalizeOwnersAndSatoshis, _captureStates, _hashStates,
  _createExec, _createPayload, _createPartialTx, _finalizeLocationsAndOrigins, _cacheStates
} = require('./publish')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Replay'

// ------------------------------------------------------------------------------------------------
// _Preverify
// ------------------------------------------------------------------------------------------------

class _Preverify {
  constructor (commit, states) { this._commit = commit; this._states = states }
  _output (n) { return this._states.get(this._commit._outputs[n]) }
  _delete (n) { return this._states.get(this._commit._deletes[n]) }
}

// ------------------------------------------------------------------------------------------------
// _replay
// ------------------------------------------------------------------------------------------------

/**
 * Creates a record by replaying a transaction. The returned record must be published
 */
async function _replay (tx, txid, payload, kernel, published, jigToSync, timeout, preverify) {
  const _execute = require('./execute')

  if (Log._infoOn) Log._info(TAG, 'Replay', txid)

  const start = new Date()

  timeout = timeout || new _Timeout('replay', kernel._timeout)
  timeout._check()

  // Check that the payload can be loaded
  const deploys = payload.exec.some(action => action.op === 'DEPLOY')
  const upgrades = payload.exec.some(action => action.op === 'UPGRADE')
  if (!preverify && (deploys || upgrades) && !kernel._trusts.has(txid) && !kernel._trusts.has('*')) {
    const hint = 'Hint: Trust this txid using run.trust if you know it is safe'
    throw new Error(`Cannot load untrusted code: ${txid}\n\n${hint}`)
  }

  let inputs = []
  let refs = []

  // Share a loader for replays and cache loads
  const loader = new Loader(kernel, timeout)

  // We will trust every input and reference since we trust this transaction
  const trust = txid => {
    if (preverify) return
    if (!kernel._trusts.has(txid)) kernel._trusts.add(txid)
  }

  // Load inputs
  for (let vin = 0; vin < payload.in; vin++) {
    const input = tx.inputs[vin]
    const txid = input.prevTxId.toString('hex')
    trust(txid)
    const vout = input.outputIndex
    const location = `${txid}_o${vout}`
    const promise = loader._load(location)
    inputs.push(promise)
  }

  // Load refs
  for (let vref = 0; vref < payload.ref.length; vref++) {
    const location = payload.ref[vref]
    if (!location.startsWith('native://')) trust(location.slice(0, 64))
    const promise = loader._load(location)
    refs.push(promise)
  }

  // Wait for all inputs and ref loads to complete
  inputs = await Promise.all(inputs)
  refs = await Promise.all(refs)

  // Make sure the jig to sync exists
  if (jigToSync) {
    const notSpentError = `${_text(jigToSync)} not found in the transaction\n\ntxid: ${txid}\njig: ${jigToSync.location}`
    _checkState(inputs.some(x => x.location === jigToSync.location), notSpentError)
  }

  // Update the references for each incoming jig with other incoming jigs
  // Also build the refmap. This is faster than building it during capture states.
  const { _refmap, _deunifyMap } = _unifyForReplay(inputs, refs, jigToSync)

  // Replace the input with the jig to sync
  if (jigToSync) {
    inputs[inputs.findIndex(x => x.location === jigToSync.location)] = jigToSync
  }

  // Create a new record to replay
  const record = new Record()

  // We will manually commit and then verify the record
  record._replaying = true
  record._autopublish = false

  // Save the current record to replace back after we finish executing this replay
  const savedRecord = Record._CURRENT_RECORD

  // Replay the actions, creating a record
  try {
    // Add the incoming jigs to the record.
    // We add inputs to UPDATE instead of AUTH to ensure they are ordered first in the commit.
    inputs.forEach(jig => record._update(jig))
    refs.forEach(jig => record._read(jig))

    // Replace the current record with ours while we execute actions
    Record._CURRENT_RECORD = record

    // Execute each action
    if (Log._debugOn) Log._info(TAG, 'Replay', txid)
    for (const entry of payload.exec) {
      const { op, data } = entry

      _checkState(Object.keys(entry).length === 2, 'Invalid exec')
      _checkState(typeof op === 'string', `Invalid op: ${op}`)
      _checkState(typeof data === 'object' && data, `Invalid data: ${data}`)

      const masterList = _addJigs(_addJigs(inputs, refs), record._creates)

      _execute(op, data, masterList)
    }
  } catch (e) {
    // Probably not needed, but roll back the current record anyway
    record._rollback()

    throw e
  } finally {
    // Restore the previous record
    Record._CURRENT_RECORD = savedRecord
  }

  // Save the commit to make sure it's deactivated at the end
  let commit = null

  // Convert the record a commit and verify it
  try {
    // Create a commit
    commit = record._commit()
    _checkState(commit, 'Invalid payload: no commit generated')

    // Apply the refmap we already generated
    commit._refmap = _refmap

    // Verify the commit
    await verify(commit, tx, txid, payload, published, timeout, preverify)

    // Before returning deunify so that we get the same references whether
    // loading from cache or via replay
    _deunifyForReplay(_deunifyMap)

    // Return the commit to be used. Its record may even be analyzed.
    return commit
  } finally {
    if (Log._debugOn) Log._debug(TAG, 'Replay (end): ' + (new Date() - start) + 'ms')
  }
}

// ------------------------------------------------------------------------------------------------
// verify
// ------------------------------------------------------------------------------------------------

async function verify (commit, tx, txid, txpayload, published, timeout, preverify) {
  if (Log._debugOn) Log._debug(TAG, 'Verify', txid)

  const start = new Date()

  // Create the sorted master list used to serialize actions
  const masterList = _createMasterList(commit)

  // Assign initial owners for new creates from the tx payload
  _assignOwnersFromPayload(commit, txpayload, masterList)

  // Make owner and satoshis bound
  _finalizeOwnersAndSatoshis(commit)

  // Calculate the serialized states of output and deleted jigs
  const states = await _captureStates(commit, timeout)
  timeout._check()

  // Calculate state hashes
  const hashes = _hashStates(states)

  // Convert the actions to executable statements
  const exec = _createExec(commit, masterList)

  // Create the OP_RETURN payload json
  const payload = _createPayload(commit, hashes, exec, masterList)

  // Create the unpaid and unsigned tx
  const partialtx = _createPartialTx(commit, payload)

  // Compare payload. Key order does not matter in the payload.
  if (_deterministicJSONStringify(payload) !== _deterministicJSONStringify(txpayload)) {
    _throwPayloadMismatchError(txpayload, payload, commit, states, preverify)
  }

  // Compare inputs
  for (let i = 0; i < payload.in; i++) {
    const txin1 = tx.inputs[i]
    const txin2 = partialtx.inputs[i]
    const prevtxid1 = txin1.prevTxId.toString('hex')
    const prevtxid2 = txin2.prevTxId.toString('hex')
    _checkState(prevtxid1 === prevtxid2, `Txid mismatch on input ${i}`)
    _checkState(txin1.outputIndex === txin2.outputIndex, `Vout mismatch on input ${i}`)
  }

  // Compare outputs
  for (let i = 1; i <= payload.out.length; i++) {
    const txout1 = tx.outputs[i]
    const txout2 = partialtx.outputs[i]
    const script1 = txout1.script.toString('hex')
    const script2 = txout2.script.toString('hex')
    _checkState(script1 === script2, `Script mismatch on output ${i}`)
    _checkState(txout1.satoshis === txout2.satoshis, `Satoshis mismatch on output ${i}`)
  }

  commit._txid = txid

  // Finalize jig bindings
  _finalizeLocationsAndOrigins(commit, txid)

  if (Log._debugOn) Log._debug(TAG, 'Verify (end): ' + (new Date() - start) + 'ms')

  // Add the state to the cache
  if (published) {
    await _cacheStates(commit, states, txid)
    timeout._check()
  }

  // Note: We don't emit jig events because we haven't checked if jigs are unspent.
}

// ------------------------------------------------------------------------------------------------

function _throwPayloadMismatchError (expected, actual, commit, states, preverify) {
  if (Log._errorOn) Log._error(TAG, 'Expected payload:', JSON.stringify(expected, 0, 3))
  if (Log._errorOn) Log._error(TAG, 'Actual payload:', JSON.stringify(actual, 0, 3))

  // The most common error is state hash mismatches, and these are the hardest to debug.
  // Print debugging information in these cases if we know this is the cause.
  function logBadState (expectedHash, actualHash, jig, preverifyState) {
    if (expectedHash === actualHash) return

    const state = states.get(jig)

    // If we caught this during pre-verify, then we have the before state and should print it.
    // Otherwise, just print the current state in hopes that it might show an obvious error.
    if (preverifyState) {
      Log._error(TAG, 'Expected state:', JSON.stringify(preverifyState, 0, 3))
      Log._error(TAG, 'Actual state:', JSON.stringify(state, 0, 3))
    } else {
      Log._error(TAG, 'State mismatch:', JSON.stringify(state, 0, 3))
    }
  }

  if (Log._errorOn) {
    if (expected.out.length === actual.out.length && expected.del.length === actual.del.length) {
      expected.out.forEach((expectedHash, n) => {
        logBadState(expectedHash, actual.out[n], commit._outputs[n], preverify && preverify._output(n))
      })
      expected.del.forEach((expectedHash, n) => {
        logBadState(expectedHash, actual.del[n], commit._deletes[n], preverify && preverify._delete(n))
      })
    }
  }

  throw new Error('Payload mismatch\n\nHint: See logs')
}

// ------------------------------------------------------------------------------------------------

function _assignOwnersFromPayload (commit, txpayload, masterList) {
  const Unbound = require('../util/unbound')

  const ownersCodec = new Codec()
    ._toSandbox()
    ._loadJigs(x => masterList[x])

  // Inflate the owners
  const owners = txpayload.cre.map(lock => ownersCodec._decode(lock))

  // Check that the owners list length matches the number of creates
  _checkState(commit._creates.length === txpayload.cre.length, 'Invalid locks')

  // Assign the owners to the new creates and after state
  for (let i = 0; i < owners.length; i++) {
    const owner = new Unbound(owners[i])
    const jig = commit._creates[i]
    const state = commit._after.get(jig)

    _sudo(() => { jig.owner = owner })
    state._props.owner = owner
  }
}

// ------------------------------------------------------------------------------------------------

_replay._Preverify = _Preverify

module.exports = _replay