/**
 * local-owner.js
 *
 * Tests for lib/module/local-owner.js
 */

const { Address, PrivateKey, PublicKey, Transaction } = require('bsv')
const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { Run } = require('../env/config')
const { LocalOwner, Mockchain, Jig, Group, StandardLock } = Run

// ------------------------------------------------------------------------------------------------
// LocalOwner
// ------------------------------------------------------------------------------------------------

describe('LocalOwner', () => {
  afterEach(() => Run.instance && Run.instance.deactivate())

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
      expect(() => new LocalOwner({ privkey: new PrivateKey().publicKey })).to.throw('Invalid private key')
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
      expect(owner.address).to.equal(owner.address)
      expect(owner.address).to.equal(owner.address)
    })
  })

  describe('sign', () => {
    it('should sign with standard lock', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { set () { this.n = 1 }}
      const a = new A()
      a.set()
      await a.sync()
      expect(a.owner instanceof StandardLock)
    })

    it('should not sign standard lock if different address', async () => {
      const run = new Run()
      const run2 = new Run()
      class A extends Jig {
        init (owner) { this.owner = owner }
        set () { this.n = 1 }
      }

      // Create a jig assigned to someone else
      run.activate()
      const a = new A(new StandardLock(run2.owner.address))
      await a.sync()

      // Try signing and then export tx
      run.transaction.begin()
      a.set()
      await run.transaction.pay()
      await run.transaction.sign()
      const tx = run.transaction.export()
      run.transaction.rollback()

      // Make sure our transaction is not fully signed
      await expect(run.blockchain.broadcast(tx)).to.be.rejectedWith('mandatory-script-verify-flag-failed')

      // Sign with pubkey 2 and broadcast
      run2.activate()
      await run2.transaction.import(tx)
      run2.transaction.end()
      await run2.sync()
    })

    it('should sign without locks', async () => {
      const run = new Run()
      class A extends Jig { set () { this.n = 1 }}
      const a = new A()
      await a.sync()
      run.transaction.begin()
      a.set()
      const tx = run.transaction.export()
      const prevtx = await run.blockchain.fetch(a.origin.slice(0, 64))
      const signed = await run.owner.sign(tx.toString('hex'), [prevtx.outputs[2]], [])
      expect(new Transaction(signed).inputs[0].script.toBuffer().length > 0).to.equal(true)
      run.transaction.rollback()
    })

    describe('group lock', () => {
      it('should sign 1-1 group lock', async () => {
        const run = new Run()
        class A extends Jig {
          init (owner) { this.owner = owner }
          set () { this.n = 1 }
        }
        const a = new A(new Group([run.owner.pubkey], 1))
        a.set()
        await a.sync()
      })

      it('should sign 2-3 group lock', async () => {
        const run = new Run()
        const run2 = new Run()
        const run3 = new Run()
        class A extends Jig {
          init (owner) { this.owner = owner }
          set () { this.n = 1 }
        }

        // Create a jig with a 2-3 group owner
        run.activate()
        const a = new A(new Group([run.owner.pubkey, run2.owner.pubkey, run3.owner.pubkey], 2))
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

      it('should not sign group lock if already signed', async () => {
        const run = new Run()
        class A extends Jig {
          init (owner) { this.owner = owner }
          set () { this.n = 1 }
        }

        // Create a jig with a 2-3 group owner
        const a = new A(new Group([run.owner.pubkey], 1))
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

      it('should not sign group lock if not our pubkey', async () => {
        const run = new Run()
        const run2 = new Run()
        class A extends Jig {
          init (owner) { this.owner = owner }
          set () { this.n = 1 }
        }

        // Create a jig with a 2-3 group owner
        run.activate()
        const a = new A(new Group([run2.owner.pubkey], 1))
        await a.sync()

        // Try signing and then export tx
        run.transaction.begin()
        a.set()
        await run.transaction.pay()
        await run.transaction.sign()
        const tx = run.transaction.export()
        run.transaction.rollback()

        // Make sure our transaction is not fully signed
        await expect(run.blockchain.broadcast(tx)).to.be.rejectedWith('mandatory-script-verify-flag-failed')

        // Sign with pubkey 2 and broadcast
        run2.activate()
        await run2.transaction.import(tx)
        run2.transaction.end()
        await run2.sync()
      })
    })
  })
})

// ------------------------------------------------------------------------------------------------
