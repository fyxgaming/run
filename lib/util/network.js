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

module.exports = { _dedupRequest, _cacheResponse, _dedupUtxos }
