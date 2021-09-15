/**
 * run-sdk-blockchain.js
 *
 * Base class for a Blockchain implementation that automagically adds the following functionality:
 *
 *    - Log calls
 *    - Log performance in debug mode
 *    - Check the cache before making API calls
 *    - Store results inside the cache after calling
 *    - Enforce client mode
 *    - Verify the API responses
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
 *    - The cache property will be set to a Cache implementation by Run
 *    - The client property will be set to a boolean by Run
 */

const bsv = require('bsv')
const { Blockchain } = require('../kernel/api')
const RecentBroadcasts = require('../kernel/recent-broadcasts')
const { ClientModeError } = require('../kernel/error')
const Log = require('../kernel/log')
const { _text } = require('./misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const HEX_REGEX = /^([a-fA-F0-9][a-fA-F0-9])*$/

// ------------------------------------------------------------------------------------------------
// RunSDKBlockchain
// ------------------------------------------------------------------------------------------------

class RunSDKBlockchain {
  hook (cache, client) {
    if (!(this instanceof Blockchain)) throw new Error(`${this.constructor.name} does not implement Blockchain`)

    // Setup default properties we use below
    this.cache = cache || null
    this.client = client || false

    if (this.hooked) return
    else this.hooked = true

    // Save the current methods to call from our wrappers
    const originalBroadcast = this.broadcast
    const originalFetch = this.fetch
    const originalUtxos = this.utxos
    const originalSpends = this.spends
    const originalTime = this.time

    // ------------------------------------------------------------------------
    // broadcast
    // ------------------------------------------------------------------------

    this.broadcast = async (rawtx) => {
      // Allow both raw transactions and bsv transactions
      const tx = new bsv.Transaction(rawtx)
      rawtx = typeof rawtx === 'string' ? rawtx : tx.toString()

      // Basic transaction checks
      if (tx.inputs.length === 0) throw new Error('tx has no inputs')
      if (tx.outputs.length === 0) throw new Error('tx has no outputs')
      if (tx.verify() !== true) throw new Error(tx.verify())

      // Broadcast the transaction
      if (Log._infoOn) Log._info(this.constructor.name, 'Broadcast', tx.hash)
      const start = new Date()
      const txid = await originalBroadcast.call(this, rawtx)
      if (Log._debugOn) Log._debug(this.constructor.name, 'Broadcast (end): ' + (new Date() - start) + 'ms')

      // Cache the transaction
      if (this.cache) {
        const cacheSets = []

        // Store the transaction time. Allow errors if there are dups.
        const previousTime = await this.cache.get(`time://${txid}`)
        if (typeof previousTime === 'undefined') {
          const promise = this.cache.set(`time://${txid}`, Date.now())
          if (promise instanceof Promise) promise.catch(e => {})
          cacheSets.push(promise)
        }

        // Mark inputs as spent
        for (const input of tx.inputs) {
          const prevtxid = input.prevTxId.toString('hex')
          const location = `${prevtxid}_o${input.outputIndex}`
          cacheSets.push(this.cache.set(`spend://${location}`, txid))
        }

        // Cache the transaction itself
        cacheSets.push(this.cache.set(`tx://${txid}`, rawtx))

        // Update our recent broadcasts
        cacheSets.push(RecentBroadcasts._addToCache(this.cache, tx, txid))

        // Wait for all cache updates to finish
        await Promise.all(cacheSets)
      }

      return txid
    }

    // ------------------------------------------------------------------------
    // fetch
    // ------------------------------------------------------------------------

    this.fetch = async (txid) => {
    // Check the cache. In client mode, we must use the cache.
      const cachedTx = this.cache ? await this.cache.get(`tx://${txid}`) : undefined
      if (typeof cachedTx !== 'undefined') return cachedTx

      // In client mode, we do not allow fetches
      if (this.client) throw new ClientModeError(txid, 'transaction')

      // Fetch
      if (Log._infoOn) Log._info(this.constructor.name, 'Fetch', txid)
      const start = new Date()
      const rawtx = await originalFetch.call(this, txid)
      if (Log._debugOn) Log._debug(this.constructor.name, 'Fetch (end): ' + (new Date() - start) + 'ms')

      // Check the response is correct
      if (typeof rawtx !== 'string' || !rawtx.length || !HEX_REGEX.test(rawtx)) {
        throw new Error(`Invalid rawtx fetched for ${txid}: ${rawtx}`)
      }

      // Cache the transaction and its spends
      if (this.cache) {
        const cacheSets = []

        cacheSets.push(this.cache.set(`tx://${txid}`, rawtx))

        const bsvtx = new bsv.Transaction(rawtx)
        bsvtx.inputs.forEach(input => {
          const prevtxid = input.prevTxId.toString('hex')
          const location = `${prevtxid}_o${input.outputIndex}`
          cacheSets.push(this.cache.set(`spend://${location}`, txid))
        })

        await Promise.all(cacheSets)
      }

      return rawtx
    }

    // ------------------------------------------------------------------------
    // utxos
    // ------------------------------------------------------------------------

    this.utxos = async (script) => {
    // Allow the user to pass an address, or bsv objects
      if (typeof script === 'string') {
        try {
          script = bsv.Script.fromAddress(script).toHex()
        } catch (e) {
          script = new bsv.Script(script).toHex()
        }
      } else if (script instanceof bsv.Address) {
        script = bsv.Script.fromAddress(script).toHex()
      } else if (script instanceof bsv.Script) {
        script = script.toHex()
      } else {
        throw new Error(`Invalid script: ${_text(script)}`)
      }

      // Call the API
      if (Log._infoOn) Log._info(this.constructor.name, 'Utxos', script)
      const start = new Date()
      let utxos = await originalUtxos.call(this, script)
      if (Log._debugOn) Log._debug(this.constructor.name, 'Utxos (end): ' + (new Date() - start) + 'ms')

      // Check the response
      if (!Array.isArray(utxos) || utxos.some(utxo => {
        if (typeof utxo.txid !== 'string') return false
        if (utxo.txid.length !== 64) return false
        if (HEX_REGEX.test(utxo.txid)) return false
        if (typeof utxo.vout !== 'number') return false
        if (!Number.isInteger(utxo.vout)) return false
        if (utxo.vout < 0) return false
        if (typeof utxo.script !== 'string') return false
        if (!HEX_REGEX.test(utxo.script)) return false
        if (typeof utxo.satoshis !== 'number') return false
        if (!Number.isInteger(utxo.satoshis)) return false
      })) {
        throw new Error(`Received invalid utxos: ${utxos}`)
      }

      // In case the server has a bug, Run must be able to handle duplicate utxos returned. If we
      // don't dedup, then later we may create a transaction with more than one of the same input,
      // for example in Token combines.
      const locations = new Set()
      utxos = utxos.filter(utxo => {
        const location = `${utxo.txid}_o${utxo.vout}`
        if (!locations.has(location)) {
          locations.add(location)
          return true
        } else {
          if (Log._warnOn) Log._warn(this.constructor.name, 'Duplicate utxo returned from server:', location)
          return false
        }
      })

      // Correct utxos with known recent broadcasts
      if (this.cache) {
        await RecentBroadcasts._correctUtxosUsingCache(this.cache, utxos, script)
      }

      return utxos
    }

    // ------------------------------------------------------------------------
    // spends
    // ------------------------------------------------------------------------

    this.spends = async (txid, vout) => {
    // Check the cache. In client mode, we must use the cache.
      const cachedSpend = this.cache ? await this.cache.get(`spend://${txid}_o${vout}`) : undefined
      if (typeof cachedSpend !== 'undefined' || this.client) return cachedSpend

      // Call the API
      if (Log._infoOn) Log._info(this.constructor.name, `Spends ${txid}_o${vout}`)
      const start = new Date()
      const spend = await originalSpends.call(this, txid, vout)
      if (Log._debugOn) Log._debug(this.constructor.name, 'Spends (end): ' + (new Date() - start) + 'ms')

      // Check the response
      if (spend !== null && !(typeof spend === 'string' && spend.length === 64 && HEX_REGEX.test(spend))) {
        throw new Error(`Invalid spend txid fetched for ${txid}_o${vout}: ${spend}`)
      }

      // Cache the spend
      if (spend && this.cache) {
        await this.cache.set(`spend://${txid}_${vout}`, spend)
      }

      return spend
    }

    // ------------------------------------------------------------------------
    // time
    // ------------------------------------------------------------------------

    this.time = async (txid) => {
    // Check the cache. In client mode, we must use the cache.
      const cachedTime = this.cache ? await this.cache.get(`time://${txid}`) : undefined
      if (typeof cachedTime !== 'undefined' || this.client) return cachedTime

      // Call the API
      if (Log._infoOn) Log._info(this.constructor.name, 'Time', txid)
      const start = new Date()
      const time = await originalTime.call(this, txid)
      if (Log._debugOn) Log._debug(this.constructor.name, 'Time (end): ' + (new Date() - start) + 'ms')

      // Check the response
      if (typeof time !== 'number' || time < 0) throw new Error(`Invalid time fetched for ${txid}: ${time}`)

      // Cache the time
      if (this.cache) {
        await this.cache.set(`time://${txid}`, time)
      }

      return time
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RunSDKBlockchain
