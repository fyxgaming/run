/**
 * publisher.js
 *
 * Publishes records as transactions
 */

const Log = require('../../util/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Publisher'

// ------------------------------------------------------------------------------------------------
// Publisher
// ------------------------------------------------------------------------------------------------

class Publisher {
  _publish (record) {
    if (record._upstream.size) return
    if (!record._spends.length && !record._creates.length) return

    Log._debug(TAG, 'Publish', record._id)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = new Publisher()
