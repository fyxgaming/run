/**
 * import.js
 *
 * Imports a transaction into a live record
 */

const { _text, _checkState, _addJigs, _Timeout } = require('../util/misc')
const Log = require('../util/log')
const { _deepReplace, _deepVisit } = require('../util/deep')
const { _sudo } = require('../util/admin')
const Loader = require('./loader')
const Record = require('./record')
const verify = require('./verify')
const Berry = require('./berry')
const Universal = require('./universal')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Import'

// ------------------------------------------------------------------------------------------------
// _Preverify
// ------------------------------------------------------------------------------------------------

class _Preverify {
  constructor (commit, states) { this._commit = commit; this._states = states }
  _output (n) { return this._states.get(this._commit._outputs[n]) }
  _delete (n) { return this._states.get(this._commit._deletes[n]) }
}

// ------------------------------------------------------------------------------------------------
// _import
// ------------------------------------------------------------------------------------------------

/**
 * Creates a record by replaying a transaction. The returned record must be published
 */
async function _import (tx, txid, payload, kernel, published, jigToSync, timeout, preverify) {
  const _execute = require('./execute')

  if (Log._infoOn) Log._info(TAG, 'Import', txid)

  const start = new Date()

  timeout = timeout || new _Timeout('import', kernel._timeout)
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

  // Share a loader for imports and references
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
  const incoming = inputs.concat(refs)
  const refmap = unifyIncoming(incoming, jigToSync)

  // Replace the input with the jig to sync
  if (jigToSync) {
    inputs[inputs.findIndex(x => x.location === jigToSync.location)] = jigToSync
    incoming[incoming.findIndex(x => x.location === jigToSync.location)] = jigToSync
  }

  // Create a new record to replay this import
  const record = new Record()

  // We will manually commit and then verify the record
  record._importing = true
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

    // Apply the refmap we already generated
    commit._refmap = refmap

    // Verify the commit
    await verify(commit, tx, txid, payload, published, timeout, preverify)

    // Return the commit to be used. Its record may even be analyzed.
    return commit
  } finally {
    // Deactivate the commit from being published
    if (commit) commit._deactivate()

    if (Log._debugOn) Log._debug(TAG, 'Import (end): ' + (new Date() - start) + 'ms')
  }
}

// ------------------------------------------------------------------------------------------------

/**
 * Incoming jigs are all deduped with each other so that they share the same inner reference jigs.
 * When two jigs are both used in a transaction, and they share some jigs at different states,
 * the newer state is used for both of them. This is called social synchronization.
 */
function unifyIncoming (incoming, jigToSync) {
  // All incoming jigs must have unique origins. No inconsistent refs and no refs also in inputs.
  const incomingOrigins = {}
  incoming.forEach(x => {
    _checkState(!(x.origin in incomingOrigins), 'Inconsistent reference')
    incomingOrigins[x.origin] = x
  })

  const worldview = {} // Origin -> Jig

  // Find the latest version of each inner jig
  _sudo(() => {
    _deepVisit(incoming, x => {
      if (x instanceof Universal) {
        const key = x instanceof Berry ? x.location : x.origin

        // Always prefer incoming jigs
        x = incomingOrigins[key] || x

        if (!(key in worldview)) worldview[key] = x
        if (x.nonce > worldview[key].nonce) worldview[key] = x
      }
    })
  })

  // Override the worldview so that all inner refs use the jig to sync
  if (jigToSync) worldview[jigToSync.origin] = jigToSync

  // Build a refmap from the worldview
  const refmap = {}
  Object.entries(worldview).forEach(([origin, jig]) => {
    refmap[origin] = [jig.location, jig.nonce]
  })

  // Unify each inner reference with the worldview
  _sudo(() => {
    // Unify the jig to sync with the worldview, potentially reversing inner syncs
    if (jigToSync) {
      _deepReplace(jigToSync, x => {
        if (x instanceof Universal) {
          const key = x instanceof Berry ? x.location : x.origin
          return worldview[key]
        }
      })
    }

    incoming.forEach(jig => _deepReplace(jig, x => {
      if (x instanceof Universal) {
        const key = x instanceof Berry ? x.location : x.origin

        // Make sure we only sync forward for jigs other than the one we're syncing.
        const timeTravel = key in incomingOrigins && x.nonce > incomingOrigins[key].nonce
        _checkState(!timeTravel, 'Time travel')

        return worldview[key]
      }
    }))
  })

  return refmap
}

// ------------------------------------------------------------------------------------------------

_import._Preverify = _Preverify

module.exports = _import
