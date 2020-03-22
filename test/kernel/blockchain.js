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

    it('should throw if no inputs', async () => {
      const tx = new bsv.Transaction().to(purse.address, 100)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noInputs)
    })

    it('should throw if no outputs', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx = new bsv.Transaction().from(utxo).sign(purse.bsvPrivateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noOutputs)
    })

    it('should throw if fee too low', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx = new bsv.Transaction().from(utxo).change(purse.address).fee(0).sign(purse.bsvPrivateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.feeTooLow)
    })

    it('should throw if not signed', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx = new bsv.Transaction().from(utxo).change(purse.address)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.notFullySigned)
    })

    it('should throw if duplicate input', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx = new bsv.Transaction().from(utxo).from(utxo).change(purse.address).sign(purse.bsvPrivateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.duplicateInput)
    })
  })

  describe('fetch', () => {
    it('should get pre-existing transaction', async () => {
      const tx = await blockchain.fetch(preexisting.txid)
      expect(tx.hash).to.equal(preexisting.txid)
    })

    it('should set time', async () => {
      const tx = await blockchain.fetch(preexisting.txid)
      expect(tx.time).not.to.equal(undefined)
      expect(tx.time > new Date('January 3, 2009')).to.equal(true)
      expect(tx.time <= Date.now()).to.equal(true)
      expect(tx.time).to.equal(preexisting.time)
    })

    it('should cache repeated calls', async () => {
      const requests = []
      for (let i = 0; i < 100; i++) requests.push(blockchain.fetch(preexisting.txid))
      await Promise.all(requests)
    })

  /*
    it('should throw if nonexistant', async () => {
      const bad = '0000000000000000000000000000000000000000000000000000000000000000'
      const requests = [bad, bad, bad].map(txid => blockchain.fetch(txid))
      await expect(Promise.all(requests)).to.be.rejectedWith()
    })

    it('should set spent information for transaction in mempool and unspent', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
      function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
      const tx2 = await blockchain.fetch(tx.hash)
      // check the cached copy
      expect(tx2.outputs[0].spentTxId).to.equal(null)
      expect(tx2.outputs[0].spentIndex).to.equal(null)
      expect(tx2.outputs[0].spentHeight).to.equal(null)
      // check the uncached copy
      if (blockchain instanceof BlockchainServer) {
        await sleep(indexingLatency)
        blockchain.cache.transactions.clear()
      }
      const tx3 = await blockchain.fetch(tx.hash)
      if (supportsSpentTxIdInMempool) {
        expect(tx3.outputs[0].spentTxId).to.equal(null)
        expect(tx3.outputs[0].spentIndex).to.equal(null)
        expect(tx3.outputs[0].spentHeight).to.equal(null)
      } else {
        expect(tx3.outputs[0].spentTxId).to.equal(undefined)
        expect(tx3.outputs[0].spentIndex).to.equal(undefined)
        expect(tx3.outputs[0].spentHeight).to.equal(undefined)
      }
      expect(tx3.confirmations).to.equal(0)
    })

    it('should set spent information for transaction in mempool and spent', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
      function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
      if (blockchain instanceof BlockchainServer) {
        await sleep(indexingLatency)
        blockchain.cache.transactions.clear()
      }
      const firstInput = tx.inputs[0]
      const prev = await blockchain.fetch(firstInput.prevTxId.toString('hex'))
      if (supportsSpentTxIdInMempool) {
        expect(prev.outputs[firstInput.outputIndex].spentTxId).to.equal(tx.hash)
        expect(prev.outputs[firstInput.outputIndex].spentIndex).to.equal(0)
        expect(prev.outputs[firstInput.outputIndex].spentHeight).to.equal(-1)
      } else {
        expect(prev.outputs[firstInput.outputIndex].spentTxId).to.equal(undefined)
        expect(prev.outputs[firstInput.outputIndex].spentIndex).to.equal(undefined)
        expect(prev.outputs[firstInput.outputIndex].spentHeight).to.equal(undefined)
      }
    })

    it('should set spent information for transaction in block and spent', async () => {
      const tx = await blockchain.fetch(sampleTx.txid)
      for (let i = 0; i < sampleTx.vout.length; i++) {
        if (supportsSpentTxIdInBlocks) {
          expect(tx.outputs[i].spentTxId).to.equal(sampleTx.vout[i].spentTxId)
          expect(tx.outputs[i].spentIndex).to.equal(sampleTx.vout[i].spentIndex)
          expect(tx.outputs[i].spentHeight).to.equal(sampleTx.vout[i].spentHeight)
        } else {
          expect(tx.outputs[0].spentTxId).to.equal(undefined)
          expect(tx.outputs[0].spentIndex).to.equal(undefined)
          expect(tx.outputs[0].spentHeight).to.equal(undefined)
        }
      }
      if (sampleTx.blockhash) {
        expect(tx.blockhash).to.equal(sampleTx.blockhash)
        expect(tx.blocktime).to.equal(sampleTx.blocktime)
        expect(tx.confirmations > sampleTx.minConfirmations).to.equal(true)
      }
    })

    it('should keep spent info when force fetch', async () => {
      const privateKey2 = new bsv.PrivateKey(privateKey.network)
      const address2 = privateKey2.toAddress()
      const tx1 = await payFor(new bsv.Transaction().to(address2, 1000).sign(privateKey), privateKey, blockchain)
      await blockchain.broadcast(tx1)
      const utxo = { txid: tx1.hash, vout: 0, script: tx1.outputs[0].script, satoshis: 1000 }
      const tx2 = (await payFor(new bsv.Transaction().from(utxo), privateKey, blockchain)).sign(privateKey2)
      await blockchain.broadcast(tx2)
      const tx1b = await blockchain.fetch(tx1.hash, true)
      expect(tx1b.outputs[0].spentTxId).to.equal(tx1.outputs[0].spentTxId)
      expect(tx1b.outputs[0].spentIndex).to.equal(tx1.outputs[0].spentIndex)
      expect(tx1b.outputs[0].spentHeight).to.equal(tx1.outputs[0].spentHeight)
    })
    */
  })

  describe('utxos', () => {
  /*
    it('should return utxos', async () => {
      const utxos = await blockchain.utxos(address)
      expect(utxos.length > 0).to.equal(true)
      expect(utxos[0].txid).not.to.equal(undefined)
      expect(utxos[0].vout).not.to.equal(undefined)
      expect(utxos[0].script).not.to.equal(undefined)
      expect(utxos[0].satoshis).not.to.equal(undefined)
    })

    it('should return empty list if no utxos', async () => {
      const address = new bsv.PrivateKey(privateKey.network).toAddress()
      const utxos = await blockchain.utxos(address)
      expect(utxos.length).to.equal(0)
    })

    it('should not return spent outputs', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
      const utxos = await blockchain.utxos(address)
      expect(utxos.some(utxo => utxo.txid === tx.inputs[0].prevTxId.toString() &&
        utxo.vout === tx.inputs[0].outputIndex)).to.equal(false)
      expect(utxos.some(utxo => utxo.txid === tx.hash && utxo.vout === 0)).to.equal(true)
    })

    it('should cache repeated calls', async () => {
      const requests = []
      for (let i = 0; i < 100; i++) requests.push(blockchain.utxos(address))
      await Promise.all(requests)
    })

    it('should throw for invalid script hash', async () => {
      const requests = ['z', '%', []].map(addr => blockchain.utxos(addr))
      await expect(Promise.all(requests)).to.be.rejected
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
