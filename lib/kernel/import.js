/**
 * import.js
 *
 * Imports a transaction into a live record
 */

const { _checkState, _hasJig, _addJigs, _Timeout } = require('../util/misc')
const Log = require('../util/log')
const { _deepReplace } = require('../util/deep')
const { _sudo } = require('../util/admin')
const Loader = require('./loader')
const Record = require('./record')
const verify = require('./verify')
const Universal = require('./universal')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Import'

// ------------------------------------------------------------------------------------------------
// _import
// ------------------------------------------------------------------------------------------------

/**
 * Creates a record by replaying a transaction. The returned record must be published
 */
async function _import (tx, payload, kernel, published, jigToSync, timeout = new _Timeout('import', kernel)) {
  const _execute = require('./execute')

  Log._info(TAG, 'Import', tx.hash)

  timeout._check()

  // Get the location of the jig to sync so that we can replace it
  const jigToSyncLocation = jigToSync ? _sudo(() => jigToSync.location) : null

  let inputs = []
  let refs = []

  let foundJigToSync = !jigToSync

  // Share a loader for imports and references
  const loader = new Loader(kernel, timeout)

  // Load inputs
  for (let vin = 0; vin < payload.in; vin++) {
    const input = tx.inputs[vin]
    const txid = input.prevTxId.toString('hex')
    const vout = input.outputIndex
    const location = `${txid}_o${vout}`
    const jigOrPromise = jigToSyncLocation === location ? jigToSync : loader._load(location)
    if (jigToSyncLocation === location) foundJigToSync = true
    inputs.push(jigOrPromise)
  }

  _checkState(foundJigToSync, 'Jig not spent in the transaction')

  // Load refs
  for (let vref = 0; vref < payload.ref.length; vref++) {
    const location = payload.ref[vref]
    const promise = loader._load(location)
    refs.push(promise)
  }

  // Wait for all inputs and ref loads to complete
  inputs = await Promise.all(inputs)
  refs = await Promise.all(refs)

  // Make sure that no refs are found in inputs
  _checkState(!inputs.some(jig => _hasJig(refs, jig)), 'Illegal reference')

  // Update the references for each incoming jig with other incoming jigs
  const incoming = inputs.concat(refs)
  incoming.forEach(jig => updateInnerRefs(jig, incoming, jigToSync))

  // Unify the instances of each jig
  unifyWorldview(jigToSync, incoming)

  // Create a new record to replay this import
  const record = new Record()

  // We will manually commit and then verify the record
  record._autopublish = false

  // Save the current record
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
    for (const entry of payload.exec) {
      const { op, data } = entry

      _checkState(Object.keys(entry).length === 2, 'Invalid exec')
      _checkState(typeof op === 'string', `Invalid op: ${op}`)
      _checkState(typeof data === 'object' && data, `Invalid data: ${data}`)

      const masterList = _addJigs(incoming, record._creates)

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

    // Verify the commit
    await verify(commit, tx, payload, published, timeout)

    // Return the commit to be used. Its record may even be analyzed.
    return commit
  } finally {
    // Deactivate the commit from being published
    if (commit) commit._deactivate()
  }
}

// ------------------------------------------------------------------------------------------------

/**
 * Updates a jigs references to be at the same state as other jigs
 *
 * At the start of an import, all inputs and references need to be updated with each other.
 */
function updateInnerRefs (jig, incoming, jigToSync) {
  const Jig = require('./jig')
  const Code = require('./code')

  // Native code should not be updated
  if (jig instanceof Code && Code._editor(jig)._native) return

  _sudo(() => _deepReplace(jig, x => {
    // Don't replace ourself
    if (x === jig) return

    // Don't ever replace the jig we're syncing either
    if (x === jigToSync) return

    // If not a jig or code, nothing to replace
    if (!(x instanceof Jig || x instanceof Code)) return

    // Find the existing jig we might replace it with
    const y = incoming.find(y => y.origin === x.origin)

    // If there is no existing jig, then nothing to do
    if (!y) return

    // Make sure we only sync forward for jigs other than the one we're syncing.
    // For the jig we're syncing, we may need to undo a prior sync.
    if (jig !== jigToSync) {
      _checkState(y.nonce >= x.nonce, 'Illegal reference due to time travel')
    }

    // Looks like this jig is a good replacement. Return it.
    return y
  }))
}

// ------------------------------------------------------------------------------------------------

function unifyWorldview (jigToSync, incoming) {
  const worldview = new Map() // Location -> Universal
  if (jigToSync) worldview.set(jigToSync.location, jigToSync)
  _sudo(() => _deepReplace(incoming, x => {
    if (!(x instanceof Universal)) return
    const y = worldview.get(x.location) || x
    worldview.set(x.location, y)
    return y
  }))
}

// ------------------------------------------------------------------------------------------------

module.exports = _import
