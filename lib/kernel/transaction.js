/**
 * transaction.js
 *
 * Transaction API for building transactions manually
 */

const bsv = require('bsv')
const Record = require('./record')
const _publish = require('./publish')
const _import = require('./import')
const Log = require('../util/log')
const { _assert, _kernel, _Timeout, _addJigs, _subtractJigs } = require('../util/misc')
const { _payload } = require('./loader')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Transaction'

// ------------------------------------------------------------------------------------------------
// Transaction
// ------------------------------------------------------------------------------------------------

class Transaction {
  constructor () {
    this._record = new Record()
    this._record._importing = false
    this._record._autopublish = false
    this._commit = null
    this._publish = null
  }

  // --------------------------------------------------------------------------
  // getters
  // --------------------------------------------------------------------------

  get outputs () {
    const inputs = _addJigs(this._record._updates, this._record._auths)
    const outgoing = _addJigs(inputs, this._record._creates)
    return _subtractJigs(outgoing, this._record._deletes)
  }

  // --------------------------------------------------------------------------

  get deletes () {
    return [...this._record._deletes]
  }

  // --------------------------------------------------------------------------
  // update
  // --------------------------------------------------------------------------

  update (callback) {
    if (Log._infoOn) Log._info(TAG, 'Update')

    if (this._publish) throw new Error('Already publishing')

    const savedRecord = Record._CURRENT_RECORD

    try {
      // Replace the current record with ours
      Record._CURRENT_RECORD = this._record

      // Begin recording
      Record._CURRENT_RECORD._begin()

      // Perform updates atomically
      const ret = callback()

      // Async updates are not allowed because we require atomicity
      if (ret instanceof Promise) throw new Error('async transactions not supported')

      // Stop recording
      Record._CURRENT_RECORD._end()

      // Return the return value of the callback
      return ret
    } catch (e) {
      // When an error occurs, all changes are reverted
      Record._CURRENT_RECORD._rollback(e)

      // Rethrow
      throw e
    } finally {
      Record._CURRENT_RECORD = savedRecord
    }
  }

  // --------------------------------------------------------------------------
  // publish
  // --------------------------------------------------------------------------

  publish () {
    if (Log._infoOn) Log._info(TAG, 'Publish')

    // If we are already publishing, link that
    if (this._publish) return this._publish

    // Convert the record into a commit
    const commit = this._record._commit()

    // If no commit, then nothing to publish
    if (!commit) return Promise.resolve()

    if (commit._upstream.length) {
      // Enable auto-publishing when we have to wait for upstream commits to publish first
      commit._record._autopublish = true
    } else {
      // Publish and save the promise so we don't publish again
      _publish(commit)
    }

    // Wait for publish to finish
    this._publish = commit._sync()

    return this._publish
  }

  // --------------------------------------------------------------------------
  // rollback
  // --------------------------------------------------------------------------

  rollback () {
    if (Log._infoOn) Log._info(TAG, 'Rollback')

    // Cannot rollback in the middle of publishing
    if (this._publish) throw new Error('Already publishing')

    // Roll back the record which rolls back all states
    this._record._rollback()
  }

  // --------------------------------------------------------------------------
  // import
  // --------------------------------------------------------------------------

  static async import (rawtx) {
    if (Log._infoOn) Log._info(TAG, 'Import')

    const tx = new bsv.Transaction(rawtx)
    const payload = _payload(tx)
    const kernel = _kernel()
    const published = false
    const commit = await _import(tx, payload, kernel, published)

    const transaction = new Transaction()
    transaction._record = commit._record
    return transaction
  }

  // --------------------------------------------------------------------------
  // export
  // --------------------------------------------------------------------------

  async export (options = {}) {
    if (Log._infoOn) Log._info(TAG, 'Export')

    if (this._publish) throw new Error('Already publishing')

    // Create a new timeout because there are async operations
    const timeout = new _Timeout('export')

    // Convert the record into a commit
    const commit = this._record._commit()

    // If no commit, then nothing to publish
    if (!commit) return

    // Wait for upstream dependencies to publish
    await commit._sync()

    try {
      // There must be no upstream dependencies
      _assert(!commit._upstream.length)

      const {
        _checkNoTimeTravel,
        _assignInitialOwners,
        _finalizeOwnersAndSatoshis,
        _createMasterList,
        _captureStates,
        _hashStates,
        _createExec,
        _createPayload,
        _PURSE_SAFETY_QUEUE,
        _createPartialTx,
        _payForTx,
        _signTx
      } = require('./publish')

      // Make sure references do not go back in time
      await _checkNoTimeTravel(commit, timeout)
      timeout._check()

      // Assigns initial unbound owners in the jigs after snapshots
      await _assignInitialOwners(commit)
      timeout._check()

      // Make owners and satoshis bound properties
      _finalizeOwnersAndSatoshis(commit)

      // Create the sorted master list used to serialize actions
      const masterList = _createMasterList(commit)

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

      // Serialize from pay to broadcast because the purse may consume outputs that should not be
      // consumed again in another parallel publish, but the purse may not mark them as spent right
      // away. In the future we might consider making this serialization optional for smarter purses.
      const tx = await _PURSE_SAFETY_QUEUE._enqueue(async () => {
      // Add inputs and outputs to pay for the transaction
        const paidtx = options.sign ? await _payForTx(partialtx, commit) : partialtx
        timeout._check()

        // Sign the jig owners
        const signedtx = options.sign ? await _signTx(paidtx, commit) : paidtx
        timeout._check()

        // Return the paid and signed transaction
        return signedtx
      })
      timeout._check()

      return tx.toString('hex')
    } finally {
      commit._deactivate()
      commit._restoreRecordBindings()
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Transaction
