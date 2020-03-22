/**
 * blockchain.js
 *
 * Blockchain API tests that should work across all blockchains
 */

const bsv = require('bsv')
const { describe, it, beforeEach } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../config')

// ------------------------------------------------------------------------------------------------
// Test Config
// ------------------------------------------------------------------------------------------------

const run = new Run()
const { blockchain, purse } = run

const errors = {
  noInputs: 'tx has no inputs',
  noOutputs: 'tx has no outputs',
  feeTooLow: 'tx fee too low',
  notFullySigned: 'tx not fully signed',
  duplicateInput: /transaction input [0-9]* duplicate input/,
  missingInputs: 'Missing inputs',
  mempoolConflict: 'txn-mempool-conflict'
}

const preexisting = getPreexistingTransaction(blockchain, purse)

// ------------------------------------------------------------------------------------------------
// Blockchain Tests
// ------------------------------------------------------------------------------------------------

describe('Blockchain', () => {
  beforeEach(() => blockchain.network === 'mock' && blockchain.block())

  describe('broadcast', () => {
    it('should support sending to self', async () => {
      const tx = await purse.pay(new bsv.Transaction())
      await blockchain.broadcast(tx)
    })

    it('should throw if input does not exist', async () => {
      const tx = await purse.pay(new bsv.Transaction())
      tx.inputs[0].outputIndex = 999
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.missingInputs)
    })

    it('should throw if already spent in block', async () => {
      const prevTx = await blockchain.fetch(preexisting.txid)
      const script = prevTx.outputs[preexisting.outputIndex].script
      const satoshis = prevTx.outputs[preexisting.outputIndex].satoshis
      const utxo = { txid: preexisting.txid, vout: preexisting.outputIndex, script, satoshis }
      const tx = new bsv.Transaction().from(utxo).addSafeData('123')
        .change(run.purse.address).sign(preexisting.outputPrivkey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.missingInputs)
    })

    it('should throw if mempool conflict', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx1 = new bsv.Transaction().from(utxo).change(purse.address).sign(purse.bsvPrivateKey)
      const tx2 = new bsv.Transaction().from(utxo).addSafeData('123').sign(purse.bsvPrivateKey)
      await blockchain.broadcast(tx1)
      await expect(blockchain.broadcast(tx2)).to.be.rejectedWith(errors.mempoolConflict)
    })

    /*
    it('should throw if no inputs', async () => {
      const tx = new bsv.Transaction().to(address, 100)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noInputs)
    })

    it('should throw if no outputs', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noOutputs)
    })

    it('should throw if fee too low', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).change(address).fee(0).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.feeTooLow)
    })

    it('should throw if not signed', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).change(address)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.notFullySigned)
    })

    it('should throw if duplicate input', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).from(utxos).change(address).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.duplicateInput)
    })
    */
  })
})

// ------------------------------------------------------------------------------------------------
// Pre-existing transaction
// ------------------------------------------------------------------------------------------------

function getPreexistingTransaction (blockchain, purse) {
  switch (blockchain.network) {
    case 'mock': {
      // First mockchain tx is funded by run with the purse
      const tx = blockchain.transactions.values().next().value
      return {
        txid: tx.hash,
        time: tx.time,
        outputIndex: 1,
        outputPrivkey: purse.privkey
      }
    }

    default: throw new Error(`No preexisting transaction for network: ${blockchain.network}`)
  }
}

/*
const sampleTransactions = {
  main: {
    txid: '8b580cd23c2d2cb0236b888a977a19153eaa9f5ff50b40876699738e747e87ef',
    blockhash: '0000000000000000013cd2f234ed8048b58f04e1c3e739be5c1b44518f3f52ce',
    blocktime: 1583296480,
    time: 1583296480000,
    minConfirmations: 3,
    vout: [{
      spentTxId: 'd1506c004f263e351cf0884407bf7665979c45b63266311eb414e6c2682536f5',
      spentIndex: 0,
      spentHeight: 624716
    }],
    outputIndex: 0,
    outputPrivkey: 'L3qpvEdCa4h7qxuJ1xqQwNQV2dfDR8YB57awpcbnBpoyGMAZEGLq'
  },
  test: {
    txid: '883bcccba28ca185b4d20b90f344f32f7fd9e273f962f661a48cea0849609443',
    blockhash: '00000000a95abd6a8d6fed34c0fb07b9ef5c51daa9832a43db98b63d52d8394c',
    blocktime: 1583295191,
    time: 1583295191000,
    minConfirmations: 3,
    vout: [{
      spentTxId: '4350cf2aac66a2b3aef840af70f4fcfddcd85ccc3cb0e3aa62febb2cbfa91e53',
      spentIndex: 0,
      spentHeight: 1351192
    }],
    outputIndex: 0,
    outputPrivkey: 'cT7uSf2Q4nFDWoqQtSBaKHnQsuWVdcvxZMiuCs3nkwYh94xctaFg'
  },
  stn: {
    txid: 'a40ee613c5982d6b39d2425368eb2375f49b38a45b457bd72db4ec666d96d4c6'
  }
}
*/

// ------------------------------------------------------------------------------------------------
