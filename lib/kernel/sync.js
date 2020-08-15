/**
 * sync.js
 *
 * Syncs jigs to their latest state
 */

const { Transaction } = require('bsv')
const { _ImportLimit } = require('./import')
const { _assert, _kernel, _text, _checkState } = require('../util/misc')
const Log = require('../util/log')
const { _deepVisit } = require('../util/deep')
const { _sudo } = require('../util/admin')
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
  const Commit = require('./commit')
  const { _payload } = require('./loader')

  _assert(jig instanceof Jig || jig instanceof Code)

  // Dedup our inner syncs
  options._syncing = options._syncing || new Set()
  if (options._syncing.has(jig)) return
  options._syncing.add(jig)

  // Deploy if not deployed
  if (jig instanceof Code && _sudo(() => jig.location).undeployed) {
    Code._editor(jig)._deploy()
  }

  // Create an import limit
  options._importLimit = new _ImportLimit()

  Log._info(TAG, 'Sync', _text(jig))

  let hadPendingUpdates = false

  // Wait for pending updates
  while (true) {
    const location = _sudo(() => jig.location)
    const { error, commitid } = Bindings._location(location)
    _checkState(!error, `Cannot sync\n\n${error}`)

    if (!commitid) break

    Log._debug(TAG, `Waiting to publish ${_text(jig)}`)
    hadPendingUpdates = true
    const commit = Commit._get(commitid)
    _assert(commit)
    await commit._sync()
  }

  const kernel = _kernel()

  let location = _sudo(() => jig.location)
  let loc = Bindings._location(location)

  // Forward sync
  while (true) {
    try {
      if (hadPendingUpdates) break
      if (options.forward === false) break
      if (typeof loc.vdel !== 'undefined') break

      _assert(loc.txid && typeof loc.vout !== 'undefined')

      // TODO: REMOVE
      if (global) break

      const spendtxid = await kernel._blockchain.spends(loc.txid, loc.vout)
      if (!spendtxid) break

      Log._info(TAG, 'Forward syncing to', spendtxid)

      const rawSpendTx = await kernel._blockchain.fetch(spendtxid)
      const spendTx = new Transaction(rawSpendTx)
      const payload = _payload(spendTx)

      // Use an import to update the jig
      const _import = require('./import')
      const published = true
      const jigToSync = jig
      const commit = await _import(spendTx, payload, kernel, published, jigToSync, options._importLimit)
      // TODO: Add back?
      Commit._delete(commit)

      // Get the next location, and loop again
      location = _sudo(() => jig.location)
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

  const innerJigs = new Set()

  _sudo(() => {
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
