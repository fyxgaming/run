/**
 * local-purse.js
 *
 * Tests for lib/module/local-purse.js
 */

const { PrivateKey } = require('bsv')
const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('../config')
const { LocalPurse } = Run.module

// ------------------------------------------------------------------------------------------------
// Purse tests
// ------------------------------------------------------------------------------------------------

describe('Purse', () => {
  const run = new Run()

  describe('constructor', () => {
    describe('key', () => {
      it('should generate random purse if unspecified', () => {
        expect(run.purse.bsvPrivateKey.toString()).not.to.equal(new Run().purse.bsvPrivateKey.toString())
        expect(run.purse.privkey).not.to.equal(new Run().purse.privkey)
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

    describe('logger', () => {
      it('should support passing in valid logger', () => {
        expect(new LocalPurse({ blockchain: run.blockchain, logger: console }).logger).to.equal(console)
      })

      it('should support passing in null logger', () => {
        expect(new LocalPurse({ blockchain: run.blockchain, logger: null }).logger).to.equal(null)
      })

      it('should support not passing in a logger', () => {
        expect(new LocalPurse({ blockchain: run.blockchain }).logger).to.equal(null)
      })

      it('should throw if pass in an invalid logger', () => {
        expect(() => new LocalPurse({ blockchain: run.blockchain, logger: 123 })).to.throw('Invalid logger: 123')
        expect(() => new LocalPurse({ blockchain: run.blockchain, logger: () => {} })).to.throw('Invalid logger: ')
        expect(() => new LocalPurse({ blockchain: run.blockchain, logger: false })).to.throw('Invalid logger: false')
      })
    })

    describe('splits', () => {
      /*
      it('should support passing in valid splits', () => {
        expect(new Purse({ blockchain: run.blockchain, splits: 1 }).splits).to.equal(1)
        expect(new Purse({ blockchain: run.blockchain, splits: 5 }).splits).to.equal(5)
        expect(new Purse({ blockchain: run.blockchain, splits: Number.MAX_SAFE_INTEGER }).splits).to.equal(Number.MAX_SAFE_INTEGER)
      })

      it('should default to 10 if not specified', () => {
        expect(new Purse({ blockchain: run.blockchain }).splits).to.equal(10)
      })

      it('should throw if pass in invalid splits', () => {
        expect(() => new Purse({ blockchain: run.blockchain, splits: 0 })).to.throw('Option splits must be at least 1: 0')
        expect(() => new Purse({ blockchain: run.blockchain, splits: -1 })).to.throw('Option splits must be at least 1: -1')
        expect(() => new Purse({ blockchain: run.blockchain, splits: 1.5 })).to.throw('Option splits must be an integer: 1.5')
        expect(() => new Purse({ blockchain: run.blockchain, splits: NaN })).to.throw('Option splits must be an integer: NaN')
        expect(() => new Purse({ blockchain: run.blockchain, splits: Number.POSITIVE_INFINITY })).to.throw('Option splits must be an integer: Infinity')
        expect(() => new Purse({ blockchain: run.blockchain, splits: false })).to.throw('Invalid splits option: false')
        expect(() => new Purse({ blockchain: run.blockchain, splits: null })).to.throw('Invalid splits option: null')
      })
      */
    })

    describe('feePerKb', () => {
      /*
      it('should support passing in valid feePerKb', () => {
        expect(new Purse({ blockchain: run.blockchain, feePerKb: 1.5 }).feePerKb).to.equal(1.5)
        expect(new Purse({ blockchain: run.blockchain, feePerKb: 1000 }).feePerKb).to.equal(1000)
        expect(new Purse({ blockchain: run.blockchain, feePerKb: Number.MAX_SAFE_INTEGER }).feePerKb).to.equal(Number.MAX_SAFE_INTEGER)
        expect(new Purse({ blockchain: run.blockchain, feePerKb: 0 }).feePerKb).to.equal(0)
      })

      it('should throw if pass in invalid feePerKb', () => {
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: -1 })).to.throw('Option feePerKb must be non-negative: -1')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: NaN })).to.throw('Option feePerKb must be finite: NaN')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: Number.POSITIVE_INFINITY })).to.throw('Option feePerKb must be finite: Infinity')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: false })).to.throw('Invalid feePerKb option: false')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: null })).to.throw('Invalid feePerKb option: null')
      })

      it('should default to 1000 if not specified', () => {
        expect(new Purse({ blockchain: run.blockchain }).feePerKb).to.equal(1000)
      })
      */
    })

    describe('blockchain', () => {
      /*
      it('should support passing in valid blockchain', () => {
        const mockchain = new Run.Mockchain()
        expect(new Purse({ blockchain: mockchain }).blockchain).to.equal(mockchain)
        const blockchainServer = new Run.BlockchainServer()
        expect(new Purse({ blockchain: blockchainServer }).blockchain).to.equal(blockchainServer)
      })

      it('should throw if pass in invalid blockchain', () => {
        expect(() => new Purse({ blockchain: {} })).to.throw('Invalid blockchain option')
        expect(() => new Purse({ blockchain: false })).to.throw('Invalid blockchain option: false')
      })

      it('should require passing in blockchain', () => {
        expect(() => new Purse()).to.throw('Option blockchain is required')
      })
      */
    })
  })

  describe('splits', () => {
    /*
    it('should throw if set invalid value', () => {
      expect(() => { run.purse.splits = -1 }).to.throw('Option splits must be at least 1: -1')
    })
    */
  })

  describe('feePerKb', () => {
    /*
    it('should throw if set invalid value', () => {
      expect(() => { run.purse.feePerKb = -1 }).to.throw('Option feePerKb must be non-negative: -1')
    })
    */
  })

  describe('pay', () => {
    /*
    it('should adds inputs and outputs', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, 100)
      const tx2 = await run.purse.pay(tx)
      expect(tx2.inputs.length).to.equal(1)
      expect(tx2.outputs.length).to.equal(11)
    })

    it('should throw if not enough funds', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, Number.MAX_SAFE_INTEGER)
      await expect(run.purse.pay(tx)).to.be.rejectedWith('Not enough funds')
    })

    it('should throw if no utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, 100)
      let didLogWarning = false
      const logger = { warn: () => { didLogWarning = true } }
      const purse = new Purse({ blockchain: run.blockchain, logger })
      await expect(purse.pay(tx)).to.be.rejectedWith('Not enough funds')
      expect(didLogWarning).to.equal(true)
      const purseWithNoLogger = new Purse({ blockchain: run.blockchain, logger: null })
      await expect(purseWithNoLogger.pay(tx)).to.be.rejectedWith('Not enough funds')
    })

    it('should automatically split utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      await run.blockchain.broadcast(tx)
      const utxos = await run.blockchain.utxos(run.purse.address)
      expect(utxos.length).to.equal(10)
    })

    it('should shuffle UTXOs', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      await run.blockchain.broadcast(tx)
      const txBase = await run.purse.pay(new bsv.Transaction().to(address, 100))
      for (let i = 0; i < 100; i++) {
        const tx2 = await run.purse.pay(new bsv.Transaction().to(address, 100))
        const sameTxId = tx2.inputs[0].prevTxId.toString() === txBase.inputs[0].prevTxId.toString()
        const sameIndex = tx2.inputs[0].outputIndex === txBase.inputs[0].outputIndex
        if (!sameTxId || !sameIndex) return
      }
      throw new Error('Did not shuffle UTXOs')
    })

    it('should respect custom feePerKb', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const run = createRun()
      run.purse.feePerKb = 1
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      const feePerKb = tx.getFee() / tx.toBuffer().length * 1000
      const diffFees = Math.abs(feePerKb - 1)
      expect(diffFees < 10).to.equal(true)
      run.purse.feePerKb = 2000
      const tx2 = await run.purse.pay(new bsv.Transaction().to(address, 100))
      const feePerKb2 = tx2.getFee() / tx2.toBuffer().length * 1000
      const diffFees2 = Math.abs(feePerKb2 - 2000)
      expect(diffFees2 < 10).to.equal(true)
    })

    it('should respect custom splits', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const run = createRun()
      run.purse.splits = 1
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      expect(tx.outputs.length).to.equal(2)
      run.purse.splits = 20
      const tx2 = await run.purse.pay(new bsv.Transaction().to(address, 100))
      expect(tx2.outputs.length).to.equal(21)
    })

    it('should still have a change output when splits is lower than number of utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const run = createRun()
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      await run.blockchain.broadcast(tx)
      expect(tx.outputs.length).to.equal(11)
      run.purse.splits = 5
      const tx2 = await run.purse.pay(new bsv.Transaction().to(address, 100))
      expect(tx2.outputs.length).to.equal(2)
      expect(tx2.getFee() < 1000).to.equal(true)
    })
    */
  })

  describe('balance', () => {
    /*
    it('should sum non-jig and non-class utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const send = await payFor(new bsv.Transaction().to(address, 9999), run.purse.bsvPrivateKey, run.blockchain)
      await run.blockchain.broadcast(send)
      createRun({ owner: run.purse.bsvPrivateKey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 8888 } }
      await new A().sync()
      const utxos = await run.blockchain.utxos(run.purse.address)
      const nonJigUtxos = utxos.filter(utxo => utxo.satoshis > 100000)
      const balance = nonJigUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)
      expect(await run.purse.balance()).to.equal(balance)
    })
    */
  })

  describe('utxos', () => {
    /*
    it('should return non-jig and non-class utxos', async () => {
      const run2 = createRun({ owner: run.purse.bsvPrivateKey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 8888 } }
      await new A().sync()
      expect((await run2.purse.utxos()).length).to.equal(10)
    })
    */
  })
})

// ------------------------------------------------------------------------------------------------
