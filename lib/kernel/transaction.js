/**
 * transaction.js
 *
 * Transaction API for building transactions manually
 */

const Record = require('./record')

// ------------------------------------------------------------------------------------------------
// Transaction
// ------------------------------------------------------------------------------------------------

// Between begin and end, dont allow sync. nor load. nor import.

class Transaction {
  update (callback) {
    // Record._CURRENT_RECORD = this._commit._record
    // this._capture(callback)
    return callback()
  }

  _capture (callback) {
    try {
      Record._CURRENT_RECORD._autopublish = false
      Record._CURRENT_RECORD._begin()
      callback()
      // TODO: Check async
      Record._CURRENT_RECORD._end()
      this._commit = Record._CURRENT_RECORD._commit()
    } catch (e) {
      Record._CURRENT_RECORD._end()
    }
  }

  rollback () {
    // this._commit._rollback()
  }

  static async import () {
    // this._commit = await _import()
    // this._record._autopublish = false ... dont deactivate
  }

  async export (options) {
    // _export (this._commit)
  }

  async publish () {
    // check if already publishing
    // _publish(this._commit)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Transaction
