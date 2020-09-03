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

  Log._info(TAG, 'Sync', _text(jig))

  let waitedToPublish = false

  // Wait for pending publishes to finish
  while (true) {
    const location = _sudo(() => jig.location)
    const { error, commitid } = Bindings._location(location)
    _checkState(!error, `Cannot sync\n\n${error}`)

    if (!commitid) break

    Log._debug(TAG, `Waiting to publish ${_text(jig)}`)
    waitedToPublish = true
    const commit = Commit._get(commitid)
    _assert(commit)
    await commit._sync()
  }

  // Create a new import limit for forward syncing
  options._importLimit = options._importLimit || new _ImportLimit()

  const kernel = _kernel()
  let location = _sudo(() => jig.location)
  let loc = Bindings._location(location)

  // Forward sync
  while (true) {
    if (waitedToPublish) break
    if (options.forward === false) break
    if (typeof loc.vdel !== 'undefined') break

    _assert(loc.txid && typeof loc.vout !== 'undefined')

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
    await _import(spendTx, payload, kernel, published, jigToSync, options._importLimit)

    // Get the next location, and loop again
    location = _sudo(() => jig.location)
    loc = Bindings._location(location)
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
