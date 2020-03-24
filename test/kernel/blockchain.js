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
// Blockchain Tests
// ------------------------------------------------------------------------------------------------

describe('Blockchain', () => {
  const run = new Run()
  const { blockchain, purse } = run

  let TEST_DATA = null
  before(async () => { TEST_DATA = await getTestData(blockchain, purse) })

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
  const clearCache = () => blockchain instanceof BlockchainApi && blockchain.cache.clear()

  describe('broadcast', () => {
    it('should support sending to self', async () => {
      const tx = await purse.pay(new Transaction())
      await blockchain.broadcast(tx)
    })

    it('should throw if input does not exist', async () => {
      const tx = await purse.pay(new Transaction())
      tx.inputs[0].outputIndex = 9999
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(TEST_DATA.errors.missingInputs)
    })

    it('should throw if already spent in block', async () => {
      const prevTx = await blockchain.fetch(TEST_DATA.confirmed.txid)
      const txid = TEST_DATA.confirmed.txid
      const vout = TEST_DATA.confirmed.outputIndex
      const script = prevTx.outputs[TEST_DATA.confirmed.outputIndex].script
      const satoshis = prevTx.outputs[TEST_DATA.confirmed.outputIndex].satoshis
      const utxo = { txid, vout, script, satoshis }
      const tx = new Transaction().from(utxo).addSafeData('123').change(run.purse.address)
      const oldIsFullySigned = Transaction.prototype.isFullySigned
      try {
        Transaction.prototype.isFullySigned = () => true
        await expect(blockchain.broadcast(tx)).to.be.rejectedWith(TEST_DATA.errors.missingInputs)
      } finally { Transaction.prototype.isFullySigned = oldIsFullySigned }
    })

    it('should throw if mempool conflict', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx1 = new Transaction().from(utxo).change(purse.address).sign(purse.bsvPrivateKey)
      const tx2 = new Transaction().from(utxo).addSafeData('123').sign(purse.bsvPrivateKey)
      await blockchain.broadcast(tx1)
      await expect(blockchain.broadcast(tx2)).to.be.rejectedWith(TEST_DATA.mempoolConflict)
    })

    it('should throw if no inputs', async () => {
      const tx = new Transaction().to(purse.address, 100)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(TEST_DATA.noInputs)
    })

    it('should throw if no outputs', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx = new Transaction().from(utxo).sign(purse.bsvPrivateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noOutputs)
    })

    it('should throw if fee too low', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx = new Transaction().from(utxo).change(purse.address).fee(0).sign(purse.bsvPrivateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(TEST_DATA.errors.feeTooLow)
    })

    it('should throw if not signed', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx = new Transaction().from(utxo).change(purse.address)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(TEST_DATA.errors.notFullySigned)
    })

    it('should throw if duplicate input', async () => {
      const utxo = (await blockchain.utxos(purse.address))[0]
      const tx = new Transaction().from(utxo).from(utxo).change(purse.address).sign(purse.bsvPrivateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(TEST_DATA.errors.duplicateInput)
    })
  })

  describe('fetch', () => {
    it('should get pre-existing transaction', async () => {
      const tx = await blockchain.fetch(TEST_DATA.confirmed.txid)
      expect(tx.hash).to.equal(TEST_DATA.confirmed.txid)
    })

    it('should set time', async () => {
      const tx = await blockchain.fetch(TEST_DATA.confirmed.txid)
      expect(tx.time).not.to.equal(undefined)
      expect(tx.time > new Date('January 3, 2009')).to.equal(true)
      expect(tx.time <= Date.now()).to.equal(true)
      expect(tx.time).to.equal(TEST_DATA.confirmed.time)
    })

    it('should cache repeated calls', async () => {
      const requests = []
      for (let i = 0; i < 100; i++) requests.push(blockchain.fetch(TEST_DATA.confirmed.txid))
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
      await sleep(TEST_DATA.indexingLatency)
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
      await sleep(TEST_DATA.indexingLatency)
      clearCache()
      const firstInput = tx.inputs[0]
      const prev = await blockchain.fetch(firstInput.prevTxId.toString('hex'), true)
      expect(prev.outputs[firstInput.outputIndex].spentTxId).to.be.oneOf([undefined, tx.hash])
      expect(prev.outputs[firstInput.outputIndex].spentIndex).to.be.oneOf([undefined, 0])
      expect(prev.outputs[firstInput.outputIndex].spentHeight).to.be.oneOf([undefined, -1])
    })

    it('should set spent information for spent confirmed tx', async () => {
      const tx = await blockchain.fetch(TEST_DATA.confirmed.txid)
      TEST_DATA.confirmed.vout.forEach((output, n) => {
        expect(tx.outputs[n].spentTxId).to.be.oneOf([undefined, output.spentTxId])
        expect(tx.outputs[n].spentIndex).to.be.oneOf([undefined, output.spentIndex])
        expect(tx.outputs[n].spentHeight).to.be.oneOf([undefined, output.spentHeight])
      })
      if (TEST_DATA.confirmed.blockhash) {
        expect(tx.blockhash).to.equal(TEST_DATA.confirmed.blockhash)
        expect(tx.blocktime).to.equal(TEST_DATA.confirmed.blocktime)
        expect(tx.confirmations > TEST_DATA.confirmed.minConfirmations).to.equal(true)
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

    it('should return large number of UTXOS', async () => {
      const utxos = await blockchain.utxos(TEST_DATA.lockingScriptWithManyUtxos)
      expect(utxos.length > 1220).to.equal(true)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Per-network test data
// ------------------------------------------------------------------------------------------------

async function getTestData (blockchain, purse) {
  switch (blockchain.network) {
    case 'mock': return getMockNetworkTestData(blockchain, purse)
    case 'test': return getTestNetworkTestData(blockchain, purse)
    case 'main': return getMainNetworkTestData(blockchain, purse)
    default: throw new Error(`No test data for network: ${blockchain.network}`)
  }
}

async function getMockNetworkTestData (blockchain, purse) {
  const utxo1 = (await blockchain.utxos(purse.bsvAddress))[0]
  const tx1 = new Transaction().from(utxo1).addSafeData('123').change(purse.address).sign(purse.bsvPrivateKey)
  await blockchain.broadcast(tx1)

  const utxo2 = { txid: tx1.hash, vout: 1, script: tx1.outputs[1].script, satoshis: tx1.outputs[1].satoshis }
  const tx2 = new Transaction().from(utxo2).change(purse.address).sign(purse.bsvPrivateKey)
  await blockchain.broadcast(tx2)

  blockchain.block()

  const confirmed = {
    txid: tx1.hash,
    time: tx1.time,
    outputIndex: 1,
    vout: [
      { spentTxId: null, spentIndex: null, spentHeight: null },
      { spentTxId: tx2.hash, spentIndex: 0, spentHeight: tx2.blockheight }
    ]
  }

  const indexingLatency = 0

  const largeTx = new Transaction()
  const largeAddress = new PrivateKey('testnet').toAddress()
  for (let i = 0; i < 1500; i++) largeTx.to(largeAddress, Transaction.DUST_AMOUNT)
  await blockchain.broadcast(await purse.pay(largeTx))
  const lockingScriptWithManyUtxos = Script.fromAddress(largeAddress)

  return { confirmed, indexingLatency, errors, lockingScriptWithManyUtxos }
}

async function getTestNetworkTestData (blockchain, purse) {
  const confirmed = {
    txid: '883bcccba28ca185b4d20b90f344f32f7fd9e273f962f661a48cea0849609443',
    time: 1583295191000,
    outputIndex: 0,
    blockhash: '00000000a95abd6a8d6fed34c0fb07b9ef5c51daa9832a43db98b63d52d8394c',
    blocktime: 1583295191,
    minConfirmations: 3,
    vout: [{
      spentTxId: '4350cf2aac66a2b3aef840af70f4fcfddcd85ccc3cb0e3aa62febb2cbfa91e53',
      spentIndex: 0,
      spentHeight: 1351192
    }]
  }

  const indexingLatency = 1000
  const lockingScriptWithManyUtxos = 'mxAtZKePTbXJC6GkbDV5SePyHANUswfhKK'

  return { confirmed, indexingLatency, errors, lockingScriptWithManyUtxos }
}

async function getMainNetworkTestData (blockchain, purse) {
  // Todo
  // const utxos = await blockchain.utxos('14kPnFashu7rYZKTXvJU8gXpJMf9e3f8k1')
}

// Expected error strings
const errors = {
  noInputs: 'tx has no inputs',
  noOutputs: 'tx has no outputs',
  feeTooLow: 'tx fee too low',
  notFullySigned: 'tx not fully signed',
  duplicateInput: /transaction input [0-9]* duplicate input/,
  missingInputs: 'Missing inputs',
  mempoolConflict: 'txn-mempool-conflict'
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
  },
  stn: {
    txid: 'a40ee613c5982d6b39d2425368eb2375f49b38a45b457bd72db4ec666d96d4c6'
  }
}
*/

// ------------------------------------------------------------------------------------------------
