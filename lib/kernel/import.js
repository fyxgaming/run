/**
 * import.js
 *
 * Imports a transaction into a live record
 */

const { _text, _checkState, _addJigs, _Timeout } = require('../util/misc')
const Log = require('../util/log')
const Loader = require('./loader')
const Record = require('./record')
const verify = require('./verify')
const { _unifyForReplay } = require('./unify')
const { _deepReplace } = require('../util/deep')

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
  const { _refmap, _deunifyMap } = _unifyForReplay(inputs, refs, jigToSync)

  // Replace the input with the jig to sync
  if (jigToSync) {
    inputs[inputs.findIndex(x => x.location === jigToSync.location)] = jigToSync
  }

  // Create a new record to replay this import
  const record = new Record()

  // We will manually commit and then verify the record
  record._importing = true
  record._autopublish = false

  // Save the current record to replace back after we finish executing this import
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

    // TODO: REMOVE
    const Universal = require('./universal')
    const { _sudo } = require('../util/admin')
    _sudo(() => {
      console.log('REPLACE')
      for (const [jig, value] of _deunifyMap.entries()) {
        _deepReplace(jig, (x, recurse) => {
          if (x !== jig && x instanceof Universal) {
            recurse(false)
            _sudo(() => console.log(value.get(x) && x !== value.get(x), x, value.get(x)))
            return value.get(x) || x
          }
        })
      }
    })

    // Return the commit to be used. Its record may even be analyzed.
    return commit
  } finally {
    // Deactivate the commit from being published
    if (commit) commit._deactivate()

    if (Log._debugOn) Log._debug(TAG, 'Import (end): ' + (new Date() - start) + 'ms')
  }
}

// ------------------------------------------------------------------------------------------------

_import._Preverify = _Preverify

module.exports = _import
