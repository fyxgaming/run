/**
 * sync.js
 *
 * Syncs jigs to their latest state
 */

const { Transaction } = require('bsv')
const { _assert, _kernel, _text, _checkState, _Timeout } = require('../util/misc')
const Log = require('../util/log')
const { _deepVisit } = require('../util/deep')
const { _sudo } = require('../util/admin')
const { _location } = require('../util/bindings')

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

  const Transaction = require('./transaction')
  _checkState(!Transaction._ATOMICALLY_UPDATING, 'sync disabled in atomic transaction')

  _assert(jig instanceof Jig || jig instanceof Code)

  options._timeout = options._timeout || new _Timeout('sync')

  // Dedup our inner syncs
  options._syncing = options._syncing || new Set()
  if (options._syncing.has(jig)) return
  options._syncing.add(jig)

  // Deploy if not deployed
  if (jig instanceof Code && _sudo(() => _location(jig.location)).undeployed) {
    Code._editor(jig)._deploy()
  }

  if (Log._infoOn) Log._info(TAG, 'Sync', _text(jig))

  let waitedToPublish = false
  try {
    waitedToPublish = await publishPending(jig, options)
    options._timeout._check()
  } catch (e) {
    // If there is an error publishing, syncing may fix so we do that here
    try {
      await forwardSync(jig, options)
      options._timeout._check()

      await innerSync(jig, options)
      options._timeout._check()
    } catch (e2) { } // Swallow these errors since we'll throw e
    throw e
  }

  // If just published, we don't need to forward sync because its the latest
  if (!waitedToPublish) await forwardSync(jig, options)
  options._timeout._check()

  await innerSync(jig, options)
}

// ------------------------------------------------------------------------------------------------

async function publishPending (jig, options) {
  const Commit = require('./commit')
  let waitedToPublish = false

  while (true) {
    const location = _sudo(() => jig.location)
    const { error, commitid } = _location(location)
    _checkState(!error, `Cannot sync\n\n${error}`)

    if (!commitid) break

    if (Log._debugOn) Log._debug(TAG, `Waiting to publish ${_text(jig)}`)
    waitedToPublish = true
    const commit = Commit._get(commitid)
    _assert(commit)
    await commit._sync()
    options._timeout._check()
  }

  _kernel()._emit('sync', jig)

  return waitedToPublish
}

// ------------------------------------------------------------------------------------------------

async function forwardSync (jig, options) {
  const { _payload } = require('./loader')

  if (options.forward === false) return

  const kernel = _kernel()
  let location = _sudo(() => jig.location)
  let loc = _location(location)

  while (true) {
    options._timeout._check()

    if (typeof loc.vdel !== 'undefined') break

    _checkState(!loc.recordid, `Cannot sync ${_text(jig)}: transaction in progress`)

    _assert(loc.txid && typeof loc.vout !== 'undefined')

    const spendtxid = await kernel._blockchain.spends(loc.txid, loc.vout)
    if (!spendtxid) break
    options._timeout._check()

    if (Log._infoOn) Log._info(TAG, 'Forward syncing to', spendtxid)

    const rawSpendTx = await kernel._blockchain.fetch(spendtxid)
    options._timeout._check()
    const spendTx = new Transaction(rawSpendTx)
    let payload = null

    // If payload throws, the transaction is invalid, but we don't break the jig or fail.
    try {
      payload = _payload(spendTx)
    } catch (e) {
      if (Log._errorOn) Log._error(TAG, e)
      break
    }

    // Use an import to update the jig
    const _import = require('./import')
    const published = true
    const jigToSync = jig
    await _import(spendTx, payload, kernel, published, jigToSync, options._timeout)
    options._timeout._check()

    // Get the next location, and loop again
    location = _sudo(() => jig.location)
    loc = _location(location)
  }

  kernel._emit('sync', jig)
}

// ------------------------------------------------------------------------------------------------

async function innerSync (jig, options) {
  if (options.inner === false) return

  if (Log._debugOn) Log._debug(TAG, 'Inner sync')

  const promises = innerJigs(jig).map(jig => jig.sync(options))
  await Promise.all(promises)
  options._timeout._check()
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
