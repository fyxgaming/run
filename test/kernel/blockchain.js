/**
 * blockchain.js
 *
 * Blockchain API tests that should work across all blockchain implementations
 */

const bsv = require('bsv')
const { describe, it, before } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, payFor } = require('../env/config')
const { PrivateKey, Script, Transaction } = bsv
const { Jig, BlockchainApi } = Run

// Helpers
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const randomTx = () => new Transaction().addSafeData(Math.random().toString())

// Error messages
const ERR_NO_INPUTS = 'tx has no inputs'
const ERR_NO_OUTPUTS = 'tx has no outputs'
const ERR_FEE_TOO_LOW = 'tx fee too low'
const ERR_NOT_SIGNED = 'tx not fully signed'
const ERR_DUP_INPUT = /transaction input [0-9]* duplicate input/
const ERR_MISSING_INPUTS = 'Missing inputs'
const ERR_MEMPOOL_CONFLICT = 'txn-mempool-conflict'
const ERR_BAD_SIGNATURE = 'tx signature not valid'
const ERR_TX_NOT_FOUND = 'tx not found'

// Gets a txid that spent output 0 and is confirmed
async function spentAndConfirmed (blockchain) {
  switch (blockchain.network) {
    case 'main': return '8b580cd23c2d2cb0236b888a977a19153eaa9f5ff50b40876699738e747e87ef'
    case 'test': return '883bcccba28ca185b4d20b90f344f32f7fd9e273f962f661a48cea0849609443'
    case 'mock': {
      const privkey = new PrivateKey('testnet')
      const addr = privkey.toAddress().toString()
      const aid = blockchain.fund(addr, 10000)
      const araw = await blockchain.fetch(aid)
      const atx = new Transaction(araw)
      const aout = atx.outputs[1]
      const autxo = { txid: aid, vout: 1, script: aout.script, satoshis: aout.satoshis }
      const btx = new Transaction().from(autxo).change(addr).sign(privkey)
      const braw = btx.toString('hex')
      await blockchain.broadcast(braw)
      blockchain.block()
      return aid
    }
    default: throw new Error(`No confirmed tx set for network: ${blockchain.network}`)
  }
}

async function addressWithManyUtxos (blockchain) {
  switch (blockchain.network) {
    case 'main': return '14kPnFashu7rYZKTXvJU8gXpJMf9e3f8k1'
    case 'test': return 'mxAtZKePTbXJC6GkbDV5SePyHANUswfhKK'
    case 'mock': {
      const privkey = new PrivateKey()
      const addr = privkey.toAddress()
      const fundid = blockchain.fund(addr, 100000000)
      const fundraw = await blockchain.fetch(fundid)
      const fundtx = new Transaction(fundraw)
      const fundout = fundtx.outputs[1]
      const fundutxo = { txid: fundid, vout: 1, script: fundout.script, satoshis: fundout.satoshis }
      const largetx = randomTx()
      largetx.from(fundutxo)
      for (let i = 0; i < 1500; i++) {
        largetx.to(addr, Transaction.DUST_AMOUNT)
      }
      largetx.sign(privkey)
      const largeraw = largetx.toString('hex')
      await blockchain.broadcast(largeraw)
      return addr
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Blockchain tests
// ------------------------------------------------------------------------------------------------

describe('Blockchain', () => {
  describe.only('broadcast', () => {
    it('should broadcast simple transaction', async () => {
      const run = new Run()
      const tx = randomTx()
      const parents = []
      const rawtx = await run.purse.pay(tx, parents)
      await run.blockchain.broadcast(rawtx)
    })

    it('should throw if input never existed', async () => {
      const run = new Run()
      const emptytx = new Transaction()
      const parents = []
      const paidraw = await run.purse.pay(emptytx, parents)
      const badtx = new Transaction(paidraw)
      badtx.inputs[0].outputIndex = 9999
      const badraw = badtx.toString('hex')
      await expect(run.blockchain.broadcast(badraw)).to.be.rejectedWith(ERR_MISSING_INPUTS)
    })

    it('should throw if input is already spent and confirmed', async () => {
      const run = new Run()
      const cid = await spentAndConfirmed(run.blockchain)
      const craw = await run.blockchain.fetch(cid)
      const ctx = new Transaction(craw)
      const cout = ctx.outputs[0]
      const cutxo = { txid: cid, vout: 0, script: cout.script, satoshis: cout.satoshis }
      const tx = randomTx().from(cutxo)
      const rawtx = tx.toString('hex')
      await expect(run.blockchain.broadcast(rawtx)).to.be.rejectedWith(ERR_MISSING_INPUTS)
    })

    it('should throw if input is already spent and not confirmed', async () => {
      const run = new Run()
      const utxos = await run.purse.utxos()
      const atx = new Transaction().from(utxos).addData('1').sign(run.purse.bsvPrivateKey)
      const btx = new Transaction().from(utxos).addData('2').sign(run.purse.bsvPrivateKey)
      await run.blockchain.broadcast(atx)
      await expect(run.blockchain.broadcast(btx)).to.be.rejectedWith(ERR_MEMPOOL_CONFLICT)
    })

    it('should throw if no inputs', async () => {
      const run = new Run()
      const dummyaddr = new PrivateKey().toAddress().toString()
      const tx = new Transaction().to(dummyaddr, 1000)
      await expect(run.blockchain.broadcast(tx)).to.be.rejectedWith(ERR_NO_INPUTS)
    })

    it('should throw if no outputs', async () => {
      const run = new Run()
      const utxos = await run.purse.utxos()
      const tx = new Transaction().from(utxos).sign(run.purse.bsvPrivateKey)
      await expect(run.blockchain.broadcast(tx)).to.be.rejectedWith(ERR_NO_OUTPUTS)
    })

    it('should throw if fee too low', async () => {
      const run = new Run()
      const utxos = await run.purse.utxos()
      const tx = new Transaction().from(utxos).change(run.purse.address).fee(0).sign(run.purse.bsvPrivateKey)
      await expect(run.blockchain.broadcast(tx)).to.be.rejectedWith(ERR_FEE_TOO_LOW)
    })

    it('should throw if not signed', async () => {
      const run = new Run()
      const utxos = await run.purse.utxos()
      const tx = new Transaction().from(utxos).addData('')
      await expect(run.blockchain.broadcast(tx)).to.be.rejectedWith(ERR_NOT_SIGNED)
    })

    it('should throw if duplicate input', async () => {
      const run = new Run()
      const utxos = await run.purse.utxos()
      const tx = new Transaction().from(utxos).from(utxos).addData('').sign(run.purse.bsvPrivateKey)
      await expect(run.blockchain.broadcast(tx)).to.be.rejectedWith(ERR_DUP_INPUT)
    })

    it('should throw if bad signature', async () => {
      const run = new Run()
      const utxos = await run.purse.utxos()
      const tx = new Transaction().from(utxos).addData('')
      tx.inputs[0].setScript('OP_FALSE')
      await expect(run.blockchain.broadcast(tx)).to.be.rejectedWith(ERR_BAD_SIGNATURE)
    })
  })

  describe.only('fetch', () => {
    it('should get raw transaction', async () => {
      const run = new Run()
      const cid = await spentAndConfirmed(run.blockchain)
      const rawtx = await run.blockchain.fetch(cid)
      expect(typeof rawtx).to.equal('string')
      const tx = new Transaction(rawtx)
      expect(tx.hash).to.equal(cid)
    })

    it('should throw if nonexistant', async () => {
      const run = new Run()
      const badid = '0000000000000000000000000000000000000000000000000000000000000000'
      await expect(run.blockchain.fetch(badid)).to.be.rejectedWith(ERR_TX_NOT_FOUND)
    })

    it('should cache repeated requests', async () => {
      const run = new Run()
      const goodid = await spentAndConfirmed(run.blockchain)
      const badid = '0000000000000000000000000000000000000000000000000000000000000000'
      const good = []
      const bad = []
      for (let i = 0; i < 1000; i++) {
        good.push(run.blockchain.fetch(goodid))
        bad.push(run.blockchain.fetch(badid))
      }
      await Promise.all(good)
      await expect(Promise.all(bad)).to.be.rejectedWith(ERR_TX_NOT_FOUND)
    })
  })

  describe.only('utxos', () => {
    it('should return utxos', async () => {
      const run = new Run()
      const utxos = await run.blockchain.utxos(run.purse.script)
      expect(utxos.length > 0).to.equal(true)
      expect(typeof utxos[0].txid).to.equal('string')
      expect(typeof utxos[0].vout).to.equal('number')
      expect(typeof utxos[0].script).to.equal('string')
      expect(typeof utxos[0].satoshis).to.equal('number')
    })

    it('should return empty list if no utxos', async () => {
      const run = new Run()
      const address = new PrivateKey().toAddress()
      const script = Script.fromAddress(address).toHex()
      const utxos = await run.blockchain.utxos(script)
      expect(utxos.length).to.equal(0)
    })

    it('should not return spent outputs', async () => {
      const run = new Run()
      const randomtx = randomTx()
      const paidraw = await run.purse.pay(randomtx, [])
      const paidtx = new Transaction(paidraw)
      await run.blockchain.broadcast(paidraw)
      const utxos = await run.blockchain.utxos(run.purse.script)
      const prevtxid = paidtx.inputs[0].prevTxId.toString('hex')
      const prevvout = paidtx.inputs[0].outputIndex
      expect(utxos.some(utxo => utxo.txid === prevtxid && utxo.vout === prevvout)).to.equal(false)
      expect(utxos.some(utxo => utxo.txid === paidtx.hash && utxo.vout === 1)).to.equal(true)
    })

    it('should cache repeated requests', async () => {
      const run = new Run()
      const requests = []
      for (let i = 0; i < 1000; i++) {
        requests.push(run.blockchain.utxos(run.purse.script))
      }
      await Promise.all(requests)
    })

    it('should throw for invalid queries', async () => {
      const run = new Run()
      const cases = ['z', '%', [], 123, null, undefined]
      for (const x of cases) {
        await expect(run.blockchain.utxos(x)).to.be.rejected
      }
    })

    it('should return large number of UTXOS', async () => {
      const run = new Run()
      const addr = await addressWithManyUtxos(run.blockchain)
      const script = Script.fromAddress(addr).toHex()
      const utxos = await run.blockchain.utxos(script)
      expect(utxos.length > 1220).to.equal(true)
    })
  })

  describe('spend', () => {
    it('should set spent information for unspent unconfirmed tx', async () => {
      const tx = await payFor(randomTx(), run)
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
    })

    it('should set spent information for spent unconfirmed tx', async () => {
      const tx = await payFor(randomTx(), run)
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
    })

    it('should cache spent info when force fetch', async () => {
      const privateKey2 = new PrivateKey(purse.bsvPrivateKey.network)
      const address2 = privateKey2.toAddress()
      const tx1 = await payFor(randomTx().to(address2, 1000), run)
      await blockchain.broadcast(tx1)
      const utxo = { txid: tx1.hash, vout: 1, script: tx1.outputs[1].script, satoshis: 1000 }
      const tx2 = (await payFor(randomTx().from(utxo), run)).sign(privateKey2)
      await blockchain.broadcast(tx2)
      const tx1b = await blockchain.fetch(tx1.hash, true)
      expect(tx1b.outputs[0].spentTxId).to.equal(tx1.outputs[0].spentTxId)
      expect(tx1b.outputs[0].spentIndex).to.equal(tx1.outputs[0].spentIndex)
      expect(tx1b.outputs[0].spentHeight).to.equal(tx1.outputs[0].spentHeight)
    })
  })

  describe('time', () => {
    it.skip('should return transaction time', async () => {
      const tx = await blockchain.fetch(TEST_DATA.confirmed.txid)
      expect(tx.time).not.to.equal(undefined)
      expect(tx.time > new Date('January 3, 2009')).to.equal(true)
      expect(tx.time <= Date.now()).to.equal(true)
      expect(tx.time).to.equal(TEST_DATA.confirmed.time)
    })

    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
// Per-network test data
// ------------------------------------------------------------------------------------------------

async function getTestData (run) {
  /*
  switch (run.blockchain.network) {
    case 'mock': return getMockNetworkTestData(run)
    case 'test': return getTestNetworkTestData()
    case 'main': return getMainNetworkTestData()
    default: throw new Error(`No test data for network: ${run.blockchain.network}`)
  }
  */
}

async function getMockNetworkTestData (run) {
  const { blockchain, purse } = run
  const utxo1 = (await blockchain.utxos(purse.script))[0]
  const tx1 = new Transaction().from(utxo1).addSafeData('123').change(purse.address).sign(purse.bsvPrivateKey)
  await blockchain.broadcast(tx1)

  const utxo2 = { txid: tx1.hash, vout: 1, script: tx1.outputs[1].script, satoshis: tx1.outputs[1].satoshis }
  const tx2 = randomTx().from(utxo2).change(purse.address).sign(purse.bsvPrivateKey)
  await blockchain.broadcast(tx2)

  blockchain.block()

  const confirmed = {
    txid: tx1.hash,
    time: tx1.time,
    outputIndex: 1,
    vout: [
      { spentTxId: null, spentIndex: null },
      { spentTxId: tx2.hash, spentIndex: 0 }
    ]
  }

  const indexingLatency = 0

  const largeTx = randomTx()
  const largeAddress = new PrivateKey('testnet').toAddress()
  for (let i = 0; i < 1500; i++) largeTx.to(largeAddress, Transaction.DUST_AMOUNT)
  await blockchain.broadcast(await payFor(largeTx, run))
  const lockingScriptWithManyUtxos = Script.fromAddress(largeAddress)

  return { confirmed, indexingLatency, errors, lockingScriptWithManyUtxos }
}

async function getTestNetworkTestData () {
  const confirmed = {
    txid: '883bcccba28ca185b4d20b90f344f32f7fd9e273f962f661a48cea0849609443',
    time: 1583295191000,
    outputIndex: 0,
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

async function getMainNetworkTestData () {
  const confirmed = {
    txid: '8b580cd23c2d2cb0236b888a977a19153eaa9f5ff50b40876699738e747e87ef',
    time: 1583296480000,
    outputIndex: 0,
    vout: [{
      spentTxId: 'd1506c004f263e351cf0884407bf7665979c45b63266311eb414e6c2682536f5',
      spentIndex: 0,
      spentHeight: 624716
    }]
  }

  const indexingLatency = 1000
  const lockingScriptWithManyUtxos = '14kPnFashu7rYZKTXvJU8gXpJMf9e3f8k1'

  return { confirmed, indexingLatency, errors, lockingScriptWithManyUtxos }
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

// ------------------------------------------------------------------------------------------------
