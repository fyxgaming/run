/**
 * misc.js
 *
 * Test helpers
 */

const { Transaction } = require('bsv')
const Run = require('./run')
const unmangle = require('./unmangle')
const { _payload } = unmangle(Run)
const { expect } = require('chai')

// ------------------------------------------------------------------------------------------------
// payFor
// ------------------------------------------------------------------------------------------------

async function payFor (tx, run) {
  const rawtx = tx.toString('hex')
  const prevtxids = tx.inputs.map(input => input.prevTxId.toString('hex'))
  const prevrawtxs = await Promise.all(prevtxids.map(txid => run.blockchain.fetch(txid)))
  const prevtxs = prevrawtxs.map(rawtx => new Transaction(rawtx))
  const parents = tx.inputs.map((input, n) => prevtxs[n].outputs[input.outputIndex])
  const paidhex = await run.purse.pay(rawtx, parents)
  const paidtx = new Transaction(paidhex)
  await populatePreviousOutputs(paidtx, run.blockchain)
  return paidtx
}

// ------------------------------------------------------------------------------------------------
// populatePreviousOutputs
// ------------------------------------------------------------------------------------------------

/**
 * Adds the previous output information for each input to sign and verify the transaction.
 * @param {bsv.Transaction} tx Tx to modify
 * @param {Blockchain} blockchain Blockchain to fetch inputs
 */
async function populatePreviousOutputs (tx, blockchain) {
  for (let i = 0; i < tx.inputs.length; i++) {
    const input = tx.inputs[i]

    if (!input.output) {
      const prevtxid = input.prevTxId.toString('hex')
      const prevraw = await blockchain.fetch(prevtxid)
      const prevtx = new Transaction(prevraw)

      // Add the output, which gives us the script and satoshis
      input.output = prevtx.outputs[input.outputIndex]

      // Set the type of the input if we can determine it.
      // Run doesn't require this to work but it may help users.
      if (input.output.script.isPublicKeyHashOut()) {
        Reflect.setPrototypeOf(input, Transaction.Input.PublicKeyHash.prototype)
      }
    }
  }
}

// ------------------------------------------------------------------------------------------------
// expectTx
// ------------------------------------------------------------------------------------------------

/**
 * Checks the payload data in next Run transaction broadcast
 *
 * @param {object} opts
 * @param {?number} nin Number of inputs
 * @param {?number} nref Number of references
 * @param {?Array} out Output hashes
 * @param {?Array} del Deleted hashes
 * @param {?Array} ncre Number of creates
 * @param {?Array} exec Program instructions
 */
function expectTx (opts) {
  const run = Run.instance

  function verify (rawtx) {
    const tx = new Transaction(rawtx)
    const payload = _payload(tx)
    if ('nin' in opts) expect(payload.in).to.equal(opts.nin, 'bad nin')
    if ('nref' in opts) expect(payload.ref.length).to.equal(opts.nref, 'bad nref')
    if ('nout' in opts) expect(payload.out.length).to.equal(opts.nout, 'bad nout')
    if ('ndel' in opts) expect(payload.del.length).to.equal(opts.ndel, 'bad ndel')
    if ('ncre' in opts) expect(payload.cre.length).to.equal(opts.ncre, 'bad ncre')
    try {
      if ('exec' in opts) expect(payload.exec).to.deep.equal(opts.exec, 'bad exec')
    } catch (e) {
      console.log('Broadcast payload:', JSON.stringify(payload, 0, 3))
      throw e
    }
  }

  // Hook run.blockchain to verify the next transaction then disable the hook
  const oldBroadcast = run.blockchain.broadcast
  run.blockchain.broadcast = rawtx => {
    run.blockchain.broadcast = oldBroadcast
    verify(rawtx)
    return oldBroadcast.call(run.blockchain, rawtx)
  }
}

// ------------------------------------------------------------------------------------------------
// testRecord
// ------------------------------------------------------------------------------------------------

// Helper to test recording calls and then roll back any changes
function testRecord (f) {
  const Record = unmangle(unmangle(Run)._Record)
  const CURRENT_RECORD = unmangle(Record._CURRENT_RECORD)
  try {
    CURRENT_RECORD._begin()
    return f(CURRENT_RECORD)
  } finally {
    CURRENT_RECORD._rollback()
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { populatePreviousOutputs, payFor, expectTx, testRecord }
