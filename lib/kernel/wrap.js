/**
 * wrap.js
 *
 * Wrapping around API implementations to improve usability. These modify the actual API objects
 * because users will often call their methods directly and want this behavior externally.
 */

const bsv = require('bsv')
const { Blockchain, State, Cache, Purse, Owner } = require('./api')
const Log = require('./log')
const { ClientModeError } = require('./error')
const RecentBroadcasts = require('./recent-broadcasts')
const { _text } = require('./misc')

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
    // Allow both raw transactions and bsv transactions
    const tx = new bsv.Transaction(rawtx)
    rawtx = typeof rawtx === 'string' ? rawtx : tx.toString()

    // Basic transaction checks
    if (tx.inputs.length === 0) throw new Error('tx has no inputs')
    if (tx.outputs.length === 0) throw new Error('tx has no outputs')
    if (tx.verify() !== true) throw new Error(tx.verify())

    // Broadcast the transaction
    if (Log._infoOn) Log._info('Blockchain', 'Broadcast', tx.hash)
    const start = new Date()
    const txid = await api.$wrapper.broadcast.call(api, rawtx)
    if (Log._debugOn) Log._debug('Blockchain', 'Broadcast (end): ' + (new Date() - start) + 'ms')

    // Cache the transaction
    const cache = api.$wrapper.cache
    if (cache) {
      const cacheSets = []

      // Store the transaction time. Allow errors if there are dups.
      const previousTime = await cache.get(`time://${txid}`)
      if (typeof previousTime === 'undefined') {
        const promise = cache.set(`time://${txid}`, Date.now())
        if (promise instanceof Promise) promise.catch(e => {})
        cacheSets.push(promise)
      }

      // Mark inputs as spent
      for (const input of tx.inputs) {
        const prevtxid = input.prevTxId.toString('hex')
        const location = `${prevtxid}_o${input.outputIndex}`
        cacheSets.push(cache.set(`spend://${location}`, txid))
      }

      // Cache the transaction itself
      cacheSets.push(cache.set(`tx://${txid}`, rawtx))

      // Update our recent broadcasts
      cacheSets.push(RecentBroadcasts._addToCache(cache, tx, txid))

      // Wait for all cache updates to finish
      await Promise.all(cacheSets)
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
    // Allow the user to pass an address, or bsv objects
    if (typeof script === 'string') {
      try {
        return bsv.Script.fromAddress(script).toHex()
      } catch (e) {
        return new bsv.Script(script).toHex()
      }
    } else if (script instanceof bsv.Address) {
      script = bsv.Script.fromAddress(script).toHex()
    } else if (script instanceof bsv.Script) {
      return script.toHex()
    } else {
      throw new Error(`Invalid script: ${_text(script)}`)
    }

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
