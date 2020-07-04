/**
 * import.js
 *
 * Imports a transaction into a record
 */

const Record = require('./record')
const { _assert, _kernel } = require('./misc')
const Log = require('./log')
const Codec = require('./codec')
const { _deepReplace } = require('./deep')
const Membrane = require('./membrane')
const Sandbox = require('./sandbox')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Importer'

// ------------------------------------------------------------------------------------------------
// ImportLimit
// ------------------------------------------------------------------------------------------------

class _ImportLimit {
  constructor () { this._limit = _kernel()._importLimit }
  _consume () { _assert(this._limit--, 'Import limit reached') }
}

// ------------------------------------------------------------------------------------------------
// import
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
    // Spend each input
    for (let vin = 0; vin < payload.in; vin++) {
      const input = tx.inputs[vin]
      const txid = input.prevTxId.toString('hex')
      const vout = input.outputIndex
      const location = `${txid}_o${vout}`
      const jig = jigToSyncLocation === location ? jigToSync
        : await kernel._loader._load(location, { _importLimit: importLimit })

      record._spend(jig)
    }

    // Read each ref
    for (let vref = 0; vref < payload.ref.length; vref++) {
      const location = record.ref[vref]
      const jig = await kernel._loader._load(location, { _importLimit: importLimit })

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
          _assert(existingNonce >= nonce, 'Illegal reference due to time travel')
        }
        return existing
      }

      _deepReplace(jig, replaceInnerRefs)
      _deepReplace(record._before.get(jig), replaceInnerRefs)
    }

    // Put each spend and each read into consistent states
    record._spends.forEach(jig => updateInnerRefs(jig))
    record._reads.forEach(jig => updateInnerRefs(jig))

    // Lock in the initial state of the record. Each action will add to it.
    record._commit()

    // Run each command
    for (const x of payload.exec) {
      const { cmd, data } = x
      execute(record, cmd, data)
    }
    const Unbound = require('./unbound')

    // Inflate and assign owners to new creates
    _assert(record._creates.length === payload.lock.length, 'Invalid locks')
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
    _assert(JSON.stringify(payload) === JSON.stringify(record._payload), 'Payload mismatch')

    // Make sure the inputs match
    for (let i = 0; i < payload.in; i++) {
      const txin1 = tx.inputs[i]
      const txin2 = record._tx.inputs[i]
      const prevtxid1 = txin1.prevTxId.toString('hex')
      const prevtxid2 = txin2.prevTxId.toString('hex')
      _assert(prevtxid1 === prevtxid2, `PrevTxId mismatch on input ${i}`)
      _assert(txin1.outputIndex === txin2.outputIndex, `Vout mismatch on input ${i}`)
    }

    // Make sure the outputs match
    for (let i = 1; i <= payload.out.length; i++) {
      const txout1 = tx.outputs[i]
      const txout2 = record._tx.outputs[i]
      const script1 = txout1.script.toString('hex')
      const script2 = txout2.script.toString('hex')
      _assert(script1 === script2, `Script mismatch on output ${i}`)
      _assert(txout1.satoshis === txout2.satoshis, `Satoshis mismatch on output ${i}`)
    }

    // By setting tx, we are skipping the build tx part of publish
    record._tx = tx

    // For published transactions, we can finalize them
    if (published) {
      record._markPublished()
      await record._finalize()
    }
  } catch (e) {
    record._rollback(e)
    throw e
  }

  return record
}

// ------------------------------------------------------------------------------------------------

function execute (record, cmd, data) {
  const Repository = require('./repository')

  Log._debug(TAG, 'Executing', cmd, JSON.stringify(data))

  record._intercept(() => {
    switch (cmd) {
      case 'deploy': {
        _assert(Array.isArray(data))
        const srcList = data.filter((x, i) => i % 2 === 0)
        const encpropsList = data.filter((x, i) => i % 2 === 1)

        const newCode = Record._evaluateSrcs(record, srcList, encpropsList)

        // Turn the functions into Code
        const options = { _repository: new Map() }
        for (let i = 0; i < newCode.length; i++) {
          newCode[i] = Repository._install(newCode[i], options)
        }

        Repository._deploy(...newCode)
      } break

      case 'upgrade': {
        _assert(Array.isArray(data))
        _assert(data.length === 3)

        const [Cenc, src, encprops] = data

        const codec = new Codec()._loadJigs(x => record._jigs[x])
        const C = codec._decode(Cenc)

        const [D] = Record._evaluateSrcs(record, [src], [encprops])

        C.upgrade(D)
      } break

      default:
        throw new Error(`Unknown command: ${cmd}`)
    }
  })
}

// ------------------------------------------------------------------------------------------------
// _installCode
// ------------------------------------------------------------------------------------------------

Record._evaluateSrcs = function (record, srcList, encpropsList) {
  _assert(srcList.length === encpropsList.length)

  const newCode = []

  const codec = new Codec()._loadJigs(x => record._jigs[x])
  const parentCodec = new Codec()._loadJigs(x => (x < record._jigs.length)
    ? record._jigs[x] : newCode[x - record._jigs.length])

  // Recreate all of the code as classes in the sandbox
  for (let i = 0; i < srcList.length; i++) {
    const src = srcList[i]
    const encprops = encpropsList[i]

    const env = {}

    // Get the parent if there is one
    const parentRegex = /^\s*class\s+[a-zA-Z0-9_$]+\s+extends\s+([a-zA-Z0-9_$]+)\s*{.*$/
    const parentMatch = src.match(parentRegex)
    if (parentMatch) {
      const parentName = parentMatch[1]
      const tempProps = parentCodec._decode(encprops)
      env[parentName] = tempProps.deps[parentName]
    }

    const [S, SGlobal] = Sandbox._evaluate(src, env)

    _assert(S.toString() === src)

    newCode.push(S)

    // Inflate the properties, using the new deploys when we need to
    const props = codec._decode(encprops)

    // Assign the props
    Object.keys(props).forEach(key => {
      Object.defineProperty(S, key, { enumerable: true, configurable: true, value: props[key] })
    })

    // Assign deps
    Object.assign(SGlobal, props.deps)
  }

  return newCode
}

// ------------------------------------------------------------------------------------------------

module.exports = { _import, _ImportLimit }
