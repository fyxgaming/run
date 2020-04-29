/**
 * local-purse.js
 *
 * Tests for lib/module/local-purse.js
 */

const { PrivateKey, Transaction } = require('bsv')
const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('../env/config')
const { LocalPurse } = Run
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// LocalPurse tests
// ------------------------------------------------------------------------------------------------

describe('LocalPurse', () => {
  const run = new Run()

  describe('constructor', () => {
    describe('key', () => {
      it('should generate random purse if unspecified', () => {
        const defaultPurse = Run.defaults.purse
        try {
          Run.defaults.purse = undefined
          expect(run.purse.bsvPrivateKey.toString()).not.to.equal(new Run().purse.bsvPrivateKey.toString())
          expect(run.purse.privkey).not.to.equal(new Run().purse.privkey)
        } finally {
          Run.defaults.purse = defaultPurse
        }
      })

      it('should calculate address correctly from private key', () => {
        expect(run.purse.bsvPrivateKey.toAddress().toString()).to.equal(run.purse.address)
      })

      it('should support passing in private key', () => {
        const privkey = new PrivateKey()
        const run = new Run({ purse: privkey })
        expect(run.purse.privkey).to.equal(privkey.toString())
        expect(run.purse.bsvPrivateKey).to.deep.equal(privkey)
      })

      it('should throw if private key is on wrong network', () => {
        const purse = new PrivateKey('mainnet').toString()
        expect(() => new Run({ purse, network: 'test' })).to.throw('Private key network mismatch')
      })
    })

    describe('splits', () => {
      it('should support passing in valid splits', () => {
        expect(new LocalPurse({ blockchain: run.blockchain, splits: 1 }).splits).to.equal(1)
        expect(new LocalPurse({ blockchain: run.blockchain, splits: 5 }).splits).to.equal(5)
        expect(new LocalPurse({ blockchain: run.blockchain, splits: Number.MAX_SAFE_INTEGER }).splits).to.equal(Number.MAX_SAFE_INTEGER)
      })

      it('should default to 10 if not specified', () => {
        expect(new LocalPurse({ blockchain: run.blockchain }).splits).to.equal(10)
      })

      it('should throw if pass in invalid splits', () => {
        expect(() => new LocalPurse({ blockchain: run.blockchain, splits: 0 })).to.throw('splits must be at least 1: 0')
        expect(() => new LocalPurse({ blockchain: run.blockchain, splits: -1 })).to.throw('splits must be at least 1: -1')
        expect(() => new LocalPurse({ blockchain: run.blockchain, splits: 1.5 })).to.throw('splits must be an integer: 1.5')
        expect(() => new LocalPurse({ blockchain: run.blockchain, splits: NaN })).to.throw('splits must be an integer: NaN')
        expect(() => new LocalPurse({ blockchain: run.blockchain, splits: Number.POSITIVE_INFINITY })).to.throw('splits must be an integer: Infinity')
        expect(() => new LocalPurse({ blockchain: run.blockchain, splits: false })).to.throw('Invalid splits: false')
        expect(() => new LocalPurse({ blockchain: run.blockchain, splits: null })).to.throw('Invalid splits: null')
      })
    })

    describe('feePerKb', () => {
      it('should support passing in valid feePerKb', () => {
        expect(new LocalPurse({ blockchain: run.blockchain, feePerKb: 1.5 }).feePerKb).to.equal(1.5)
        expect(new LocalPurse({ blockchain: run.blockchain, feePerKb: 1000 }).feePerKb).to.equal(1000)
        expect(new LocalPurse({ blockchain: run.blockchain, feePerKb: Number.MAX_SAFE_INTEGER }).feePerKb).to.equal(Number.MAX_SAFE_INTEGER)
        expect(new LocalPurse({ blockchain: run.blockchain, feePerKb: 0 }).feePerKb).to.equal(0)
      })

      it('should throw if pass in invalid feePerKb', () => {
        expect(() => new LocalPurse({ blockchain: run.blockchain, feePerKb: -1 })).to.throw('feePerKb must be non-negative: -1')
        expect(() => new LocalPurse({ blockchain: run.blockchain, feePerKb: NaN })).to.throw('feePerKb must be finite: NaN')
        expect(() => new LocalPurse({ blockchain: run.blockchain, feePerKb: Number.POSITIVE_INFINITY })).to.throw('feePerKb must be finite: Infinity')
        expect(() => new LocalPurse({ blockchain: run.blockchain, feePerKb: false })).to.throw('Invalid feePerKb: false')
        expect(() => new LocalPurse({ blockchain: run.blockchain, feePerKb: null })).to.throw('Invalid feePerKb: null')
      })

      it('should default to 500 if not specified', () => {
        expect(new LocalPurse({ blockchain: run.blockchain }).feePerKb).to.equal(500)
      })
    })

    describe('blockchain', () => {
      it('should support passing in valid blockchain', () => {
        const mockchain = new Run.Mockchain()
        expect(new LocalPurse({ blockchain: mockchain }).blockchain).to.equal(mockchain)
        const blockchainApi = new Run.BlockchainApi()
        expect(new LocalPurse({ blockchain: blockchainApi }).blockchain).to.equal(blockchainApi)
      })

      it('should throw if pass in invalid blockchain', () => {
        expect(() => new LocalPurse({ blockchain: false })).to.throw('Invalid blockchain: false')
        expect(() => new LocalPurse({ blockchain: null })).to.throw('Invalid blockchain: null')
      })

      it('should require passing in blockchain', () => {
        expect(() => new LocalPurse()).to.throw('blockchain is required')
      })
    })
  })

  describe('splits', () => {
    it('should throw if set invalid value', () => {
      expect(() => { run.purse.splits = -1 }).to.throw('splits must be at least 1: -1')
    })
  })

  describe('feePerKb', () => {
    it('should throw if set invalid value', () => {
      expect(() => { run.purse.feePerKb = -1 }).to.throw('feePerKb must be non-negative: -1')
    })
  })

  describe('pay', () => {
    it('should add inputs and outputs', async () => {
      const address = new PrivateKey().toAddress()
      const tx = new Transaction().to(address, Transaction.DUST_AMOUNT)
      const tx2 = await run.purse.pay(tx)
      expect(tx2.inputs.length > 0).to.equal(true)
      expect(tx2.outputs.length > 1).to.equal(true)
    })

    it('should throw if not enough funds', async () => {
      const address = new PrivateKey().toAddress()
      const tx = new Transaction().to(address, Number.MAX_SAFE_INTEGER)
      await expect(run.purse.pay(tx)).to.be.rejectedWith('Not enough funds')
    })

    it('should throw if no utxos', async () => {
      const address = new PrivateKey().toAddress()
      const tx = new Transaction().to(address, Transaction.DUST_AMOUNT)
      const purse = new LocalPurse({ blockchain: run.blockchain })
      await expect(purse.pay(tx)).to.be.rejectedWith('Not enough funds')
    })

    it('should automatically split utxos', async () => {
      const address = new PrivateKey().toAddress()
      const tx = await run.purse.pay(new Transaction().to(address, Transaction.DUST_AMOUNT))
      await run.blockchain.broadcast(tx)
      const utxos = await run.blockchain.utxos(run.purse.address)
      expect(utxos.length).to.equal(10)
    })

    it('should shuffle UTXOs', async () => {
      const address = new PrivateKey().toAddress()
      const tx = await run.purse.pay(new Transaction().to(address, Transaction.DUST_AMOUNT))
      await run.blockchain.broadcast(tx)
      const txBase = await run.purse.pay(new Transaction().to(address, Transaction.DUST_AMOUNT))
      for (let i = 0; i < 100; i++) {
        const tx2 = await run.purse.pay(new Transaction().to(address, Transaction.DUST_AMOUNT))
        const sameTxId = tx2.inputs[0].prevTxId.toString() === txBase.inputs[0].prevTxId.toString()
        const sameIndex = tx2.inputs[0].outputIndex === txBase.inputs[0].outputIndex
        if (!sameTxId || !sameIndex) return
      }
      throw new Error('Did not shuffle UTXOs')
    })

    it('should respect custom feePerKb', async () => {
      const address = new PrivateKey().toAddress()
      const run = new Run()
      run.purse.feePerKb = 1
      const tx = await run.purse.pay(new Transaction().to(address, Transaction.DUST_AMOUNT))
      const feePerKb = tx.getFee() / tx.toBuffer().length * 1000
      const diffFees = Math.abs(feePerKb - 1)
      expect(diffFees < 10).to.equal(true)
      run.purse.feePerKb = 2000
      const tx2 = await run.purse.pay(new Transaction().to(address, Transaction.DUST_AMOUNT))
      const feePerKb2 = tx2.getFee() / tx2.toBuffer().length * 1000
      const diffFees2 = Math.abs(feePerKb2 - 2000)
      expect(diffFees2 < 10).to.equal(true)
    })

    it('should respect custom splits', async () => {
      const address = new PrivateKey().toAddress()
      const run = new Run()
      run.purse.splits = 1
      const numUtxosBefore = (await run.purse.utxos()).length
      const tx = await run.purse.pay(new Transaction().to(address, Transaction.DUST_AMOUNT))
      expect(tx.outputs.length - 1 <= numUtxosBefore).to.equal(true)
      run.purse.splits = 20
      const tx2 = await run.purse.pay(new Transaction().to(address, Transaction.DUST_AMOUNT))
      expect(numUtxosBefore - tx2.inputs.length + tx2.outputs.length - 1 >= 20).to.equal(true)
    })

    it('should still have a change output when splits is lower than number of utxos', async () => {
      const address = new PrivateKey().toAddress()
      const run = new Run()
      const tx = await run.purse.pay(new Transaction().to(address, Transaction.DUST_AMOUNT))
      await run.blockchain.broadcast(tx)
      expect((await run.purse.utxos()).length >= 10).to.equal(true)
      run.purse.splits = 5
      const tx2 = await run.purse.pay(new Transaction().to(address, Transaction.DUST_AMOUNT))
      expect(tx2.outputs.length).to.equal(2)
      expect(tx2.getFee() < 1000).to.equal(true)
    })
  })

  describe('balance', () => {
    it('should sum non-jig and non-class utxos', async () => {
      const address = new PrivateKey().toAddress()
      const send = await run.purse.pay(new Transaction().to(address, Transaction.DUST_AMOUNT), run.purse.bsvPrivateKey, run.blockchain)
      await run.blockchain.broadcast(send)
      new Run({ owner: run.purse.bsvPrivateKey, blockchain: run.blockchain }) // eslint-disable-line
      class A extends Jig { init () { this.satoshis = 888 } }
      await new A().sync()
      const utxos = await run.blockchain.utxos(run.purse.script)
      const nonJigUtxos = utxos.filter(utxo => utxo.satoshis > 100000)
      const balance = nonJigUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)
      expect(await run.purse.balance()).to.equal(balance)
    })
  })

  describe('utxos', () => {
    it('should return non-jig and non-class utxos', async () => {
      const run2 = new Run({ owner: run.purse.bsvPrivateKey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 888 } }
      await new A().sync()
      expect((await run2.purse.utxos()).length).to.equal(10)
    })
  })
})

// ------------------------------------------------------------------------------------------------
