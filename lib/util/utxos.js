/**
 * utxos.js
 *
 * UTXO management helpers
 */

const Log = require('./log')
const { _filterInPlace } = require('./misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Utxos'

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
// _addToBroadcastCache
// ------------------------------------------------------------------------------------------------

/**
 * Adds transactions to a broadcast cash, so that they can be updated in _updateUtxos
 * @param {Array} broadcastCache Cache of transactions that were recently broadcast
 * @returns {Array} Updated broadcast cache
 */
function _addToBroadcastCache (broadcastCache, expiration, txid, tx) {
  // Remove expired txs
  _filterInPlace(broadcastCache, x => Date.now() - x.time < expiration)

  // Check not duplicate
  if (broadcastCache.some(entry => entry.txid === txid)) return

  // Add new tx
  broadcastCache.push({ txid, tx, time: Date.now() })
}

// ------------------------------------------------------------------------------------------------
// _updateUtxosWithBroadcasts
// ------------------------------------------------------------------------------------------------

function _updateUtxosWithBroadcasts (broadcastCache, expiration, utxos, bsvScript) {
  // Remove expired txs
  _filterInPlace(broadcastCache, x => Date.now() - x.time < expiration)

  // Add all utxos from our broadcast cache for this script that aren't already there
  broadcastCache.forEach(entry => {
    const { tx, txid } = entry

    tx.outputs.forEach((output, vout) => {
      if (output.script.equals(bsvScript) && !utxos.some(utxo => utxo.txid === txid && utxo.vout === vout)) {
        utxos.push({ txid, vout, script: output.script, satoshis: output.satoshis })
      }
    })
  })

  // Remove all utxos that we know are spent because they are in our broadcast cache
  broadcastCache.forEach(entry => {
    const { tx } = entry

    const inputSpendsUtxo = (input, utxo) =>
      input.prevTxId.toString('hex') === utxo.txid && input.outputIndex === utxo.vout

    utxos = utxos.filter(utxo => !tx.inputs.some(input => inputSpendsUtxo(input, utxo)))
  })

  return utxos
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _dedupUtxos,
  _addToBroadcastCache,
  _updateUtxosWithBroadcasts
}
