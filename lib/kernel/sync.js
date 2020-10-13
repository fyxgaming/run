/**
 * sync.js
 *
 * Syncs jigs to their latest state
 */

const { Transaction } = require('bsv')
const { _assert, _kernel, _text, _checkState, _Timeout } = require('../util/misc')
const Log = require('../util/log')
const { _deepVisit, _deepReplace } = require('../util/deep')
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

  // Setup the options
  options._timeout = options._timeout || new _Timeout('sync')
  options._syncing = options._syncing || new Map() // Jig -> Forward Synced

  if (Log._infoOn) Log._info(TAG, 'Sync', _text(jig))

  const start = new Date()

  // Dedup our syncs
  if (options._syncing.has(jig)) return

  // Deploy if not deployed
  if (jig instanceof Code && _sudo(() => _location(jig.location)).undeployed) {
    Code._editor(jig)._deploy()
  }

  // Update this jig to its latest state
  let waitedToPublish = false
  let publishError = null
  async function publishAndSyncForward () {
    try {
      waitedToPublish = await publishPending(jig, options)
    } catch (e) {
      // If there is an error publishing, syncing may fix so don't throw right away
      publishError = e
    }
    options._timeout._check()

    try {
      // If just published, we don't need to forward sync because its the latest
      if (!waitedToPublish) await forwardSync(jig, options)
    } catch (e) {
      publishError = publishError || e
    }
    options._timeout._check()

    return jig
  }

  const promise = publishAndSyncForward()
  options._syncing.set(jig, promise)
  options._syncing.set(_sudo(() => jig.origin), promise)
  await promise

  // Update this jig's inner jigs to their latest states
  // If we published, then we don't inner sync by default.
  try {
    await innerSync(jig, options, waitedToPublish)
  } catch (e) {
    if (!publishError) throw e
  }
  options._timeout._check()

  if (publishError) throw publishError

  if (Log._debugOn) Log._debug(TAG, 'Sync (end): ' + (new Date() - start) + 'ms')
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
    const commit = Commit._findPublishing(commitid)
    _assert(commit)

    if (Log._debugOn) Log._debug(TAG, 'Sync', commit._id)
    await commit._onPublish()

    options._timeout._check()
  }

  _kernel()._emit('sync', jig)

  return waitedToPublish
}

// ------------------------------------------------------------------------------------------------

async function forwardSync (jig, options) {
  if (options.forward === false) return

  const { _payload } = require('./loader')

  const kernel = _kernel()
  let location = _sudo(() => jig.location)
  let loc = _location(location)

  while (true) {
    options._timeout._check()

    if (typeof loc.vdel !== 'undefined') break

    _checkState(!loc.recordid, `Cannot sync ${_text(jig)}: transaction in progress`)

    _assert(loc.txid && typeof loc.vout !== 'undefined')

    const spendtxid = await kernel._blockchainAPI().spends(loc.txid, loc.vout)
    if (!spendtxid) break
    options._timeout._check()

    if (Log._infoOn) Log._info(TAG, 'Forward syncing to', spendtxid)

    const rawSpendTx = await kernel._blockchainAPI().fetch(spendtxid)
    options._timeout._check()
    const spendtx = new Transaction(rawSpendTx)
    let payload = null

    // If payload throws, the transaction is invalid, but we don't break the jig or fail.
    try {
      payload = _payload(spendtx)
    } catch (e) {
      if (Log._errorOn) Log._error(TAG, e)
      break
    }

    // Use a replay to update the jig
    const _replay = require('./replay')
    const published = true
    const jigToSync = jig
    const preverify = false
    await _replay(spendtx, spendtxid, payload, kernel, published, jigToSync, options._timeout, preverify)
    options._timeout._check()

    // Get the next location, and loop again
    location = _sudo(() => jig.location)
    loc = _location(location)
  }

  kernel._emit('sync', jig)
}

// ------------------------------------------------------------------------------------------------

async function innerSync (jig, options, published) {
  // Don't inner sync if we published and the user didn't explicitely ask to sync inner.
  // This is because the most common sync after an update is to just publish that update.
  if (options.inner === false) return
  if (typeof options.inner === 'undefined' && published) return

  if (Log._debugOn) Log._debug(TAG, 'Inner sync')

  const Jig = require('./jig')
  const Code = require('./code')

  // Get all inner jigs
  const innerJigs = new Set()
  _deepVisit(jig, x => {
    // Recurse into the current jig
    if (x === jig) return true

    // Dont recurse into inner jigs because they will be synced
    if (x instanceof Jig || x instanceof Code) {
      innerJigs.add(x)
      return false
    }
  })

  const syncs = []
  const dedups = new Map()

  // Sync all inner jigs
  for (const innerJig of innerJigs) {
    const prev = options._syncing.get(innerJig) || options._syncing.get(_sudo(() => innerJig.origin))
    if (options.forward !== false && prev) {
      dedups.set(innerJig, prev)
    } else {
      syncs.push(innerJig.sync(options))
    }
  }

  // Wait for all inner syncs to finish
  await Promise.all(syncs)
  for (const key of dedups.keys()) { dedups.set(key, await dedups.get(key)) }
  options._timeout._check()

  // When we are syncing forward inner jigs, replace them with ones already synced
  if (options.forward !== false) _sudo(() => _deepReplace(jig, x => dedups.get(x)))
}

// ------------------------------------------------------------------------------------------------

module.exports = _sync
