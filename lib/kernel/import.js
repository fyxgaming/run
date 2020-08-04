/**
 * import.js
 *
 * Imports a transaction into a live record
 */

const Record = require('./commit')
const { _kernel, _checkState } = require('../util/misc')
const Log = require('../util/log')
const Codec = require('../util/codec')
const { _deepReplace } = require('../util/deep')
const Membrane = require('./membrane')
const execute = require('./execute')
const Loader = require('./loader')

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
  constructor () {
    this._limit = _kernel()._importLimit
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
async function _import (tx, payload, published = false, jigToSync = null,
  importLimit = new _ImportLimit()) {
  Log._info(TAG, 'Import', tx.hash)

  // Consume an import limit
  importLimit._consume()

  // Create a new record that we will replay the transactions into
  const record = new Record()
  record._importLimit = importLimit
  const kernel = _kernel()

  // If there is a jig to sync, put it into the state for the beginning of the transaction
  const jigToSyncLocation = jigToSync ? Membrane._sudo(() => jigToSync.location) : null

  try {
    // Spend each input by authing it
    for (let vin = 0; vin < payload.in; vin++) {
      const input = tx.inputs[vin]
      const txid = input.prevTxId.toString('hex')
      const vout = input.outputIndex
      const location = `${txid}_o${vout}`
      const loader = new Loader(kernel, importLimit)
      const jig = jigToSyncLocation === location ? jigToSync : await loader._load(location)

      record._auth(jig)
    }

    // Read each ref
    for (let vref = 0; vref < payload.ref.length; vref++) {
      const location = payload.ref[vref]
      const loader = new Loader(kernel, importLimit)
      const jig = await loader._load(location)

      record._read(jig)
    }

    // Put all referenced jig to sync into the ref and spend jigs
    const updateInnerRefs = jig => {
      const Jig = require('./jig')
      const Code = require('./code')

      const replaceInnerRefs = x => {
        if (jig === x) return
        if (!(x instanceof Jig || x instanceof Code)) return
        const origin = Membrane._sudo(() => x.origin)
        const nonce = Membrane._sudo(() => x.nonce)
        const existing = record._jigs.find(y => Membrane._sudo(() => y.origin) === origin)
        if (!existing) return
        if (!jigToSync || !(jig instanceof jigToSync)) {
          // Make sure we only sync forward
          const existingNonce = Membrane._sudo(() => existing.nonce)
          _checkState(existingNonce >= nonce, 'Illegal reference due to time travel')
        }
        return existing
      }

      Membrane._sudo(() => {
        _deepReplace(jig, replaceInnerRefs)
        _deepReplace(record._before.get(jig), replaceInnerRefs)
      })
    }

    // Put each spend and each read into consistent states
    record._spends.forEach(jig => updateInnerRefs(jig))
    record._reads.forEach(jig => updateInnerRefs(jig))

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
  } catch (e) {
    record._rollback(e)
    throw e
  }

  return record
}

// ------------------------------------------------------------------------------------------------

_import._ImportLimit = _ImportLimit

module.exports = _import
