/**
 * wrap.js
 *
 * Wrapping around API implementations to improve usability. These modify the actual API objects
 * because users will often call their methods directly and want this behavior externally.
 */

const { Blockchain, State, Cache, Purse, Owner } = require('./api')
const Log = require('./log')
const { ClientModeError } = require('./error')
const bsv = require('bsv')

// ------------------------------------------------------------------------------------------------
// _wrap
// ------------------------------------------------------------------------------------------------

/**
 * Wraps an API implementation, acquiring a $wrapper property
 */
function _wrap (api) {
  if (api.$wrapper) return

  api.$wrapper = {}

  if (api instanceof Blockchain) {
    _wrapBlockchain(api)
  }
}

// ------------------------------------------------------------------------------------------------
// _wrapBlockchain
// ------------------------------------------------------------------------------------------------

/**
 * Modifies a Blockchain API implementation to:
 *
 *    - Log calls
 *    - Log performance in debug mode
 *    - Check the cache before making API calls
 *    - Store results inside the cache after calling
 *    - Enforce client mode
 *    - Cache recently broadcasted transactions
 *    - Update UTXO results with recently-broadcasted transactions
 *    - Dedup UTXO results (with a warning)
 *    - Allow passing a bsv Transaction object into broadcast()
 *    - Allow passing an address into utxos()
 *
 * This allows the implementation to just focus on making API calls.
 *
 * Other notes
 *
 *    - The api.$wrapper.cache property should usually be set to a Cache implementation after
 *    - The api.$wrapper.client property may be set to a boolean to enable/disable client mode
 */
function _wrapBlockchain (api) {
  // Save the current functions to call from our wrappers and also restore if we unwrap
  api.$wrapper.broadcast = api.broadcast
  api.$wrapper.fetch = api.fetch
  api.$wrapper.utxos = api.utxos
  api.$wrapper.spends = api.spends
  api.$wrapper.time = api.time

  // Wrap broadcast()
  api.broadcast = async (rawtx) => {
    // If user passed in a bsv tx object, convert it to a rawtx
    if (rawtx instanceof bsv.Transaction) rawtx = rawtx.toString()

    if (Log._infoOn) Log._info('Blockchain', 'Broadcast', new bsv.Transaction(rawtx).hash)

    const start = new Date()

    const txid = await api.$wrapper.broadcast.call(api, rawtx)

    if (Log._debugOn) Log._debug('Blockchain', 'Broadcast (end): ' + (new Date() - start) + 'ms')

    if (api.$wrapper.cache) {
      await api.$wrapper.cache.set(`tx://${txid}`, rawtx)
    }

    return txid
  }

  // Wrap fetch()
  api.fetch = async (txid) => {
    if (Log._infoOn) Log._info('Blockchain', 'Fetch', txid)

    // In client mode, API calls are not allowed for fetches and must come form the cache
    if (api.$wrapper.client) {
      const rawtx = await api.$wrapper.cache.get(`tx://${txid}`)
      if (!rawtx) throw new ClientModeError(txid, 'transaction')
      return rawtx
    }

    const start = new Date()

    const rawtx = await api.$wrapper.fetch.call(api, txid)

    if (Log._debugOn) Log._debug('Blockchain', 'Fetch (end): ' + (new Date() - start) + 'ms')

    return rawtx
  }

  // Wrap utxos()
  api.utxos = async (script) => {
    if (Log._infoOn) Log._info('Blockchain', 'Utxos', script)

    const start = new Date()

    const utxos = await api.$wrapper.utxos.call(api, script)

    if (Log._debugOn) Log._debug('Blockchain', 'Utxos (end): ' + (new Date() - start) + 'ms')

    return utxos
  }

  // Wrap spends()
  api.spends = async (txid, vout) => {
    if (Log._infoOn) Log._info('Blockchain', `Spends ${txid}_o${vout}`)

    // In client mode, a spends() API call is not allowed and must come from the cache.
    if (api.$wrapper.client) {
      if (api.$wrapper.cache) {
        return await api.$wrapper.cache.get(`spend://${txid}_o${vout}`)
      } else {
        return undefined
      }
    }

    const start = new Date()

    const spend = await api.$wrapper.spends.call(api, txid, vout)

    if (Log._debugOn) Log._debug('Blockchain', 'Spends (end): ' + (new Date() - start) + 'ms')

    return spend
  }

  // Wrap time
  api.time = async (txid) => {
    if (Log._infoOn) Log._info('Blockchain', 'Time', txid)

    // In client mode, a time() API call is not allowed and must come from the cache.
    if (api.$wrapper.client) {
      if (api.$wrapper.cache) {
        return await api.$wrapper.cache.get(`time://${txid}`)
      } else {
        return undefined
      }
    }

    const start = new Date()

    const time = await api.$wrapper.time.call(api, txid)

    if (Log._debugOn) Log._debug('Blockchain', 'Time (end): ' + (new Date() - start) + 'ms')

    return time
  }
}

// ------------------------------------------------------------------------------------------------
// _unwrap
// ------------------------------------------------------------------------------------------------

function _unwrap (api) {
  if (!api.$wrapper) return

  if (api instanceof Blockchain) {
    api.broadcast = api.$wrapper.broadcast
    api.fetch = api.$wrapper.fetch
    api.utxos = api.$wrapper.utxos
    api.spends = api.$wrapper.spends
    api.time = api.$wrapper.time
  }

  if (api instanceof State) {
    api.state = api.$wrapper.state
  }

  if (api instanceof Cache) {
    api.get = api.$wrapper.get
    api.set = api.$wrapper.set
  }

  if (api instanceof Purse) {
    api.pay = api.$wrapper.pay
    api.broadcast = api.$wrapper.broadcast
  }

  if (api instanceof Owner) {
    api.sign = api.$wrapper.sign
    api.nextOwner = api.$wrapper.nextOwner
  }

  delete api.$wrapper
}

// ------------------------------------------------------------------------------------------------

module.exports = { _wrap, _unwrap }
