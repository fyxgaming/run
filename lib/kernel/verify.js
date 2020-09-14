/**
 * verify.js
 *
 * Verifies that a commit replayed matches an existing transaction
 */

const Log = require('../util/log')
const { _assert, _checkState, _deterministicJSONStringify } = require('../util/misc')
const { _sudo } = require('../util/admin')
const Codec = require('../util/codec')
const {
  _createMasterList, _finalizeOwnersAndSatoshis, _captureStates, _hashStates,
  _createExec, _createPayload, _createPartialTx, _finalizeLocationsAndOrigins, _cacheStates
} = require('./publish')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Verify'

// ------------------------------------------------------------------------------------------------
// verify
// ------------------------------------------------------------------------------------------------

async function verify (commit, tx, txpayload, published, timeout) {
  if (Log._debugOn) Log._debug(TAG, 'Verify', tx.hash)

  // Create the sorted master list used to serialize actions
  const masterList = _createMasterList(commit)

  // Assign initial owners for new creates from the tx payload
  _assignInitialOwners(commit, txpayload, masterList)

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
    _throwPayloadMismatchError(txpayload, payload)
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

  const txid = tx.hash

  // Finalize jig bindings
  _finalizeLocationsAndOrigins(commit, txid)

  // Add the state to the cache
  await _cacheStates(commit, states, txid)
  timeout._check()

  // Note: We don't emit jig events because we haven't checked if jigs are unspent.
}

function _throwPayloadMismatchError (expected, actual) {
  if (Log._errorOn) Log._error(TAG, 'Expected payload:', _deterministicJSONStringify(expected, 0, 3))
  if (Log._errorOn) Log._error(TAG, 'Actual payload:', _deterministicJSONStringify(actual, 0, 3))
  throw new Error('Payload mismatch\n\nHint: See logs')
}

// ------------------------------------------------------------------------------------------------

function _assignInitialOwners (commit, txpayload, masterList) {
  const Unbound = require('../util/unbound')

  function jigLoader (x) {
    const index = masterList.indexOf(x)
    _assert(index >= 0)
    return index
  }

  const ownersCodec = new Codec()
    ._toSandbox()
    ._loadJigs(jigLoader)

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

module.exports = verify
