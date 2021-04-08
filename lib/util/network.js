/**
 * network.js
 *
 * Network request helpers
 */

const Log = require('./log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Network'

// ------------------------------------------------------------------------------------------------
// _dedupUtxos
// ------------------------------------------------------------------------------------------------

function _dedupUtxos (utxos) {
// In case the server has a bug, RUN must be able to handle duplicate utxos returned. If we
// don't dedup, then later we may create a transaction with more than one of the same input,
// for example in Token combines.
  const locations = new Set()
  return utxos.filter(utxo => {
    const location = `${utxo.txid}_o${utxo.vout}`
    if (!locations.has(location)) {
      locations.add(location)
      return true
    } else {
      if (Log._warnOn) Log._warn(TAG, 'Duplicate utxo returned from server:', location)
      return false
    }
  })
}

// ------------------------------------------------------------------------------------------------

module.exports = { _dedupUtxos }
