/**
 * local-owner.js
 *
 * Tests for lib/module/local-owner.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const bsv = require('bsv')
const { Address, PrivateKey, PublicKey, Transaction } = bsv
const { COVER } = require('../env/config')
const { getExtrasBlockchain } = require('../env/misc')
const Run = require('../env/run')
const { Jig, CommonLock } = Run
const { Group } = Run.extra
const { LocalOwner, Mockchain } = Run.module

// ------------------------------------------------------------------------------------------------
// LocalOwner
// ------------------------------------------------------------------------------------------------

describe('LocalOwner', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('create and set properties', () => {
      const privateKey = new PrivateKey('testnet')
      const owner = new LocalOwner(privateKey)

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

    // ------------------------------------------------------------------------

    it('private key strings', () => {
      const privateKey = new PrivateKey('mainnet')
      const owner = new LocalOwner(privateKey.toString())
      expect(owner.privkey).to.equal(privateKey.toString())
      expect(owner.pubkey).to.equal(privateKey.publicKey.toString())
      expect(owner.address).to.equal(privateKey.toAddress().toString())
    })

    // ------------------------------------------------------------------------

    it('generate random', () => {
      const owner1 = new LocalOwner()
      const owner2 = new LocalOwner()
      expect(typeof owner1.privkey).to.equal('string')
      expect(typeof owner2.privkey).to.equal('string')
      expect(owner1.privkey).not.to.equal(owner2.privkey)
    })

    // ------------------------------------------------------------------------

    it('throws if bad owner', () => {
      expect(() => new LocalOwner('123')).to.throw('Invalid private key: "123"')
      expect(() => new LocalOwner(new PrivateKey().publicKey)).to.throw('Invalid private key')
    })

    // ------------------------------------------------------------------------

    it('throws if wrong network', () => {
      const privateKey = new PrivateKey('mainnet')
      const blockchain = new Mockchain()
      expect(() => new LocalOwner(privateKey, blockchain.network)).to.throw('Private key network mismatch')
      expect(() => new LocalOwner(privateKey.toString(), blockchain.network)).to.throw('Private key network mismatch')
    })
  })

  // --------------------------------------------------------------------------
  // nextOwner
  // --------------------------------------------------------------------------

  describe('nextOwner', () => {
    it('returns the address', async () => {
      const privateKey = new PrivateKey()
      const owner = new LocalOwner(privateKey)
      expect(await owner.nextOwner()).to.equal(owner.address)
    })
  })

  // --------------------------------------------------------------------------
  // sign
  // --------------------------------------------------------------------------

  describe('sign', () => {
    it('signs with common lock', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { set () { this.n = 1 }}
      const a = new A()
      a.set()
      await a.sync()
      expect(a.owner instanceof CommonLock)
    })

    // ------------------------------------------------------------------------

    it('does not for different address', async () => {
      const run = new Run()
      const run2 = new Run()
      class A extends Jig {
        init (owner) { this.owner = owner }
        set () { this.n = 1 }
      }

      // Create a jig assigned to someone else
      run.activate()
      const a = new A(run2.owner.address)
      await a.sync()

      // Try signing and then export tx
      const tx = new Run.Transaction()
      tx.update(() => a.set())
      const rawtx = await tx.export()
      tx.rollback()

      // Make sure our transaction is not fully signed
      const bsvtx = new Transaction(rawtx)
      expect(bsvtx.inputs[0].script.toBuffer().length).to.equal(0)
      await expect(run.blockchain.broadcast(rawtx)).to.be.rejectedWith('mandatory-script-verify-flag-failed')

      // Sign with pubkey 2 and broadcast
      run2.activate()
      const tx2 = await run2.import(rawtx)
      await tx2.publish()
    })

    // ------------------------------------------------------------------------

    it('should sign P2PKH without locks', async () => {
      const run = new Run()
      class A extends Jig { set () { this.n = 1 }}
      const a = new A()
      await a.sync()
      const tx = new Run.Transaction()
      tx.update(() => a.set())
      const rawtx = await tx.export()
      const prevrawtx = await run.blockchain.fetch(a.origin.slice(0, 64))
      const prevtx = new Transaction(prevrawtx)
      const signed = await run.owner.sign(rawtx, [prevtx.outputs[2]], [])
      expect(new Transaction(signed).inputs[0].script.toBuffer().length > 0).to.equal(true)
      tx.rollback()
    })
  })

  // --------------------------------------------------------------------------
  // Group lock
  // --------------------------------------------------------------------------

  describe('Group', () => {
    it('should sign 1-1 group lock', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class A extends Jig {
        init (owner) { this.owner = owner }
        set () { this.n = 1 }
      }
      const a = new A(new Group([run.owner.pubkey], 1))
      a.set()
      await a.sync()
    })

    // ----------------------------------------------------------------------

    it('should sign 2-3 group lock using export and import', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      const run2 = new Run({ blockchain: await getExtrasBlockchain() })
      const run3 = new Run({ blockchain: await getExtrasBlockchain() })
      class A extends Jig {
        init (owner) { this.owner = owner }
        set () { this.n = 1 }
      }

      // Create a jig with a 2-3 group owner
      run.activate()
      const a = new A(new Group([run.owner.pubkey, run2.owner.pubkey, run3.owner.pubkey], 2))
      await a.sync()

      // Sign with pubkey 1 and export tx
      const tx = new Run.Transaction()
      tx.update(() => a.set())
      const rawtx = await tx.export()
      tx.rollback()

      // Sign with pubkey 2 and broadcast
      if (COVER) return
      run2.activate()
      const tx2 = await run2.import(rawtx)
      await tx2.publish()
    })

    // ----------------------------------------------------------------------

    it('should sign 2-3 group lock by changing owners', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      const run2 = new Run({ blockchain: await getExtrasBlockchain() })
      const run3 = new Run({ blockchain: await getExtrasBlockchain() })
      class A extends Jig {
        init (owner) { this.owner = owner }
        set () { this.n = 1 }
      }

      // Create a jig with a 2-3 group owner
      run.activate()
      const a = new A(new Group([run.owner.pubkey, run2.owner.pubkey, run3.owner.pubkey], 2))
      await a.sync()

      // Sign with pubkey 1 and export tx
      const tx = new Run.Transaction()
      tx.update(() => a.set())
      await tx.pay()
      await tx.sign()
      run.owner = run2.owner
      await tx.sign()
      await tx.publish()
    })

    // ----------------------------------------------------------------------

    it('should not sign group lock if already signed', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })

      class A extends Jig {
        init (owner) { this.owner = owner }
        set () { this.n = 1 }
      }

      // Create a jig with a 2-3 group owner
      const a = new A(new Group([run.owner.pubkey], 1))
      await a.sync()

      // Sign with pubkey 1 and export tx
      const tx = new Run.Transaction()
      tx.update(() => a.set())
      await tx.pay()

      // Sign more than once
      await tx.sign()
      await tx.sign()
      await tx.sign()

      await tx.publish()
    })

    // ----------------------------------------------------------------------

    it('should not sign group lock if not our pubkey', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      const run2 = new Run({ blockchain: await getExtrasBlockchain() })

      class A extends Jig {
        init (owner) { this.owner = owner }
        set () { this.n = 1 }
      }

      // Create a jig with a 2-3 group owner
      run.activate()
      const a = new A(new Group([run2.owner.pubkey], 1))
      await a.sync()

      // Try signing and then export tx
      const tx = new Run.Transaction()
      tx.update(() => a.set())
      await tx.pay()
      await tx.sign()
      const rawtx = await tx.export()
      tx.rollback()

      // Make sure our transaction is not fully signed
      await expect(run.blockchain.broadcast(rawtx)).to.be.rejectedWith('mandatory-script-verify-flag-failed')

      // Sign with pubkey 2 and broadcast
      if (COVER) return
      run2.activate()
      const tx2 = await run2.import(rawtx)
      await tx2.publish()
    })

    // ----------------------------------------------------------------------

    it.skip('sign out of order', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      const run2 = new Run({ blockchain: await getExtrasBlockchain() })

      const pk1 = run.owner.bsvPublicKey
      const pk2 = run2.owner.bsvPublicKey

      console.log(pk1.toString())
      console.log(pk2.toString())
      console.log('-------------')

      class A extends Jig {
        init (owner) { this.owner = owner }
        set () { this.n = 1 }
      }

      // Create a jig with a 2-3 group owner
      run.activate()
      const a = new A(new Group([run.owner.pubkey, run2.owner.pubkey], 2))
      await a.sync()

      // Sign with pubkey 1 and export tx
      const tx = new Run.Transaction()
      tx.update(() => a.set())
      await tx.pay()
      await tx.sign()

      run.owner = run2.owner
      await tx.sign()
      const rawtx = await tx.export()

      const bsvtx = new bsv.Transaction(rawtx)
      const sig1 = bsvtx.inputs[0].script.chunks[1].buf.toString('hex')
      const sig2 = bsvtx.inputs[0].script.chunks[2].buf.toString('hex')

      const unmangle = require('../env/unmangle')
      const { _sighash } = unmangle(Run)
      const sighashType = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID
      const prevrawtx = await run.blockchain.fetch(bsvtx.inputs[0].prevTxId.toString('hex'))
      const prevout = new bsv.Transaction(prevrawtx).outputs[bsvtx.inputs[0].outputIndex]
      const satoshisBN = new bsv.crypto.BN(prevout.satoshis)
      const hashbuf = _sighash(bsvtx, sighashType, 0, prevout.script, satoshisBN)

      const sig1hex = sig1.slice(0, sig1.length - 2)
      const sig1buf = bsv.deps.Buffer.from(sig1hex, 'hex')
      const bsvsig1 = bsv.crypto.Signature.fromDER(sig1buf)

      const sig2hex = sig2.slice(0, sig2.length - 2)
      const sig2buf = bsv.deps.Buffer.from(sig2hex, 'hex')
      const bsvsig2 = bsv.crypto.Signature.fromDER(sig2buf)

      for (let i = 0; i <= 3; i++) {
        const ecdsa = new bsv.crypto.ECDSA()
        bsvsig1.i = i
        ecdsa.set({ hashbuf, sig: bsvsig1 })
        try {
          const pk = ecdsa.toPublicKey()
          console.log(i, pk.toString())
        } catch (e) { console.log(e) }

        const ecdsa2 = new bsv.crypto.ECDSA()
        bsvsig2.i = i
        ecdsa2.set({ hashbuf, sig: bsvsig2 })
        try {
          const pk = ecdsa2.toPublicKey()
          console.log(i, pk.toString())
        } catch (e) { console.log(e) }
      }

      const endian = 'little'
      console.log(bsv.crypto.ECDSA.verify(hashbuf, bsvsig1, pk1, endian))
      console.log(bsv.crypto.ECDSA.verify(hashbuf, bsvsig1, pk2, endian))
      console.log(bsv.crypto.ECDSA.verify(hashbuf, bsvsig2, pk1, endian))
      console.log(bsv.crypto.ECDSA.verify(hashbuf, bsvsig2, pk2, endian))

      // const sig = ECDSA.sign(hashbuf, privateKey, 'little')
      // const sigbuf = Buffer.from(sig.toDER())
      // const buf = Buffer.concat([sigbuf, Buffer.from([sighashType & 0xff])])
      // return buf.toString('hex')
    })
  })
})

// ------------------------------------------------------------------------------------------------
