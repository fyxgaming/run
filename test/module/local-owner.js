/**
 * local-owner.js
 *
 * Tests for lib/kernel/local-owner.js
 */

const bsv = require('bsv')
const { describe, it, beforeEach } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('../env/config')
const { Jig, GroupLock } = Run

// ------------------------------------------------------------------------------------------------
// LocalOwner
// ------------------------------------------------------------------------------------------------

describe('LocalOwner', () => {
  describe('constructor', () => {
    it('should support creating from bsv private key on testnet', () => {
      const privkey = new bsv.PrivateKey('testnet')
      const run = new Run({ owner: privkey })
      expect(run.owner.privkey).to.equal(privkey.toString())
      expect(run.owner.pubkey).to.equal(privkey.publicKey.toString())
      expect(run.owner.address).to.equal(privkey.toAddress().toString())
      expect(run.owner.next()).to.equal(privkey.toAddress().toString())
    })

    it('should support creating from string private key on mainnet', () => {
      const privkey = new bsv.PrivateKey('mainnet')
      const run = new Run({ network: 'main', owner: privkey.toString() })
      expect(run.owner.privkey).to.equal(privkey.toString())
      expect(run.owner.pubkey).to.equal(privkey.publicKey.toString())
      expect(run.owner.address).to.equal(privkey.toAddress().toString())
      expect(run.owner.next()).to.equal(privkey.toAddress().toString())
    })

    it('should support creating from bsv public key on mainnet', () => {
      const pubkey = new bsv.PrivateKey('mainnet').publicKey
      const run = new Run({ network: 'main', owner: pubkey })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(pubkey.toString())
      expect(run.owner.address).to.equal(pubkey.toAddress().toString())
      expect(run.owner.next()).to.equal(pubkey.toAddress().toString())
    })

    it('should support creating from string public key on mocknet', () => {
      const pubkey = new bsv.PrivateKey('testnet').publicKey
      const run = new Run({ network: 'mock', owner: pubkey.toString() })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(pubkey.toString())
      expect(run.owner.address).to.equal(pubkey.toAddress().toString())
      expect(run.owner.next()).to.equal(pubkey.toAddress().toString())
    })

    it('should support creating from bsv address on testnet', () => {
      const address = new bsv.PrivateKey('testnet').toAddress()
      const run = new Run({ network: 'test', owner: address })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(undefined)
      expect(run.owner.address).to.equal(address.toString())
      expect(run.owner.next()).to.equal(address.toString())
    })

    it('should support creating from string address on mainnet', () => {
      const address = new bsv.PrivateKey('livenet').toAddress()
      const run = new Run({ network: 'main', owner: address.toString() })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(undefined)
      expect(run.owner.address).to.equal(address.toString())
      expect(run.owner.next()).to.equal(address.toString())
    })

    it('should throw if bad owner', () => {
      expect(() => new Run({ owner: '123' })).to.throw('Bad owner key or address: 123')
    })

    it('throw if owner private key is on wrong network', () => {
      const owner = new bsv.PrivateKey('testnet').toString()
      expect(() => new Run({ owner, network: 'main' })).to.throw('Private key network mismatch')
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
})

// ------------------------------------------------------------------------------------------------
