const { PrivateKey, Transaction } = require('bsv')
const { createRun, Run, getObfuscatedKey } = require('./test-util')
const { Api } = Run

const txCacheKey = getObfuscatedKey('txCache')

describe('Blockchain', () => {
  describe('constructor', () => {
    test('return mainnet blockchain', () => {
      expect(createRun({ network: 'main' }).blockchain).toBeDefined()
    })

    test('return testnet blockchain', () => {
      expect(createRun({ network: 'test' }).blockchain).toBeDefined()
    })

    test('return scaling blockchain', () => {
      expect(createRun({ network: 'stn' }).blockchain).toBeDefined()
    })

    test('return mock blockchain', () => {
      expect(createRun({ network: 'mock' }).blockchain).toBeDefined()
    })

    test('throw if bad network', () => {
      expect(() => createRun({ network: 'bitcoin' })).toThrow()
    })
  })
})

function runBlockchainTestSuite (name, blockchain, privateKey, sampleTx,
  supportsSpentTxIdInBlocks, supportsSpentTxIdInMempool, indexingLatency, errors) {
  const address = privateKey.toAddress().toString()

  jest.setTimeout(20000)

  describe(name, () => {
    describe('broadcast', () => {
      test('send to self', async () => {
        const utxos = (await blockchain.utxos(address)).slice(0, 1)
        const tx = new Transaction().from(utxos).change(address).fee(250).sign(privateKey)
        await blockchain.broadcast(tx)
      })

      test('throw if missing input', async () => {
        const utxos = await blockchain.utxos(address)
        const utxo = { ...utxos[0], vout: 999 }
        const tx = new Transaction().from(utxo).change(address).fee(250).sign(privateKey)
        await expect(blockchain.broadcast(tx)).rejects.toThrow(errors.missingInput)
      })

      test('throw if no inputs', async () => {
        const tx = new Transaction().to(address, 100)
        await expect(blockchain.broadcast(tx)).rejects.toThrow(errors.noInputs)
      })

      test('throw if no outputs', async () => {
        const utxos = await blockchain.utxos(address)
        const tx = new Transaction().from(utxos).sign(privateKey)
        await expect(blockchain.broadcast(tx)).rejects.toThrow(errors.noOutputs)
      })

      test('throw if fee too low', async () => {
        const utxos = await blockchain.utxos(address)
        const tx = new Transaction().from(utxos).change(address).fee(0).sign(privateKey)
        await expect(blockchain.broadcast(tx)).rejects.toThrow(errors.feeTooLow)
      })

      test('throw if not signed', async () => {
        const utxos = await blockchain.utxos(address)
        const tx = new Transaction().from(utxos).change(address).fee(250)
        await expect(blockchain.broadcast(tx)).rejects.toThrow(errors.notFullySigned)
      })

      test('throw if duplicate input', async () => {
        const utxos = await blockchain.utxos(address)
        const tx = new Transaction().from(utxos).from(utxos).change(address).sign(privateKey)
        await expect(blockchain.broadcast(tx)).rejects.toThrow(errors.duplicateInput)
      })
    })

    describe('fetch', () => {
      test('return transaction', async () => {
        const tx = await blockchain.fetch(sampleTx.txid)
        expect(tx.hash).toBe(sampleTx.txid)
      })

      test('has time', async () => {
        const tx = await blockchain.fetch(sampleTx.txid)
        expect(tx.time).not.toBeUndefined()
        expect(tx.time > new Date('January 3, 2009')).toBe(true)
        expect(tx.time <= Date.now()).toBe(true)
      })

      test('caches repeated calls', async () => {
        const requests = []
        for (let i = 0; i < 100; i++) requests.push(blockchain.fetch(sampleTx.txid))
        await Promise.all(requests)
      })

      test('throw if nonexistant', async () => {
        const bad = '0000000000000000000000000000000000000000000000000000000000000000'
        const requests = [bad, bad, bad].map(txid => blockchain.fetch(txid))
        await expect(Promise.all(requests)).rejects.toThrow()
      })

      test('in mempool and unspent', async () => {
        const utxos = await blockchain.utxos(address)
        const tx = new Transaction().from(utxos).change(address).sign(privateKey)
        await blockchain.broadcast(tx)
        function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
        const tx2 = await blockchain.fetch(tx.hash)
        // check the cached copy
        expect(tx2.outputs[0].spentTxId).toBe(null)
        expect(tx2.outputs[0].spentIndex).toBe(null)
        expect(tx2.outputs[0].spentHeight).toBe(null)
        // check the uncached copy
        if (blockchain instanceof Api) {
          await sleep(indexingLatency)
          blockchain[txCacheKey].clear()
        }
        const tx3 = await blockchain.fetch(tx.hash)
        if (supportsSpentTxIdInMempool) {
          expect(tx3.outputs[0].spentTxId).toBe(null)
          expect(tx3.outputs[0].spentIndex).toBe(null)
          expect(tx3.outputs[0].spentHeight).toBe(null)
        } else {
          expect(tx3.outputs[0].spentTxId).toBeUndefined()
          expect(tx3.outputs[0].spentIndex).toBeUndefined()
          expect(tx3.outputs[0].spentHeight).toBeUndefined()
        }
        expect(tx3.confirmations).toBe(0)
      })

      test('in mempool and spent', async () => {
        const utxos = await blockchain.utxos(address)
        const tx = new Transaction().from(utxos).change(address).sign(privateKey)
        await blockchain.broadcast(tx)
        function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
        if (blockchain instanceof Api) {
          await sleep(indexingLatency)
          blockchain[txCacheKey].clear()
        }
        const prev = await blockchain.fetch(utxos[0].txid)
        if (supportsSpentTxIdInMempool) {
          expect(prev.outputs[utxos[0].vout].spentTxId).toBe(tx.hash)
          expect(prev.outputs[utxos[0].vout].spentIndex).toBe(0)
          expect(prev.outputs[utxos[0].vout].spentHeight).toBe(-1)
        } else {
          expect(prev.outputs[utxos[0].vout].spentTxId).toBeUndefined()
          expect(prev.outputs[utxos[0].vout].spentIndex).toBeUndefined()
          expect(prev.outputs[utxos[0].vout].spentHeight).toBeUndefined()
        }
      })

      test('in block and spent', async () => {
        const tx = await blockchain.fetch(sampleTx.txid)
        for (let i = 0; i < sampleTx.vout.length; i++) {
          if (supportsSpentTxIdInBlocks) {
            expect(tx.outputs[i].spentTxId).toBe(sampleTx.vout[i].spentTxId)
            expect(tx.outputs[i].spentIndex).toBe(sampleTx.vout[i].spentIndex)
            expect(tx.outputs[i].spentHeight).toBe(sampleTx.vout[i].spentHeight)
          } else {
            expect(tx.outputs[0].spentTxId).toBeUndefined()
            expect(tx.outputs[0].spentIndex).toBeUndefined()
            expect(tx.outputs[0].spentHeight).toBeUndefined()
          }
        }
        expect(tx.time).toBe(sampleTx.time)
        if (sampleTx.blockhash) {
          expect(tx.blockhash).toBe(sampleTx.blockhash)
          expect(tx.blocktime).toBe(sampleTx.blocktime)
          expect(tx.confirmations).toBeGreaterThan(sampleTx.minConfirmations)
        }
      })
    })

    describe('utxos', () => {
      test('return utxos if some', async () => {
        const utxos = await blockchain.utxos(address)
        expect(utxos.length).toBeGreaterThan(0)
        expect(utxos[0].txid).toBeDefined()
        expect(utxos[0].vout).toBeDefined()
        expect(utxos[0].script).toBeDefined()
        expect(utxos[0].satoshis).toBeDefined()
      })

      test('return empty list if none', async () => {
        const address = new PrivateKey(privateKey.network).toAddress()
        const utxos = await blockchain.utxos(address)
        expect(utxos.length).toBe(0)
      })

      test('dont return spent outputs', async () => {
        const prevUtxos = await blockchain.utxos(address)
        const tx = new Transaction().from(prevUtxos[0]).change(address).fee(250).sign(privateKey)
        await blockchain.broadcast(tx)
        const utxos = await blockchain.utxos(address)
        expect(utxos.length).toBe(prevUtxos.length)
        expect(utxos[prevUtxos.length - 1].txid).toEqual(tx.hash)
        expect(utxos[prevUtxos.length - 1].vout).toEqual(0)
      })

      test('caches repeated calls', async () => {
        const requests = []
        for (let i = 0; i < 100; i++) requests.push(blockchain.utxos(address))
        await Promise.all(requests)
      })

      test('throws for invalid address', async () => {
        const requests = ['123', '123', '123'].map(addr => blockchain.utxos(addr))
        await expect(Promise.all(requests)).rejects.toThrow()
      })
    })
  })
}

module.exports = runBlockchainTestSuite
