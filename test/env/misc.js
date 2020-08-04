/**
 * misc.js
 *
 * Test helpers
 */

const { Transaction } = require('bsv')

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

module.exports = { populatePreviousOutputs, payFor }
