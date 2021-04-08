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
// _dedupRequests
// ------------------------------------------------------------------------------------------------

/**
 * Dedups async tasks that return the same value
 * @param {object} cache Cache to store duplicate task
 * @param {string} key String that uniquely identifies this task
 * @param {function} request Async function to perform the task
 */
async function _dedupRequest (cache, key, request) {
  const prev = cache[key]

  if (prev) {
    return new Promise((resolve, reject) => prev.push({ resolve, reject }))
  }

  const promises = cache[key] = []

  try {
    const result = await request()

    promises.forEach(x => x.resolve(result))

    return result
  } catch (e) {
    promises.forEach(x => x.reject(e))

    throw e
  } finally {
    delete cache[key]
  }
}

// ------------------------------------------------------------------------------------------------
// _cache
// ------------------------------------------------------------------------------------------------

/**
 * Caches the result or error of an async task for a period of time
 * @param {*} cache Cache to store results
 * @param {*} key String that uniquely identifies this task
 * @param {*} ms Milliseconds to cache the result
 * @param {*} request Async function to perform the task
 */
async function _cacheResponse (cache, key, ms, request) {
  const now = Date.now()
  const prev = cache[key]

  for (const cachedKey of Object.keys(cache)) {
    if (now > cache[cachedKey].expiration) {
      delete cache[cachedKey]
    }
  }

  if (prev && now < prev.expiration) {
    if (prev.error) throw prev.error
    return prev.result
  }

  try {
    const result = await request()
    cache[key] = { expiration: now + ms, result }
    return result
  } catch (error) {
    cache[key] = { expiration: now + ms, error }
    throw error
  }
}

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
function _addToBroadcastCache (broadcastCache, txid, expiration) {
  // Remove expired txs
  const now = Date.now()
  broadcastCache = broadcastCache.filter(x => now - x.time < expiration)

  // Add new tx
  broadcastCache.push({ txid, time: Date.now() })

  // Return updated cache
  return broadcastCache
}

// ------------------------------------------------------------------------------------------------
// __updateUtxosWithBroadcasts
// ------------------------------------------------------------------------------------------------

async function _updateUtxosWithBroadcasts (broadcastCache, utxos, bsvScript) {
  /*
  // Remove expired
  this._broadcasts.filter(([tx]) => Date.now() - tx.time < this._indexingDelay)

  // Add all utxos from our broadcast cache for this script that aren't already there
  this._broadcasts.forEach(([tx, txid]) => {
    tx.outputs.forEach((output, vout) => {
      if (output.script.equals(bsvScript) && !utxos.some(utxo => utxo.txid === txid && utxo.vout === vout)) {
        utxos.push({ txid, vout, script: output.script, satoshis: output.satoshis })
      }
    })
  })

  // Remove all utxos that we know are spent because they are in our broadcast cache
  this._broadcasts.forEach(([tx]) => {
    const inputSpendsUtxo = (input, utxo) =>
      input.prevTxId.toString('hex') === utxo.txid &&
    input.outputIndex === utxo.vout

    utxos = utxos.filter(utxo => !tx.inputs.some(input => inputSpendsUtxo(input, utxo)))
  })

  // Remove all utxos that we know are spent because we spent and cached them
  const locations = utxos.map(utxo => utxo.txid + '_o' + utxo.vout)
  const promises = locations.map(location => this.cache.get('spend://' + location))
  const spends = await Promise.all(promises)
  utxos = utxos.filter((utxo, n) => !spends[n])
  */

  return utxos
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _dedupRequest,
  _cacheResponse,
  _dedupUtxos,
  _addToBroadcastCache,
  _updateUtxosWithBroadcasts
}
