const { PrivateKey, Transaction } = require('bsv')
const { createRun, getObfuscatedKey } = require('./test-util')
const runBlockchainTestSuite = require('./blockchain')

const transactionsKey = getObfuscatedKey('transactions')
const blockHeightKey = getObfuscatedKey('blockHeight')

const run = createRun({ network: 'mock' })
const tx = run.blockchain[transactionsKey].values().next().value
beforeEach(() => run.blockchain.block())

const errors = {
  noInputs: 'tx has no inputs',
  noOutputs: 'tx has no outputs',
  feeTooLow: 'tx fee too low',
  notFullySigned: 'tx not fully signed',
  duplicateInput: 'transaction input 1 duplicate input',
  missingInput: 'tx input 0 missing or spent'
}

const sampleTx = {
  txid: tx.hash,
  time: tx.time
}

// generate a spending transaction so that we have spentTxId
beforeAll(async () => {
  const utxos = await run.blockchain.utxos(run.purse.address)
  const spentTx = new Transaction().from(utxos).change(run.purse.address).sign(run.purse.privkey)
  await run.blockchain.broadcast(spentTx)
  sampleTx.vout = [
    {
      spentTxId: undefined,
      spentIndex: undefined,
      spentHeight: undefined
    },
    {
      spentTxId: spentTx.hash,
      spentIndex: 0,
      spentHeight: 0
    }
  ]
})

runBlockchainTestSuite('Mockchain', run.blockchain, run.purse.privkey, sampleTx,
  true /* supportsSpentTxIdInBlocks */, true /* supportsSpentTxIdInMempool */,
  0 /* indexingLatency */, errors)

describe('Mockchain', () => {
  describe('block', () => {
    test('updates block heights', async () => {
      const txns = []
      for (let i = 0; i < 25; i++) {
        const utxo = (await run.blockchain.utxos(run.purse.address))[0]
        const tx = new Transaction().from(utxo).change(run.purse.address).sign(run.purse.privkey)
        txns.push(tx)
        await run.blockchain.broadcast(tx)
      }
      for (let i = 0; i < txns.length; i++) {
        expect(txns[i][blockHeightKey]).toBe(-1)
        expect(txns[i].outputs[0].spentHeight).toBe(i < txns.length - 1 ? -1 : null)
      }
      run.blockchain.block()
      for (let i = 0; i < txns.length; i++) {
        expect(txns[i][blockHeightKey]).toBe(run.blockchain[blockHeightKey])
        expect(txns[i].outputs[0].spentHeight).toBe(i < txns.length - 1
          ? run.blockchain[blockHeightKey] : null)
      }
    })

    test('25 chain limit', async () => {
      for (let i = 0; i < 25; i++) {
        const utxo = (await run.blockchain.utxos(run.purse.address))[0]
        const tx = new Transaction().from(utxo).change(run.purse.address).sign(run.purse.privkey)
        await run.blockchain.broadcast(tx)
      }
      const utxo = (await run.blockchain.utxos(run.purse.address))[0]
      const tx = new Transaction().from(utxo).change(run.purse.address).sign(run.purse.privkey)
      await expect(run.blockchain.broadcast(tx)).rejects.toThrow('too-long-mempool-chain')
      run.blockchain.block()
      await run.blockchain.broadcast(tx)
    })
  })

  describe('performance', () => {
    test('broadcast', async () => {
      const utxo = (await run.blockchain.utxos(run.purse.address))[0]
      const start = new Date()
      const tx = new Transaction().from(utxo).change(run.purse.address).sign(run.purse.privkey)
      await run.blockchain.broadcast(tx)
      expect(new Date() - start).toBeLessThan(200)
    })

    test('fetch', async () => {
      let utxo = (await run.blockchain.utxos(run.purse.address))[0]
      const earlyTxid = utxo.txid
      const measures = []
      for (let i = 0; i < 1000; i++) {
        const tx = new Transaction().from(utxo).change(run.purse.address).sign(run.purse.privkey)
        utxo = { txid: tx.hash, vout: 0, script: tx.outputs[0].script, satoshis: tx.outputs[0].satoshis }
        await run.blockchain.broadcast(tx)
        const before = new Date()
        await run.blockchain.fetch(tx.hash)
        await run.blockchain.fetch(earlyTxid)
        measures.push(new Date() - before)
      }
      const start = measures.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      const end = measures.slice(measures.length - 3).reduce((a, b) => a + b, 0) / 3
      expect(start).toBeLessThan(10)
      expect(end).toBeLessThan(10)
    })

    test('utxos', async () => {
      const privateKeys = []; const addresses = []
      for (let i = 0; i < 10; i++) { privateKeys.push(new PrivateKey()) }
      privateKeys.forEach(privateKey => addresses.push(privateKey.toAddress()))
      addresses.forEach(address => run.blockchain.fund(address, 100000))
      const measures = []
      for (let i = 0; i < 1000; i++) {
        const before = new Date()
        const utxos = await run.blockchain.utxos(addresses[i % 10])
        measures.push(new Date() - before)
        const tx = new Transaction().from(utxos).to(addresses[(i + 1) % 10], 1000)
          .change(addresses[i % 10]).sign(privateKeys[i % 10])
        await run.blockchain.broadcast(tx)
      }
      const start = measures.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      const end = measures.slice(measures.length - 3).reduce((a, b) => a + b, 0) / 3
      expect(start).toBeLessThan(10)
      expect(end).toBeLessThan(10)
    })
  })
})
