/**
 * utxos.js
 *
 * UTXO management helpers
 */

const { _filterInPlace } = require('./misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const DEFAULT_UTXO_INDEXING_DELAY = 10000

// ------------------------------------------------------------------------------------------------
// _updateRecentBroadcasts
// ------------------------------------------------------------------------------------------------

async function _updateRecentBroadcasts (tx, txid, cache, expiration = DEFAULT_UTXO_INDEXING_DELAY) {
  const recentBroadcasts = await cache.get('broadcasts://recent') || []

  _filterInPlace(recentBroadcasts, tx => Date.now() - tx.time < expiration)

  const inputs = tx.inputs.map(input => {
    return {
      txid: input.prevTxId.toString('hex'),
      vout: input.outputIndex
    }
  })

  const outputs = tx.outputs.map((output, vout) => {
    const script = output.script.toHex()
    const satoshis = output.satoshis
    return { txid, vout, script, satoshis }
  })

  const recentTx = { time: Date.now(), inputs, outputs }

  recentBroadcasts.push(recentTx)

  await cache.set('broadcasts://recent', recentBroadcasts)
}

// ------------------------------------------------------------------------------------------------
// _correctServerUtxosWithRecentBroadcasts
// ------------------------------------------------------------------------------------------------

async function _correctServerUtxosWithRecentBroadcasts (cache, utxos, script, expiration = DEFAULT_UTXO_INDEXING_DELAY) {
  const recentBroadcasts = await cache.get('broadcasts://recent') || []

  _filterInPlace(recentBroadcasts, tx => Date.now() - tx.time < expiration)

  // Add all utxos from our recent broadcasts for this script that aren't already there
  recentBroadcasts.forEach(tx => {
    tx.outputs.forEach(output => {
      if (output.script !== script) return
      if (utxos.some(utxo => utxo.txid === output.txid && utxo.vout === output.vout)) return
      utxos.push(output)
    })
  })

  // Remove all utxos that we know are spent because they are in our broadcast cache
  recentBroadcasts.forEach(tx => {
    utxos = utxos.filter(utxo => !tx.inputs.some(input => input.txid === utxo.txid && input.vout === utxo.vout))
  })

  return utxos
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _updateRecentBroadcasts,
  _correctServerUtxosWithRecentBroadcasts
}
