/**
 * verify.js
 *
 * Verifies that a commit replayed matches an existing transaction
 */

const Log = require('../util/log')
const { _assert, _checkState } = require('../util/misc')
const Codec = require('../util/codec')
const {
  _createMasterList, _finalizeOwnersAndSatoshis, _captureStates, _hashStates,
  _createInstructions, _createPayload, _createPartialTx
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

  // Make owner and satoshis bound
  _finalizeOwnersAndSatoshis(commit)

  // Calculate the serialized states of output and deleted jigs
  const states = await _captureStates(commit)

  // Calculate state hashes
  const hashes = _hashStates(states)

  // Convert the actions to executable statements
  const exec = _createInstructions(commit, masterList)

  // Create the OP_RETURN payload json
  const payload = _createPayload(commit, hashes, exec, masterList)

  // Create the unpaid and unsigned tx
  const partialtx = _createPartialTx(commit, payload)

  // TODO
  console.log(partialtx)
}

// ------------------------------------------------------------------------------------------------

function _assignInitialOwners (commit, txpayload, masterList) {
  const Membrane = require('./membrane')
  const Unbound = require('../util/unbound')

  // Inflate the owners
  const ownersCodec = new Codec()._saveJigs(x => {
    const index = masterList.indexOf(x)
    _assert(index >= 0)
    return index
  })
  const owners = txpayload.lock.map(lock => ownersCodec._decode(lock))

  // Check that the owners list length matches the number of creates
  _checkState(commit._creates.length === txpayload.lock.length, 'Invalid locks')

  // Assign the owners to the new creates and after state
  for (let i = 0; i < owners.length; i++) {
    const owner = new Unbound(owners[i])
    const jig = commit._creates[i]
    const state = commit._after.get(jig)

    Membrane._sudo(() => { jig.owner = owner })
    state._props.owner = owner
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = verify
