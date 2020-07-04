/**
 * syncer.js
 *
 * Syncs jigs to their latest state
 */

const { Transaction } = require('./bsv')
const { _ImportLimit } = require('./importer')
const { _assert, _kernel, _text } = require('./misc')
const Log = require('./log')
const { _deepVisit } = require('./deep')
const Bindings = require('./bindings')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Syncer'

// ------------------------------------------------------------------------------------------------
// _sync
// ------------------------------------------------------------------------------------------------

async function _sync (jig, options = {}) {
  const Jig = require('./jig')
  const Code = require('./code')
  const Membrane = require('./membrane')
  const Repository = require('./repository')
  const Record = require('./record')

  _assert(jig instanceof Jig || jig instanceof Code)

  // Dedup our inner syncs
  options._synced = options._synced || new Set()
  if (options._synced.has(jig)) return
  options._synced.add(jig)

  // Deploy if not deployed
  if (jig instanceof Code) {
    await Repository._deploy(jig)
  }

  // Create an import limit
  options._importLimit = new _ImportLimit()

  Log._info(TAG, 'Sync', _text(jig))

  _assert(!Repository._isNative(jig), 'Native code may not be synced')

  let hadPendingUpdates = false

  // Wait for pending updates
  while (true) {
    const location = Membrane._sudo(() => jig.location)
    const { error, record } = Bindings._location(location)
    if (error) throw new Error(`Cannot sync.\n\n${error}`)

    Log._debug(TAG, 'Waiting for pending')

    if (!record) break

    hadPendingUpdates = true
    await Record._get(record)._sync()
  }

  const kernel = _kernel()

  let location = Membrane._sudo(() => jig.location)
  let loc = Bindings._location(location)

  // Forward sync
  while (true) {
    if (hadPendingUpdates) break
    if (options.forward === false) break
    if (typeof loc.vdel !== 'undefined') break

    _assert(loc.txid && typeof loc.vout !== 'undefined')

    const spendTxId = await kernel._blockchain.spends(loc.txid, loc.vout)
    if (!spendTxId) break

    Log._info(TAG, 'Forward syncing to', spendTxId)

    const rawSpendTx = await kernel._blockchain.fetch(spendTxId)
    const spendTx = new Transaction(rawSpendTx)
    const payload = Record._payload(spendTx)

    // Use an import to update the jig
    const { _import } = require('./importer')
    const record = await _import(spendTx, payload, true /* published */, jig /* jigToSync */, options._importLimit)
    Record._delete(record)

    // Get the next location, and loop again
    location = Membrane._sudo(() => jig.location)
    loc = Bindings._location(location)

    break
  }

  if (options.inner !== false) {
    Log._debug(TAG, 'Inner sync')

    const promises = []

    _deepVisit(jig, x => {
      if (x instanceof Jig || x instanceof Code) {
        const promise = x.sync(options)
        promises.push(promise)
        return false
      }
    })

    await Promise.all(promises)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { _sync }
