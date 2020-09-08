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
const { _assert, _kernel } = require('../util/misc')
const { _payload } = require('./loader')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Transaction'

// ------------------------------------------------------------------------------------------------
// Transaction
// ------------------------------------------------------------------------------------------------

class Transaction {
  constructor (callback) {
    this._record = new Record()
    this._record._autopublish = false
    this._commit = null
    this._publish = null

    if (callback) this.update(callback)
  }

  update (callback) {
    Log._info(TAG, 'Update')

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
      if (ret instanceof Promise) throw new Error('Transaction cannot be async')

      // Stop recording
      Record._CURRENT_RECORD._end()

      // Return the return value of the callback
      return ret
    } catch (e) {
      // When an error occurs, all changes are reverted
      Record._CURRENT_RECORD._rollback()

      // Rethrow
      throw e
    } finally {
      Record._CURRENT_RECORD = savedRecord
    }
  }

  async publish () {
    Log._info(TAG, 'Publish')

    // If we are already publishing, link that
    if (this._publish) return this._publish

    // Convert the record into a commit
    const commit = this._record._commit()

    // If no commit, then nothing to publish
    if (!commit) return

    // Publish and save the promise so we don't publish again
    this._publish = _publish(commit)

    // Return the promise
    return this._publish
  }

  rollback () {
    Log._info(TAG, 'Rollback')

    // Cannot rollback in the middle of publishing
    if (this._publish) throw new Error('Already publishing')

    // Roll back the record which rolls back all states
    this._record._rollback()
  }

  static async import (rawtx) {
    Log._info(TAG, 'Import')

    const tx = new bsv.Transaction(rawtx)
    const payload = _payload(tx)
    const kernel = _kernel()
    const published = false
    const commit = await _import(tx, payload, kernel, published)

    const transaction = new Transaction()
    transaction._record = commit._record
    return transaction
  }

  async export (options = {}) {
    Log._info(TAG, 'Export')

    if (this._publish) throw new Error('Already publishing')

    // Convert the record into a commit
    const commit = this._record._commit()

    // If no commit, then nothing to publish
    if (!commit) return

    // There must be no upstream dependencies
    _assert(!commit._upstream.length)

    const {
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

    // Assigns initial unbound owners in the jigs after snapshots
    await _assignInitialOwners(commit)

    // Make owners and satoshis bound properties
    _finalizeOwnersAndSatoshis(commit)

    // Create the sorted master list used to serialize actions
    const masterList = _createMasterList(commit)

    // Calculate the serialized states of output and deleted jigs
    const states = await _captureStates(commit)

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

      // Sign the jig owners
      const signedtx = options.sign ? await _signTx(paidtx, commit) : paidtx

      // Return the paid and signed transaction
      return signedtx
    })

    return tx.toString('hex')
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Transaction
