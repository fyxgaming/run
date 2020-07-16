/**
 * sync.js
 *
 * Syncs jigs to their latest state
 */

const { Transaction } = require('bsv')
const { _ImportLimit } = require('./import')
const { _assert, _kernel, _text } = require('../util/misc')
const Log = require('../util/log')
const { _deepVisit } = require('../util/deep')
const Bindings = require('../util/bindings')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Sync'

// ------------------------------------------------------------------------------------------------
// _sync
// ------------------------------------------------------------------------------------------------

async function _sync (jig, options = {}) {
  const Jig = require('./jig')
  const Code = require('./code')
  const Membrane = require('./membrane')
  const File = require('./file')
  const Record = require('./record')

  _assert(jig instanceof Jig || jig instanceof Code)

  // Dedup our inner syncs
  options._synced = options._synced || new Set()
  if (options._synced.has(jig)) return
  options._synced.add(jig)

  // Deploy if not deployed
  if (jig instanceof Code) {
    const file = File._find(jig)
    file._deploy()
  }

  // Create an import limit
  options._importLimit = new _ImportLimit()

  Log._info(TAG, 'Sync', _text(jig))

  _assert(!File._find(jig)._native, 'Native code cannot be synced')

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
    try {
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
      const _import = require('./import')
      const record = await _import(spendTx, payload, true /* published */, jig /* jigToSync */, options._importLimit)
      Record._delete(record)

      // Get the next location, and loop again
      location = Membrane._sudo(() => jig.location)
      loc = Bindings._location(location)
    } catch (e) {
      Log._warn(TAG, 'Cannot forward sync:', e)
      break
    }
  }

  if (options.inner !== false) {
    Log._debug(TAG, 'Inner sync')

    const promises = innerJigs(jig).map(jig => jig.sync(options))

    await Promise.all(promises)
  }
}

// ------------------------------------------------------------------------------------------------

function innerJigs (jig) {
  const Jig = require('./jig')
  const Code = require('./code')
  const Membrane = require('./membrane')

  const innerJigs = new Set()

  Membrane._sudo(() => {
    _deepVisit(jig, x => {
      if (x === jig) {
        // Recurse into the current jig
        return true
      }

      if (x instanceof Jig || x instanceof Code) {
        innerJigs.add(x)

        // Dont recurse into inner jigs because they will be synced
        return false
      }
    })
  })

  return Array.from(innerJigs)
}

// ------------------------------------------------------------------------------------------------

module.exports = _sync
