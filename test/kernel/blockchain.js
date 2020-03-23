/**
 * blockchain.js
 *
 * Blockchain API tests that should work across all blockchains
 */

const bsv = require('bsv')
const { describe, it, before } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../config')
const { Transaction, Script, PrivateKey } = bsv
const { BlockchainApi } = Run.module

// ------------------------------------------------------------------------------------------------
// Globals
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

const indexingLatency = blockchain.network === 'mock' ? 0 : 1000

let confirmed = null
before(async () => { confirmed = await getConfirmedTransaction(blockchain, purse) })

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const clearCache = () => blockchain instanceof BlockchainApi && blockchain.cache.clear()

// ------------------------------------------------------------------------------------------------
// Blockchain Tests
// ------------------------------------------------------------------------------------------------

describe('Blockchain', () => {
  describe('broadcast', () => {
    it('should support sending to self', async () => {
      const tx = await purse.pay(new Transaction())
      await blockchain.broadcast(tx)
    })

    it('should throw if input does not exist', async () => {
      const tx = await purse.pay(new Transaction())
      tx.inputs[0].outputIndex = 999
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.missingInputs)
    })

    it('should throw if already spent in block', async () => {
      const prevTx = await blockchain.fetch(confirmed.txid)
      const script = prevTx.outputs[confirmed.outputIndex].script
      const satoshis = prevTx.outputs[confirmed.outputIndex].satoshis
      const utxo = { txid: confirmed.txid, vout: confirmed.outputIndex, script, satoshis }
      const tx = new Transaction().from(utxo).addSafeData('123')
        .change(run.purse.address).sign(confirmed.outputPrivkey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.missingInputs)
    })

    it('should throw if mempool conflict', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx1 = new Transaction().from(utxo).change(purse.address).sign(purse.bsvPrivateKey)
      const tx2 = new Transaction().from(utxo).addSafeData('123').sign(purse.bsvPrivateKey)
      await blockchain.broadcast(tx1)
      await expect(blockchain.broadcast(tx2)).to.be.rejectedWith(errors.mempoolConflict)
    })

    it('should throw if no inputs', async () => {
      const tx = new Transaction().to(purse.address, 100)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noInputs)
    })

    it('should throw if no outputs', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx = new Transaction().from(utxo).sign(purse.bsvPrivateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noOutputs)
    })

    it('should throw if fee too low', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx = new Transaction().from(utxo).change(purse.address).fee(0).sign(purse.bsvPrivateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.feeTooLow)
    })

    it('should throw if not signed', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx = new Transaction().from(utxo).change(purse.address)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.notFullySigned)
    })

    it('should throw if duplicate input', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx = new Transaction().from(utxo).from(utxo).change(purse.address).sign(purse.bsvPrivateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.duplicateInput)
    })
  })

  describe('fetch', () => {
    it('should get pre-existing transaction', async () => {
      const tx = await blockchain.fetch(confirmed.txid)
      expect(tx.hash).to.equal(confirmed.txid)
    })

    it('should set time', async () => {
      const tx = await blockchain.fetch(confirmed.txid)
      expect(tx.time).not.to.equal(undefined)
      expect(tx.time > new Date('January 3, 2009')).to.equal(true)
      expect(tx.time <= Date.now()).to.equal(true)
      expect(tx.time).to.equal(confirmed.time)
    })

    it('should cache repeated calls', async () => {
      const requests = []
      for (let i = 0; i < 100; i++) requests.push(blockchain.fetch(confirmed.txid))
      await Promise.all(requests)
    })

    it('should throw if nonexistant', async () => {
      const bad = '0000000000000000000000000000000000000000000000000000000000000000'
      const requests = [bad, bad, bad].map(txid => blockchain.fetch(txid))
      await expect(Promise.all(requests)).to.be.rejectedWith()
    })

    it('should set spent information for unspent unconfirmed tx', async () => {
      const tx = await purse.pay(new Transaction())
      await blockchain.broadcast(tx)
      const tx2 = await blockchain.fetch(tx.hash)
      expect(tx2.outputs[0].spentTxId).to.equal(null)
      expect(tx2.outputs[0].spentIndex).to.equal(null)
      expect(tx2.outputs[0].spentHeight).to.equal(null)
      await sleep(indexingLatency)
      clearCache()
      const tx3 = await blockchain.fetch(tx.hash, true)
      expect(tx3.outputs[0].spentTxId).to.be.oneOf([undefined, null])
      expect(tx3.outputs[0].spentIndex).to.be.oneOf([undefined, null])
      expect(tx3.outputs[0].spentHeight).to.be.oneOf([undefined, null])
      expect(tx3.confirmations).to.equal(0)
    })

    it('should set spent information for spent unconfirmed tx', async () => {
      const tx = await purse.pay(new Transaction())
      await blockchain.broadcast(tx)
      await sleep(indexingLatency)
      clearCache()
      const firstInput = tx.inputs[0]
      const prev = await blockchain.fetch(firstInput.prevTxId.toString('hex'), true)
      expect(prev.outputs[firstInput.outputIndex].spentTxId).to.be.oneOf([undefined, tx.hash])
      expect(prev.outputs[firstInput.outputIndex].spentIndex).to.be.oneOf([undefined, 0])
      expect(prev.outputs[firstInput.outputIndex].spentHeight).to.be.oneOf([undefined, -1])
    })

    it('should set spent information for spent confirmed tx', async () => {
      const tx = await blockchain.fetch(confirmed.txid)
      confirmed.vout.forEach((output, n) => {
        expect(tx.outputs[n].spentTxId).to.be.oneOf([undefined, output.spentTxId])
        expect(tx.outputs[n].spentIndex).to.be.oneOf([undefined, output.spentIndex])
        expect(tx.outputs[n].spentHeight).to.be.oneOf([undefined, output.spentHeight])
      })
      if (confirmed.blockhash) {
        expect(tx.blockhash).to.equal(confirmed.blockhash)
        expect(tx.blocktime).to.equal(confirmed.blocktime)
        expect(tx.confirmations > confirmed.minConfirmations).to.equal(true)
      }
    })

    it('should cache spent info when force fetch', async () => {
      const privateKey2 = new PrivateKey(purse.bsvPrivateKey.network)
      const address2 = privateKey2.toAddress()
      const tx1 = await purse.pay(new Transaction().to(address2, 1000))
      await blockchain.broadcast(tx1)
      const utxo = { txid: tx1.hash, vout: 0, script: tx1.outputs[0].script, satoshis: 1000 }
      const tx2 = (await purse.pay(new Transaction().from(utxo))).sign(privateKey2)
      await blockchain.broadcast(tx2)
      const tx1b = await blockchain.fetch(tx1.hash, true)
      expect(tx1b.outputs[0].spentTxId).to.equal(tx1.outputs[0].spentTxId)
      expect(tx1b.outputs[0].spentIndex).to.equal(tx1.outputs[0].spentIndex)
      expect(tx1b.outputs[0].spentHeight).to.equal(tx1.outputs[0].spentHeight)
    })
  })

  describe('utxos', () => {
    it('should return utxos', async () => {
      const utxos = await blockchain.utxos(purse.bsvAddress)
      expect(utxos.length > 0).to.equal(true)
      expect(utxos[0].txid).not.to.equal(undefined)
      expect(utxos[0].vout).not.to.equal(undefined)
      expect(utxos[0].script).not.to.equal(undefined)
      expect(utxos[0].satoshis).not.to.equal(undefined)
    })

    it('should return empty list if no utxos', async () => {
      const address = new PrivateKey(purse.bsvPrivateKey.network).toAddress()
      const utxos = await blockchain.utxos(Script.fromAddress(address))
      expect(utxos.length).to.equal(0)
    })

    it('should not return spent outputs', async () => {
      const tx = await purse.pay(new Transaction())
      await blockchain.broadcast(tx)
      const utxos = await blockchain.utxos(purse.bsvAddress)
      expect(utxos.some(utxo => utxo.txid === tx.inputs[0].prevTxId.toString() &&
        utxo.vout === tx.inputs[0].outputIndex)).to.equal(false)
      expect(utxos.some(utxo => utxo.txid === tx.hash && utxo.vout === 0)).to.equal(true)
    })

    it('should cache repeated calls', async () => {
      const requests = []
      for (let i = 0; i < 100; i++) requests.push(blockchain.utxos(purse.bsvAddress))
      await Promise.all(requests)
    })

    it('should throw for invalid queries', async () => {
      const requests = ['z', '%', [], 123, null, undefined].map(x => blockchain.utxos(x))
      await expect(Promise.all(requests)).to.be.rejected
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Pre-existing transaction
// ------------------------------------------------------------------------------------------------

async function getConfirmedTransaction (blockchain, purse) {
  switch (blockchain.network) {
    case 'mock': {
      const utxo1 = (await blockchain.utxos(purse.bsvAddress))[0]
      const tx1 = new Transaction().from(utxo1).addSafeData('123').change(purse.address).sign(purse.bsvPrivateKey)
      await blockchain.broadcast(tx1)

      const utxo2 = { txid: tx1.hash, vout: 1, script: tx1.outputs[1].script, satoshis: tx1.outputs[1].satoshis }
      const tx2 = new Transaction().from(utxo2).change(purse.address).sign(purse.bsvPrivateKey)
      await blockchain.broadcast(tx2)

      blockchain.block()

      return {
        txid: tx1.hash,
        time: tx1.time,
        outputIndex: 1,
        outputPrivkey: purse.privkey,
        vout: [
          { spentTxId: null, spentIndex: null, spentHeight: null },
          { spentTxId: tx2.hash, spentIndex: 0, spentHeight: tx2.blockheight }
        ]
      }
    }

    default: throw new Error(`No confirmed transaction for network: ${blockchain.network}`)
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
