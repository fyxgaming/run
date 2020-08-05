/**
 * import.js
 *
 * Imports a transaction into a live record
 */

const { _kernel, _checkState, _hasJig } = require('../util/misc')
const Log = require('../util/log')
const Membrane = require('./membrane')
const Loader = require('./loader')
const Record = require('./record')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Import'

// ------------------------------------------------------------------------------------------------
// _ImportLimit
// ------------------------------------------------------------------------------------------------

/**
 * Counts and restricts the number of inner imports
 */
class _ImportLimit {
  constructor (kernel = _kernel()) {
    this._limit = kernel._importLimit
  }

  _consume () {
    _checkState(this._limit--, 'Import limit reached')
  }
}

// ------------------------------------------------------------------------------------------------
// _import
// ------------------------------------------------------------------------------------------------

/**
 * Creates a record by replaying a transaction. The returned record must be published
 */
async function _import (tx, payload, kernel, published, jigToSync, importLimit) {
  const Jig = require('./jig')
  const Code = require('./code')

  Log._info(TAG, 'Import', tx.hash)

  // Consume one import. Yum.
  importLimit = importLimit || new _ImportLimit(kernel)
  importLimit._consume()

  // Get the location of the jig to sync so that we can replace it
  const jigToSyncLocation = jigToSync ? Membrane._sudo(() => jigToSync.location) : null

  try {
    const inputs = []
    const refs = []

    // Load inputs
    for (let vin = 0; vin < payload.in; vin++) {
      const input = tx.inputs[vin]
      const txid = input.prevTxId.toString('hex')
      const vout = input.outputIndex
      const location = `${txid}_o${vout}`
      const loader = new Loader(kernel, importLimit)
      const jig = jigToSyncLocation === location ? jigToSync : await loader._load(location)
      inputs.push(jig)
    }

    // Load refs
    for (let vref = 0; vref < payload.ref.length; vref++) {
      const location = payload.ref[vref]
      const loader = new Loader(kernel, importLimit)
      const jig = await loader._load(location)
      refs.push(jig)
    }

    // Make sure that no refs are found in inputs
    _checkState(!inputs.some(jig => _hasJig(refs, jig)), 'Illegal reference')

    // Update the references for each incoming jig with other incoming jigs
    const incoming = inputs.concat(refs)
    incoming.forEach(jig => updateInnerRefs(jig, incoming, jigToSync))

    // Create a new record to replay this import
    const record = new Record()
    record._autocommit = false

    CURRENT_RECORD._verify(tx, payload)

    // Replace the old record with the new record
    const savedRecord = Record._CURRENT_RECORD
    Record._CURRENT_RECORD = CURRENT_RECORD

    try {
      // Spend each input by updating it and read each ref
      inputs.forEach(jig => record._update(jig))
      refs.forEach(jig => record._read(jig))

      // Execute each command
      // TODO

      // Create a commit

      // Assign owners to new creates

      console.log('-----------')
    } finally {
      // Probably not needed, but roll back the current record anyway
      CURRENT_RECORD._rollback()

      // Restore the previous record
      Record._CURRENT_RECORD = savedRecord
    }

    // Record

    /*

    // Lock in the initial state of the record. Each action will add to it.
    record._commit()

    // Run each command
    for (const x of payload.cmds) {
      const { cmd, data } = x
      _checkState(Object.keys(x).length === 2, 'Invalid cmds')
      _checkState(Array.isArray(data), 'Invalid data')
      execute(record, cmd, data)
    }
    const Unbound = require('../util/unbound')

    // Inflate and assign owners to new creates
    _checkState(record._creates.length === payload.lock.length, 'Invalid locks')
    const codec = new Codec()._loadJigs(x => record._jigs[x])
    const owners = payload.lock.map(lock => codec._decode(lock))
    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i]
      const jig = record._creates[i]
      const ssafter = record._after.get(jig)
      ssafter._props.owner = new Unbound(owner)
    }

    // ----
    // const commit = CURRENT_RECORD._commit()
    //
    // commit._verify(tx)
    // ----

    // import ... replay ... verify ... store record, allow changes

    // Recreate the tx
    await record._buildPartialTx()

    // Print debug info
    record._printDebugInfo()

    // Compare tx
    _checkState(JSON.stringify(payload) === JSON.stringify(record._payload), 'Payload mismatch')

    // Make sure the inputs match
    for (let i = 0; i < payload.in; i++) {
      const txin1 = tx.inputs[i]
      const txin2 = record._tx.inputs[i]
      const prevtxid1 = txin1.prevTxId.toString('hex')
      const prevtxid2 = txin2.prevTxId.toString('hex')
      _checkState(prevtxid1 === prevtxid2, `Txid mismatch on input ${i}`)
      _checkState(txin1.outputIndex === txin2.outputIndex, `Vout mismatch on input ${i}`)
    }

    // Make sure the outputs match
    for (let i = 1; i <= payload.out.length; i++) {
      const txout1 = tx.outputs[i]
      const txout2 = record._tx.outputs[i]
      const script1 = txout1.script.toString('hex')
      const script2 = txout2.script.toString('hex')
      _checkState(script1 === script2, `Script mismatch on output ${i}`)
      _checkState(txout1.satoshis === txout2.satoshis, `Satoshis mismatch on output ${i}`)
    }

    // By setting tx, we are skipping the build tx part of publish
    record._tx = tx

    // For published transactions, we can finalize them
    if (published) {
      record._markPublished()
      await record._finalizeJigs()
    }
    */
  } catch (e) {
    // record._rollback(e)
    // throw e
  }

  // return record
}

// ------------------------------------------------------------------------------------------------

/**
 * Updates a jigs references to be at the same state as other jigs
 *
 * At the start of an import, all inputs and references need to be updated with each other.
 */
function updateInnerRefs (jig, incoming, jigToSync) {
  Membrane._sudo(() => _deepReplace(jig, x => {
    // Don't replace ourself
    if (x === jig) return

    // Don't ever replace the jig we're syncing either
    if (x === jigToSync) return

    // If not a jig or code, nothing to replace
    if (!(x instanceof Jig || x instanceof Code)) return

    // Find the existing jig we might replace it with
    const y = incoming.find(y => y.origin === x.origin)

    // If there is no existing jig, then nothing to do
    if (!y) return

    // Make sure we only sync forward for jigs other than the one we're syncing.
    // For the jig we're syncing, we may need to undo a prior sync.
    if (jig !== jigToSync) {
      _checkState(y.nonce >= x.nonce, 'Illegal reference due to time travel')
    }

    // Looks like this jig is a good replacement. Return it.
    return y
  }))
}

// ------------------------------------------------------------------------------------------------

_import._ImportLimit = _ImportLimit

module.exports = _import
