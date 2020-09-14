/**
 * local-purse.js
 *
 * Tests for lib/module/local-purse.js
 */

const { PrivateKey } = require('bsv')
const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { LocalPurse } = Run

// ------------------------------------------------------------------------------------------------
// LocalPurse tests
// ------------------------------------------------------------------------------------------------

describe('LocalPurse', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    describe('key', () => {
      it('generates random purse if unspecified', () => {
        const blockchain = new Run().blockchain
        const purse = new LocalPurse({ blockchain })
        expect(purse.bsvPrivateKey.toString()).not.to.equal(new LocalPurse({ blockchain }).bsvPrivateKey.toString())
        expect(purse.privkey).not.to.equal(new LocalPurse({ blockchain }).privkey)
      })

      // ----------------------------------------------------------------------

      it('calculates address correctly', () => {
        const blockchain = new Run().blockchain
        const purse = new LocalPurse({ blockchain })
        expect(purse.bsvPrivateKey.toAddress().toString()).to.equal(purse.address)
      })

      // ----------------------------------------------------------------------

      it('pass in private key', () => {
        const blockchain = new Run().blockchain
        const privkey = new PrivateKey()
        const purse = new LocalPurse({ privkey, blockchain })
        expect(purse.privkey).to.equal(privkey.toString())
        expect(purse.bsvPrivateKey).to.deep.equal(privkey)
      })

      // ----------------------------------------------------------------------

      it('throws if private key is on wrong network', () => {
        const privkey = new PrivateKey('mainnet').toString()
        const blockchain = new Run({ network: 'test' }).blockchain
        expect(() => new LocalPurse({ privkey, blockchain })).to.throw('Private key network mismatch')
      })
    })

    // --------------------------------------------------------------------------
    // splits
    // --------------------------------------------------------------------------

    describe('splits', () => {
      it('valid splits', () => {
        const blockchain = new Run().blockchain
        expect(new LocalPurse({ blockchain, splits: 1 }).splits).to.equal(1)
        expect(new LocalPurse({ blockchain, splits: 5 }).splits).to.equal(5)
        expect(new LocalPurse({ blockchain, splits: Number.MAX_SAFE_INTEGER }).splits).to.equal(Number.MAX_SAFE_INTEGER)
      })

      // ----------------------------------------------------------------------

      it('default to 10 if not specified', () => {
        const blockchain = new Run().blockchain
        expect(new LocalPurse({ blockchain }).splits).to.equal(10)
      })

      // ----------------------------------------------------------------------

      it('throws if invalid splits', () => {
        const blockchain = new Run().blockchain
        expect(() => new LocalPurse({ blockchain, splits: 0 })).to.throw('splits must be at least 1: 0')
        expect(() => new LocalPurse({ blockchain, splits: -1 })).to.throw('splits must be at least 1: -1')
        expect(() => new LocalPurse({ blockchain, splits: 1.5 })).to.throw('splits must be an integer: 1.5')
        expect(() => new LocalPurse({ blockchain, splits: NaN })).to.throw('splits must be an integer: NaN')
        expect(() => new LocalPurse({ blockchain, splits: Number.POSITIVE_INFINITY })).to.throw('splits must be an integer: Infinity')
        expect(() => new LocalPurse({ blockchain, splits: false })).to.throw('Invalid splits: false')
        expect(() => new LocalPurse({ blockchain, splits: null })).to.throw('Invalid splits: null')
      })
    })

    // --------------------------------------------------------------------------
    // feePerKb
    // --------------------------------------------------------------------------

    describe('feePerKb', () => {
      it('valid feePerKb', () => {
        const blockchain = new Run().blockchain
        expect(new LocalPurse({ blockchain, feePerKb: 1.5 }).feePerKb).to.equal(1.5)
        expect(new LocalPurse({ blockchain, feePerKb: 1000 }).feePerKb).to.equal(1000)
        expect(new LocalPurse({ blockchain, feePerKb: Number.MAX_SAFE_INTEGER }).feePerKb).to.equal(Number.MAX_SAFE_INTEGER)
        expect(new LocalPurse({ blockchain, feePerKb: 0 }).feePerKb).to.equal(0)
      })

      // ----------------------------------------------------------------------

      it('defaults to 500 if not specified', () => {
        const blockchain = new Run().blockchain
        expect(new LocalPurse({ blockchain }).feePerKb).to.equal(500)
      })

      // ----------------------------------------------------------------------

      it('throws if invalid feePerKb', () => {
        const blockchain = new Run().blockchain
        expect(() => new LocalPurse({ blockchain, feePerKb: -1 })).to.throw('feePerKb must be non-negative: -1')
        expect(() => new LocalPurse({ blockchain, feePerKb: NaN })).to.throw('feePerKb must be finite: NaN')
        expect(() => new LocalPurse({ blockchain, feePerKb: Number.POSITIVE_INFINITY })).to.throw('feePerKb must be finite: Infinity')
        expect(() => new LocalPurse({ blockchain, feePerKb: false })).to.throw('Invalid feePerKb: false')
        expect(() => new LocalPurse({ blockchain, feePerKb: null })).to.throw('Invalid feePerKb: null')
      })
    })

    // --------------------------------------------------------------------------
    // blockchain
    // --------------------------------------------------------------------------

    describe('blockchain', () => {
      it('should support passing in valid blockchain', () => {
        const mockchain = new Run.Mockchain()
        expect(new LocalPurse({ blockchain: mockchain }).blockchain).to.equal(mockchain)
        const remoteBlockchain = Run.RemoteBlockchain.create()
        expect(new LocalPurse({ blockchain: remoteBlockchain }).blockchain).to.equal(remoteBlockchain)
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

  /*
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
      const tx2 = await payFor(tx, run)
      expect(tx2.inputs.length > 0).to.equal(true)
      expect(tx2.outputs.length > 1).to.equal(true)
    })

    it('should throw if not enough funds', async () => {
      const address = new PrivateKey().toAddress()
      const tx = new Transaction().to(address, Number.MAX_SAFE_INTEGER)
      await expect(payFor(tx, run)).to.be.rejectedWith('Not enough funds')
    })

    it('should throw if no utxos', async () => {
      const address = new PrivateKey().toAddress()
      const tx = new Transaction().to(address, Transaction.DUST_AMOUNT)
      const purse = new LocalPurse({ blockchain: run.blockchain })
      const oldPurse = run.purse
      run.purse = purse
      await expect(payFor(tx, run)).to.be.rejectedWith('Not enough funds')
      run.purse = oldPurse
    })

    it('should automatically split utxos', async () => {
      const address = new PrivateKey().toAddress()
      const tx = await payFor(new Transaction().to(address, Transaction.DUST_AMOUNT), run)
      await run.blockchain.broadcast(tx)
      const utxos = await run.blockchain.utxos(run.purse.address)
      expect(utxos.length).to.equal(10)
    })

    it('should shuffle UTXOs', async () => {
      const address = new PrivateKey().toAddress()
      const tx = await payFor(new Transaction().to(address, Transaction.DUST_AMOUNT), run)
      await run.blockchain.broadcast(tx)
      const txBase = await payFor(new Transaction().to(address, Transaction.DUST_AMOUNT), run)
      for (let i = 0; i < 100; i++) {
        const tx2 = await payFor(new Transaction().to(address, Transaction.DUST_AMOUNT), run)
        const sametxid = tx2.inputs[0].prevTxId.toString('hex') === txBase.inputs[0].prevTxId.toString('hex')
        const samevout = tx2.inputs[0].outputIndex === txBase.inputs[0].outputIndex
        if (!sametxid || !samevout) return
      }
      throw new Error('Did not shuffle UTXOs')
    })

    it('should respect custom feePerKb', async () => {
      const address = new PrivateKey().toAddress()
      const run = new Run()
      run.purse.feePerKb = 1
      const tx = await payFor(new Transaction().to(address, Transaction.DUST_AMOUNT), run)
      const feePerKb = tx.getFee() / tx.toBuffer().length * 1000
      const diffFees = Math.abs(feePerKb - 1) / feePerKb
      expect(diffFees < 10).to.equal(true)
      run.purse.feePerKb = 2000
      const tx2 = await payFor(new Transaction().to(address, Transaction.DUST_AMOUNT), run)
      const feePerKb2 = tx2.getFee() / tx2.toBuffer().length * 1000
      const diffFees2 = Math.abs(feePerKb2 - 2000) / feePerKb2
      expect(diffFees2 < 0.01).to.equal(true) // 1% difference
    })

    it('should respect custom splits', async () => {
      const address = new PrivateKey().toAddress()
      const run = new Run()
      run.purse.splits = 1
      const numUtxosBefore = (await run.purse.utxos()).length
      const tx = await payFor(new Transaction().to(address, Transaction.DUST_AMOUNT), run)
      expect(tx.outputs.length - 1 <= numUtxosBefore).to.equal(true)
      run.purse.splits = 20
      const tx2 = await payFor(new Transaction().to(address, Transaction.DUST_AMOUNT), run)
      expect(numUtxosBefore - tx2.inputs.length + tx2.outputs.length - 1 >= 20).to.equal(true)
    })

    it('should still have a change output when splits is lower than number of utxos', async () => {
      const address = new PrivateKey().toAddress()
      const run = new Run()
      const tx = await payFor(new Transaction().to(address, Transaction.DUST_AMOUNT), run)
      await run.blockchain.broadcast(tx)
      expect((await run.purse.utxos()).length >= 10).to.equal(true)
      run.purse.splits = 5
      const tx2 = await payFor(new Transaction().to(address, Transaction.DUST_AMOUNT), run)
      expect(tx2.outputs.length).to.equal(2)
      expect(tx2.getFee() < 1000).to.equal(true)
    })

    it('should receive change from extra inputs', async () => {
      const run = new Run()
      const tx1 = await payFor(new Transaction().to(run.owner.address, 10000), run)
      await run.blockchain.broadcast(tx1)
      const utxo = { txid: tx1.hash, vout: 0, script: tx1.outputs[0].script, satoshis: 10000 }
      const tx2 = await payFor(new Transaction().from(utxo), run)
      expect(tx2.outputs[0].satoshis > 9000).to.equal(true)
    })

    it('should not receive change if not enough to receive dust', async () => {
      const run = new Run()
      const tx1 = await payFor(new Transaction().to(run.owner.address, 546), run)
      await run.blockchain.broadcast(tx1)
      const utxo = { txid: tx1.hash, vout: 0, script: tx1.outputs[0].script, satoshis: 10000 }
      const tx2 = await payFor(new Transaction().from(utxo), run)
      expect(tx2.outputs.length).to.equal(0)
    })

    it('should not pay with jig utxo', async () => {
      const run = new Run()
      class Dragon extends Jig { }
      new Dragon() // eslint-disable-line
      await run.sync()
      const run2 = new Run({ purse: run.owner.privkey, manual: true })
      new Dragon() // eslint-disable-line
      await expect(run2.sync()).to.be.rejectedWith('Not enough funds')
    })
  })

  describe('balance', () => {
    it('should sum non-jig utxos', async () => {
      const address = new PrivateKey().toAddress()
      const send = await payFor(new Transaction().to(address, Transaction.DUST_AMOUNT), run)
      await run.blockchain.broadcast(send)
      new Run({ owner: run.purse.bsvPrivateKey, blockchain: run.blockchain }) // eslint-disable-line
      class A extends Jig { init () { this.satoshis = 888 } }
      const a = new A()
      await a.sync()
      const utxos = await run.blockchain.utxos(run.purse.script)
      const nonJigUtxos = utxos.filter(utxo => utxo.satoshis > 100000)
      const balance = nonJigUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)
      expect(await run.purse.balance()).to.equal(balance)
    })
  })

  describe('utxos', () => {
    it('should return non-jig utxos', async () => {
      const run2 = new Run({ owner: run.purse.bsvPrivateKey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 888 } }
      const a = new A()
      await a.sync()
      expect((await run2.purse.utxos()).length).to.equal(10)
    })
  })
  */
})

// ------------------------------------------------------------------------------------------------