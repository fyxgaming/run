/**
 * transaction.js
 *
 * Transaction API for building transactions manually
 */

const Record = require('./record')
const _publish = require('./publish')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Transaction'

// ------------------------------------------------------------------------------------------------
// Transaction
// ------------------------------------------------------------------------------------------------

// Functionality
// - Update with commit

// Tests
// - Create transaction with callback
// - Between begin and end, dont allow sync. nor load. nor import.

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

      // Convert the record into a commit
      this._commit = Record._CURRENT_RECORD._commit()

      // Deactivate the commit so that run.sync() does not wait for it
      this._commit._deactivate()

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

    if (!this._commit) throw new Error('Nothing to publish')
    if (this._publish) return this._publish

    // Reactivate the commit since we are about to publish
    this._commit._activate()

    // Publish and save the promise so we don't publish again
    this._publish = _publish(this._commit)

    // Return the promise
    return this._publish
  }

  rollback () {
    Log._info(TAG, 'Rollback')

    // this._commit._rollback()
  }

  static async import () {
    Log._info(TAG, 'Import')

    // this._commit = await _import()
    // this._record._autopublish = false ... dont deactivate
  }

  async export (options) {
    Log._info(TAG, 'Export')

    // _export (this._commit)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Transaction
