/**
 * owner.js
 *
 * Tests for ../lib/owner.js
 */

const bsv = require('bsv')
const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Jig, Run, createRun, hookPay } = require('./helpers')
const { AddressScript, PubKeyScript } = Run

// ------------------------------------------------------------------------------------------------
// AddressScript tests
// ------------------------------------------------------------------------------------------------

describe('AddressScript', () => {
  it('throws if bad address', () => {
    // const x = Array.from(Buffer.from('00291D4797C2817F6247481E261A3CCB35C24E38AB59C1ACEA', 'hex'))
    // console.log(x)
    new AddressScript('14kPnFashu7rYZKTXvJU8gXpJMf9e3f8k1').getBuffer() // eslint-disable-line
    new AddressScript('mhZZFmSiUqcmf8wQrBNjPAVHUCFsHso9ni').getBuffer() // eslint-disable-line
    // console.log(new Address('%').getBuffer())
  })
})

// ------------------------------------------------------------------------------------------------
// PubKeyScript tests
// ------------------------------------------------------------------------------------------------

describe('PubKeyScript', () => {
  it.only('throws if bad address', () => {
    const pubkey = new bsv.PrivateKey().publicKey.toString()
    const pubkeyBuf = new Uint8Array(new bsv.PublicKey(pubkey).toBuffer())
    const script = new PubKeyScript(pubkey).getBuffer()
    expect(script.length).to.equal(34)
    expect(script.slice(0, 33)).to.deep.equal(pubkeyBuf)
    expect(script[33]).to.equal(172)
  })
})

// ------------------------------------------------------------------------------------------------
// Owner tests
// ------------------------------------------------------------------------------------------------

describe('Owner', () => {
  describe('constructor', () => {
    it('should support creating from bsv private key on testnet', () => {
      const privkey = new bsv.PrivateKey('testnet')
      const run = createRun({ owner: privkey })
      expect(run.owner.privkey).to.equal(privkey.toString())
      expect(run.owner.pubkey).to.equal(privkey.publicKey.toString())
      expect(run.owner.address).to.equal(privkey.toAddress().toString())
    })

    it('should support creating from string private key on mainnet', () => {
      const privkey = new bsv.PrivateKey('mainnet')
      const run = createRun({ network: 'main', owner: privkey.toString() })
      expect(run.owner.privkey).to.equal(privkey.toString())
      expect(run.owner.pubkey).to.equal(privkey.publicKey.toString())
      expect(run.owner.address).to.equal(privkey.toAddress().toString())
    })

    it('should support creating from bsv public key on mainnet', () => {
      const pubkey = new bsv.PrivateKey('mainnet').publicKey
      const run = createRun({ network: 'main', owner: pubkey })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(pubkey.toString())
      expect(run.owner.address).to.equal(pubkey.toAddress().toString())
    })

    it('should support creating from string public key on mocknet', () => {
      const pubkey = new bsv.PrivateKey('testnet').publicKey
      const run = createRun({ network: 'mock', owner: pubkey.toString() })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(pubkey.toString())
      expect(run.owner.address).to.equal(pubkey.toAddress().toString())
    })

    it('should support creating from bsv address on stn', () => {
      const address = new bsv.PrivateKey('testnet').toAddress()
      const run = createRun({ network: 'stn', owner: address })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(undefined)
      expect(run.owner.address).to.equal(address.toString())
    })

    it('should support creating from string address on mainnet', () => {
      const address = new bsv.PrivateKey('livenet').toAddress()
      const run = createRun({ network: 'main', owner: address.toString() })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(undefined)
      expect(run.owner.address).to.equal(address.toString())
    })

    it('should throw if bad owner', () => {
      expect(() => createRun({ owner: '123' })).to.throw('bad owner key or address: 123')
    })

    it('throw if owner private key is on wrong network', () => {
      const owner = new bsv.PrivateKey('testnet').toString()
      expect(() => createRun({ owner, network: 'main' })).to.throw('Private key network mismatch')
    })
  })

  describe('code', () => {
    it('should update with code deployed', async () => {
      const run = createRun()
      class A extends Jig { set (x) { this.x = x }}
      run.deploy(A)
      expect(run.owner.code.length).to.equal(1)
      expect(run.owner.code[0].name).to.equal('A')
      expect(run.owner.code[0].origin).to.equal(A.origin)
      expect(run.owner.code[0].location).to.equal(A.location)
      await run.sync()
      expect(run.owner.code.length).to.equal(1)
      expect(run.owner.code[0].name).to.equal('A')
      expect(run.owner.code[0].origin).to.equal(A.origin)
      expect(run.owner.code[0].location).to.equal(A.location)
      const a = new A()
      a.set(function add (a, b) { return a + b })
      expect(run.owner.code.length).to.equal(2)
      await run.sync()
      expect(run.owner.code.length).to.equal(2)
    })

    it('should remove if code fails to post', async () => {
      const run = createRun()
      hookPay(run, false)
      class A {}
      run.deploy(A).catch(() => {})
      expect(run.owner.code.length).to.equal(1)
      expect(run.owner.code[0].name).to.equal('A')
      expect(run.owner.code[0].origin).to.equal(A.origin)
      expect(run.owner.code[0].location).to.equal(A.location)
      await expect(run.sync()).to.be.rejected
      expect(run.owner.code.length).to.equal(0)
    })
  })

  describe('jigs', () => {
    it('should update with jigs created', async () => {
      const run = createRun()
      class A extends Jig { createB () { return new B() }}
      class B extends Jig { send (to) { this.owner = to } }
      A.deps = { B }
      const a = new A()
      expect(run.owner.jigs).to.deep.equal([a])
      const b = a.createB()
      expect(run.owner.jigs).to.deep.equal([a, b])
      await run.sync()
      expect(run.owner.jigs).to.deep.equal([a, b])
      b.send(new bsv.PrivateKey().publicKey.toString())
      expect(run.owner.jigs).to.deep.equal([a])
      await run.sync()
      expect(run.owner.jigs).to.deep.equal([a])
    })

    it('should update jigs on sync', async () => {
      const run = createRun()
      class A extends Jig { createB () { return new B() }}
      class B extends Jig { }
      A.deps = { B }
      const a = new A()
      const b = a.createB()
      expect(run.owner.jigs).to.deep.equal([a, b])
      await run.sync()
      const run2 = createRun({ owner: run.owner.privkey, blockchain: run.blockchain })
      const c = new A()
      await run2.sync()
      expect(run2.owner.jigs).to.deep.equal([a, b, c])
    })

    it('should remove jigs when fail to post', async () => {
      const run = createRun()
      hookPay(run, false)
      class A extends Jig {}
      const a = new A()
      expect(run.owner.jigs).to.deep.equal([a])
      expect(run.owner.code.length).to.equal(1)
      await expect(run.sync()).to.be.rejectedWith('tx has no inputs')
      expect(run.owner.jigs.length).to.equal(0)
      expect(run.owner.code.length).to.equal(0)
    })

    it('should support filtering jigs by class', async () => {
      const run = createRun()
      class A extends Jig {}
      class B extends Jig {}
      const a = new A()
      new B() // eslint-disable-line
      expect(run.owner.jigs.find(x => x instanceof A)).to.deep.equal(a)
    })

    it('should support getting jigs without private key', async () => {
      const run = createRun()
      class A extends Jig {}
      const a = await new A().sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.pubkey })
      await run2.sync()
      expect(run2.owner.privkey).to.equal(undefined)
      expect(run2.owner.jigs).to.deep.equal([a])
    })
  })
})
