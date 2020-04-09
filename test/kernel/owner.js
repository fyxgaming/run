/**
 * owner.js
 *
 * Tests for lib/kernel/owner.js
 */

const bsv = require('bsv')
const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('../env/config')
const { Jig } = Run
const { unmangle } = require('../env/unmangle')
const { AddressLock, PubKeyLock } = unmangle(Run)._util
const { hookPay, deploy } = require('../env/helpers')

it.only('test', async () => {
  console.log('hello')
})

// ------------------------------------------------------------------------------------------------
// AddressLock tests
// ------------------------------------------------------------------------------------------------

describe('AddressLock', () => {
  it('should create buffer for valid addresses', () => {
    new AddressLock('14kPnFashu7rYZKTXvJU8gXpJMf9e3f8k1').script // eslint-disable-line
    new AddressLock('mhZZFmSiUqcmf8wQrBNjPAVHUCFsHso9ni').script // eslint-disable-line
  })

  it('throws if bad address', () => {
    expect(() => new AddressLock().script).to.throw('Address is not a string')
    expect(() => new AddressLock([]).script).to.throw('Address is not a string')
    expect(() => new AddressLock('3P14159f73E4gFr7JterCCQh9QjiTjiZrG').script).to.throw('Address may only be a P2PKH type')
    expect(() => new AddressLock('mhZZFmSiUqcmf8wQrBNjPAVHUCFsHso9n').script).to.throw('Address may only be a P2PKH type')
    expect(() => new AddressLock('@').script).to.throw('Invalid character in address')
  })

  it('should correctly return P2PKH buffer', () => {
    const addr = '14kPnFashu7rYZKTXvJU8gXpJMf9e3f8k1'
    const script = bsv.Script.fromAddress(addr)
    const buffer1 = new Uint8Array(script.toBuffer())
    const buffer2 = new AddressLock(addr).script
    expect(buffer1).to.deep.equal(buffer2)
  })

  it.skip('should deploy', async () => {
    await deploy(AddressLock)
  })
})

// ------------------------------------------------------------------------------------------------
// PubKeyLock tests
// ------------------------------------------------------------------------------------------------

describe('PubKeyLock', () => {
  it('throws if bad pubkey', () => {
    expect(() => new PubKeyLock().script).to.throw('Pubkey is not a string')
    expect(() => new PubKeyLock([]).script).to.throw('Pubkey is not a string')
    expect(() => new PubKeyLock('abcde').script).to.throw('Pubkey has bad length')
    expect(() => new PubKeyLock('@$').script).to.throw('Invalid pubkey hex')
  })

  it('should correctly return P2PH buffer', () => {
    const pubkey = new bsv.PrivateKey().publicKey
    const script = bsv.Script.buildPublicKeyOut(pubkey)
    const buffer1 = new Uint8Array(script.toBuffer())
    const buffer2 = new PubKeyLock(pubkey.toString()).script
    expect(buffer1).to.deep.equal(buffer2)
  })

  it.skip('should deploy', async () => {
    await deploy(PubKeyLock)
  })
})

// ------------------------------------------------------------------------------------------------
// Owner tests
// ------------------------------------------------------------------------------------------------

describe('Owner', () => {
  describe('constructor', () => {
    it('should support creating from bsv private key on testnet', () => {
      const privkey = new bsv.PrivateKey('testnet')
      const run = new Run({ owner: privkey })
      expect(run.owner.privkey).to.equal(privkey.toString())
      expect(run.owner.pubkey).to.equal(privkey.publicKey.toString())
      expect(run.owner.address).to.equal(privkey.toAddress().toString())
      expect(run.owner.locks[0]).to.equal(privkey.toAddress().toString())
    })

    it('should support creating from string private key on mainnet', () => {
      const privkey = new bsv.PrivateKey('mainnet')
      const run = new Run({ network: 'main', owner: privkey.toString() })
      expect(run.owner.privkey).to.equal(privkey.toString())
      expect(run.owner.pubkey).to.equal(privkey.publicKey.toString())
      expect(run.owner.address).to.equal(privkey.toAddress().toString())
      expect(run.owner.locks[0]).to.equal(privkey.toAddress().toString())
    })

    it('should support creating from bsv public key on mainnet', () => {
      const pubkey = new bsv.PrivateKey('mainnet').publicKey
      const run = new Run({ network: 'main', owner: pubkey })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(pubkey.toString())
      expect(run.owner.address).to.equal(pubkey.toAddress().toString())
      expect(run.owner.locks[0]).to.equal(pubkey.toAddress().toString())
    })

    it('should support creating from string public key on mocknet', () => {
      const pubkey = new bsv.PrivateKey('testnet').publicKey
      const run = new Run({ network: 'mock', owner: pubkey.toString() })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(pubkey.toString())
      expect(run.owner.address).to.equal(pubkey.toAddress().toString())
      expect(run.owner.locks[0]).to.equal(pubkey.toAddress().toString())
    })

    it('should support creating from bsv address on testnet', () => {
      const address = new bsv.PrivateKey('testnet').toAddress()
      const run = new Run({ network: 'test', owner: address })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(undefined)
      expect(run.owner.address).to.equal(address.toString())
      expect(run.owner.locks[0]).to.equal(address.toString())
    })

    it('should support creating from string address on mainnet', () => {
      const address = new bsv.PrivateKey('livenet').toAddress()
      const run = new Run({ network: 'main', owner: address.toString() })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(undefined)
      expect(run.owner.address).to.equal(address.toString())
      expect(run.owner.locks[0]).to.equal(address.toString())
    })

    it('should throw if bad owner', () => {
      expect(() => new Run({ owner: '123' })).to.throw('bad owner key or address: 123')
    })

    it('throw if owner private key is on wrong network', () => {
      const owner = new bsv.PrivateKey('testnet').toString()
      expect(() => new Run({ owner, network: 'main' })).to.throw('Private key network mismatch')
    })
  })

  describe('code', () => {
    it('should update with code deployed', async () => {
      const run = new Run()
      class A extends Jig { set (x) { this.x = x }}
      run.deploy(A)
      expect(run.code.length).to.equal(1)
      expect(run.code[0].name).to.equal('A')
      expect(run.code[0].origin).to.equal(A.origin)
      expect(run.code[0].location).to.equal(A.location)
      await run.sync()
      expect(run.code.length).to.equal(1)
      expect(run.code[0].name).to.equal('A')
      expect(run.code[0].origin).to.equal(A.origin)
      expect(run.code[0].location).to.equal(A.location)
      const a = new A()
      a.set(function add (a, b) { return a + b })
      expect(run.code.length).to.equal(2)
      await run.sync()
      expect(run.code.length).to.equal(2)
    })

    it('should remove if code fails to post', async () => {
      const run = new Run()
      hookPay(run, false)
      class A {}
      run.deploy(A).catch(() => {})
      expect(run.code.length).to.equal(1)
      expect(run.code[0].name).to.equal('A')
      expect(run.code[0].origin).to.equal(A.origin)
      expect(run.code[0].location).to.equal(A.location)
      await expect(run.sync()).to.be.rejected
      expect(run.code.length).to.equal(0)
    })
  })

  describe('jigs', () => {
    it('should update with jigs created', async () => {
      const run = new Run()
      class A extends Jig { createB () { return new B() }}
      class B extends Jig { send (to) { this.owner = to } }
      A.deps = { B }
      const a = new A()
      expect(run.jigs).to.deep.equal([a])
      const b = a.createB()
      expect(run.jigs).to.deep.equal([a, b])
      await run.sync()
      expect(run.jigs).to.deep.equal([a, b])
      b.send(new bsv.PrivateKey().publicKey.toString())
      expect(run.jigs).to.deep.equal([a])
      await run.sync()
      expect(run.jigs).to.deep.equal([a])
    })

    it('should update jigs on sync', async () => {
      const run = new Run()
      class A extends Jig { createB () { return new B() }}
      class B extends Jig { }
      A.deps = { B }
      const a = new A()
      const b = a.createB()
      expect(run.jigs).to.deep.equal([a, b])
      await run.sync()
      const run2 = new Run({ owner: run.owner.privkey, blockchain: run.blockchain })
      const c = new A()
      await run2.sync()
      expect(run2.jigs).to.deep.equal([a, b, c])
    })

    it('should remove jigs when fail to post', async () => {
      const run = new Run()
      hookPay(run, false)
      class A extends Jig {}
      const a = new A()
      expect(run.jigs).to.deep.equal([a])
      expect(run.code.length).to.equal(1)
      await expect(run.sync()).to.be.rejectedWith('tx has no inputs')
      expect(run.jigs.length).to.equal(0)
      expect(run.code.length).to.equal(0)
    })

    it('should support filtering jigs by class', async () => {
      const run = new Run()
      class A extends Jig {}
      class B extends Jig {}
      const a = new A()
      new B() // eslint-disable-line
      expect(run.jigs.find(x => x instanceof A)).to.deep.equal(a)
    })

    it('should support getting jigs without private key', async () => {
      const run = new Run()
      class A extends Jig {}
      const a = await new A().sync()
      const run2 = new Run({ blockchain: run.blockchain, owner: run.owner.locks[0] })
      await run2.sync()
      expect(run2.owner.privkey).to.equal(undefined)
      expect(run2.jigs).to.deep.equal([a])
    })
  })
})

// ------------------------------------------------------------------------------------------------
