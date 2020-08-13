/**
 * verify.js
 *
 * Verifies that a commit replayed matches an existing transaction
 */

const Log = require('../util/log')
const {
  _createMasterList, _captureStates, _hashStates, _createInstructions, _createPayload,
  _createPartialTx
} = require('./publish')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Verify'

// ------------------------------------------------------------------------------------------------
// verify
// ------------------------------------------------------------------------------------------------

async function verify (commit, tx, txpayload) {
  Log._debug(TAG, 'Verify', tx.hash)

  // Create the sorted master list used to serialize actions
  const masterList = _createMasterList(commit)

  // Calculate the serialized states of output and deleted jigs
  const states = await _captureStates(commit)

  // Calculate state hashes
  const hashes = _hashStates(states)

  // Convert the actions to executable statements
  const exec = _createInstructions(commit, masterList)

  // Create the OP_RETURN payload json
  const payload = _createPayload(commit, hashes, exec, masterList)

  if (payload) {
    console.log(payload)
    return
  }

  // Create the unpaid and unsigned tx
  const partialtx = _createPartialTx(commit, payload)

  console.log(partialtx)
}

// ------------------------------------------------------------------------------------------------

module.exports = verify
