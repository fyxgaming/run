/**
 * verify.js
 *
 * Verifies that a commit replayed matches an existing transaction
 */

const Log = require('../util/log')
const { _assert, _checkState } = require('../util/misc')
const Codec = require('../util/codec')
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

  // Assign initial owners for new creates from the tx payload
  _assignInitialOwners(commit, txpayload, masterList)

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

function _assignInitialOwners (commit, txpayload, masterList) {
//   const Unbound = require('../util/unbound')

  // Inflate the owners
  const ownersCodec = new Codec()._saveJigs(x => {
    const index = masterList.indexOf(x)
    _assert(index >= 0)
    return index
  })
  const owners = txpayload.lock.map(lock => ownersCodec._decode(lock))

  // Check that the owners list length matches the number of creates
  _checkState(commit._record._creates.length === txpayload.lock.length, 'Invalid locks')

  console.log(owners)

  /*
    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i]
      const jig = record._creates[i]
      const ssafter = record._after.get(jig)
      ssafter._props.owner = new Unbound(owner)
    }
    for (const jig of commit._creates) {
        // TODO
    }
    */
  // TODO
}

// ------------------------------------------------------------------------------------------------

module.exports = verify
