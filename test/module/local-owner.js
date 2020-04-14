/**
 * local-owner.js
 *
 * Tests for lib/module/local-owner.js
 */

const { PrivateKey, PublicKey, Address } = require('bsv')
const { describe, it, beforeEach } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('../env/config')
const { LocalOwner, Mockchain, Jig, GroupLock, StandardLock } = Run

// ------------------------------------------------------------------------------------------------
// LocalOwner
// ------------------------------------------------------------------------------------------------

describe('LocalOwner', () => {
  describe('constructor', () => {
    it('should create with expected properties', () => {
      const privateKey = new PrivateKey('testnet')
      const owner = new LocalOwner({ privkey: privateKey })

      expect(owner.privkey).to.equal(privateKey.toString())
      expect(owner.bsvPrivateKey).to.equal(privateKey)
      expect(owner.bsvPrivateKey instanceof PrivateKey).to.equal(true)

      expect(owner.pubkey).to.equal(privateKey.publicKey.toString())
      expect(owner.bsvPublicKey instanceof PublicKey).to.equal(true)
      expect(owner.bsvPublicKey.toString()).to.equal(privateKey.publicKey.toString())

      expect(owner.address).to.equal(privateKey.toAddress().toString())
      expect(owner.bsvAddress instanceof Address).to.equal(true)
      expect(owner.bsvAddress.toString()).to.equal(privateKey.toAddress().toString())
    })

    it('should support private key strings', () => {
      const privateKey = new PrivateKey('mainnet')
      const owner = new LocalOwner({ privkey: privateKey.toString() })
      expect(owner.privkey).to.equal(privateKey.toString())
      expect(owner.pubkey).to.equal(privateKey.publicKey.toString())
      expect(owner.address).to.equal(privateKey.toAddress().toString())
    })

    it('should randomly generate a key if no owner is specified', () => {
      const owner1 = new LocalOwner()
      const owner2 = new LocalOwner()
      expect(typeof owner1.privkey).to.equal('string')
      expect(typeof owner2.privkey).to.equal('string')
      expect(owner1.privkey).not.to.equal(owner2.privkey)
    })

    it('should throw if bad owner', () => {
      expect(() => new LocalOwner({ privkey: '123' })).to.throw('Invalid private key: "123"')
      expect(() => new LocalOwner({ privkey: new PrivateKey().publicKey })).to.throw('Invalid private key: [object PublicKey]')
    })

    it('throw if owner private key is on wrong network', () => {
      const privateKey = new PrivateKey('mainnet')
      const blockchain = new Mockchain()
      expect(() => new LocalOwner({ privkey: privateKey, blockchain })).to.throw('Private key network mismatch')
      expect(() => new LocalOwner({ privkey: privateKey.toString(), blockchain })).to.throw('Private key network mismatch')
    })
  })

  describe('next', () => {
    it('should always return the address', () => {
      const privateKey = new PrivateKey()
      const owner = new LocalOwner({ privkey: privateKey })
      expect(owner.next()).to.equal(owner.address)
      expect(owner.next()).to.equal(owner.address)
    })
  })

  describe('sign', () => {
    const run = new Run()
    beforeEach(() => run.activate())

    it('should sign 1-1 multisig', async () => {
      class A extends Jig {
        init (owner) { this.owner = owner }
        set () { this.n = 1 }
      }
      const a = new A(new GroupLock([run.owner.pubkey], 1))
      a.set()
      await a.sync()
    })

    it('should sign 2-3 multisig', async () => {
      const run2 = new Run()
      const run3 = new Run()
      class A extends Jig {
        init (owner) { this.owner = owner }
        set () { this.n = 1 }
      }

      // Create a jig with a 2-3 group owner
      run.activate()
      const a = new A(new GroupLock([run.owner.pubkey, run2.owner.pubkey, run3.owner.pubkey], 2))
      await a.sync()

      // Sign with pubkey 1 and export tx
      run.transaction.begin()
      a.set()
      await run.transaction.pay()
      await run.transaction.sign()
      const tx = run.transaction.export()
      run.transaction.rollback()

      // Sign with pubkey 2 and broadcast
      run2.activate()
      await run2.transaction.import(tx)
      await run2.transaction.sign()
      run2.transaction.end()
      await run2.sync()
    })

    it('should not sign if already signed', async () => {
      class A extends Jig {
        init (owner) { this.owner = owner }
        set () { this.n = 1 }
      }

      // Create a jig with a 2-3 group owner
      const a = new A(new GroupLock([run.owner.pubkey], 1))
      await a.sync()

      // Sign with pubkey 1 and export tx
      run.transaction.begin()
      a.set()
      await run.transaction.pay()

      // Sign more than once
      await run.transaction.sign()
      await run.transaction.sign()
      await run.transaction.sign()

      run.transaction.end()
      await run.sync()
    })

    it('should not sign if not our pubkey', async () => {
      const run2 = new Run()
      class A extends Jig {
        init (owner) { this.owner = owner }
        set () { this.n = 1 }
      }

      // Create a jig with a 2-3 group owner
      run.activate()
      const a = new A(new GroupLock([run2.owner.pubkey], 1))
      await a.sync()

      // Sign with pubkey 1 and export tx
      run.transaction.begin()
      a.set()
      await run.transaction.pay()
      await run.transaction.sign()
      const tx = run.transaction.export()
      run.transaction.rollback()

      // Make sure our transaction is not fully signed
      await expect(run.blockchain.broadcast(tx)).to.be.rejectedWith('tx signature not valid')

      // Sign with pubkey 2 and broadcast
      run2.activate()
      await run2.transaction.import(tx)
      run2.transaction.end()
      await run2.sync()
    })
  })

  describe('locations', () => {
    // TODO - with and without blockchain
  })

  describe('ours', () => {
    it('should return true for same address lock', () => {
      const privateKey = new PrivateKey('testnet')
      const sameLock = new StandardLock(privateKey.toAddress().toString())
      const owner = new LocalOwner({ privkey: privateKey })
      expect(owner.ours(sameLock)).to.equal(true)
    })

    it('should return false for different addresses', () => {
      const privateKey = new PrivateKey('testnet')
      const differentLock = new StandardLock(privateKey.toAddress().toString())
      const owner = new LocalOwner()
      expect(owner.ours(differentLock)).to.equal(false)
    })

    it('should return false for different scripts', () => {
      const differentLock = new class { get script () { return new Uint8Array([1, 2, 3]) }}()
      const owner = new LocalOwner()
      expect(owner.ours(differentLock)).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
