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
    console.log('PUBLISH')

    if (record._upstream.length) return
    if (!record._spends.length && !record._creates.length) return

    Log._debug(TAG, 'Publish', record._id)

    console.log('----------')
    console.log(JSON.stringify(record._cmd))
    console.log(JSON.stringify(record._data))
    console.log('spends', record._spends.length)
    console.log('creates', record._creates.length)
    console.log('reads', record._reads.length)
    console.log('deletes', record._deletes.length)
    console.log('upstream', record._upstream.length)
    console.log('downstream', record._downstream.length)
    console.log('----------')

    // Owners that need to be deployed

    record._downstream.forEach(r => r._upstreamPublished(record))
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = new Publisher()
