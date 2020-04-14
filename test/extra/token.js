/**
 * token.js
 *
 * Tests for lib/extra/token.js
 */

const bsv = require('bsv')
const { describe, it, beforeEach } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('../env/config')
const { Token } = Run
const { deploy } = require('../env/helpers')
const { unmangle } = require('../env/unmangle')

// ------------------------------------------------------------------------------------------------
// Token
// ------------------------------------------------------------------------------------------------

describe('Token', () => {
  const run = new Run()
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())

  class TestToken extends Token { }
  TestToken.decimals = 2

  describe('init', () => {
    it('should mint new tokens', () => {
      const token = new TestToken(100)
      expect(token.amount).to.equal(100)
      expect(token.owner).to.equal(TestToken.owner)
    })

    it('should throw if owner is not minting', async () => {
      await run.deploy(TestToken)
      new Run({ blockchain: run.blockchain }) // eslint-disable-line
      expect(() => new TestToken(100)).to.throw('Only TestToken\'s owner may mint')
    })

    it('should throw if class is not extended', () => {
      expect(() => new Token(100)).to.throw('Token must be extended')
    })

    it('should support large amounts', () => {
      expect(new TestToken(2147483647).amount).to.equal(2147483647)
      expect(new TestToken(Number.MAX_SAFE_INTEGER).amount).to.equal(Number.MAX_SAFE_INTEGER)
    })

    it('should throw for bad amounts', () => {
      expect(() => new TestToken()).to.throw('amount is not a number')
      expect(() => new TestToken('1')).to.throw('amount is not a number')
      expect(() => new TestToken(0)).to.throw('amount must be positive')
      expect(() => new TestToken(-1)).to.throw('amount must be positive')
      expect(() => new TestToken(Number.MAX_SAFE_INTEGER + 1)).to.throw('amount too large')
      expect(() => new TestToken(1.5)).to.throw('amount must be an integer')
      expect(() => new TestToken(Infinity)).to.throw('amount must be an integer')
      expect(() => new TestToken(NaN)).to.throw('amount must be an integer')
    })
  })

  describe('send', () => {
    it('should support sending full amount', () => {
      const address = new bsv.PrivateKey().toAddress().toString()
      const token = new TestToken(100)
      expect(token.send(address)).to.equal(null)
      expect(token.owner).to.equal(address)
      expect(token.amount).to.equal(100)
    })

    it('should support sending partial amount', () => {
      const address = new bsv.PrivateKey().toAddress().toString()
      const token = new TestToken(100)
      const change = token.send(address, 30)
      expect(change).to.be.instanceOf(TestToken)
      expect(change.owner).to.equal(run.owner.address)
      expect(change.amount).to.equal(70)
      expect(token.owner).to.equal(address)
      expect(token.amount).to.equal(30)
    })

    it('should throw if send too much', () => {
      const address = new bsv.PrivateKey().toAddress().toString()
      const token = new TestToken(100)
      expect(() => token.send(address, 101)).to.throw('not enough funds')
    })

    it('should throw if send bad amount', () => {
      const address = new bsv.PrivateKey().toAddress().toString()
      const token = new TestToken(100)
      expect(() => token.send(address, {})).to.throw('amount is not a number')
      expect(() => token.send(address, '1')).to.throw('amount is not a number')
      expect(() => token.send(address, 0)).to.throw('amount must be positive')
      expect(() => token.send(address, -1)).to.throw('amount must be positive')
      expect(() => token.send(address, Number.MAX_SAFE_INTEGER + 1)).to.throw('amount too large')
      expect(() => token.send(address, 1.5)).to.throw('amount must be an integer')
      expect(() => token.send(address, Infinity)).to.throw('amount must be an integer')
      expect(() => token.send(address, NaN)).to.throw('amount must be an integer')
    })

    it('should throw if send to bad owner', () => {
      const token = new TestToken(100)
      expect(() => token.send(10)).to.throw('Invalid owner: 10')
      expect(() => token.send('abc', 10)).to.throw('Invalid owner: "abc"')
    })
  })

  describe('combine', () => {
    it('should support combining two tokens', () => {
      const a = new TestToken(30)
      const b = new TestToken(70)
      const c = TestToken.combine(a, b)
      expect(c).to.be.instanceOf(TestToken)
      expect(c.amount).to.equal(100)
      expect(c.owner).to.equal(run.owner.address)
      expect(a.amount).to.equal(0)
      expect(a.owner).not.to.equal(run.owner.address)
      expect(b.amount).to.equal(0)
      expect(b.owner).not.to.equal(run.owner.address)
    })

    it('should support combining many tokens', () => {
      const tokens = []
      for (let i = 0; i < 10; ++i) tokens.push(new TestToken(1))
      const combined = TestToken.combine(...tokens)
      expect(combined).to.be.instanceOf(TestToken)
      expect(combined.amount).to.equal(10)
      expect(combined.owner).to.equal(run.owner.address)
      tokens.forEach(token => {
        expect(token.amount).to.equal(0)
        expect(token.owner).not.to.equal(run.owner.address)
      })
    })

    it.only('should support load after combine', async () => {
      const a = new TestToken(30)
      const b = new TestToken(70)
      const c = TestToken.combine(a, b)
      await run.sync()
      run.deactivate()
      const code = unmangle(unmangle(run)._kernel)._code
      const run2 = new Run({ blockchain: run.blockchain, code })
      const c2 = await run2.load(c.location)
      expect(c2.amount).to.equal(c.amount)
    })

    it('should throw if combine different owners without signatures', async () => {
      const a = new TestToken(1)
      const b = new TestToken(2)
      const address = new bsv.PrivateKey().toAddress().toString()
      b.send(address)
      await expect(TestToken.combine(a, b).sync()).to.be.rejectedWith('Missing signature for TestToken')
    })

    it('should throw if combined amount is too large', () => {
      const a = new TestToken(Number.MAX_SAFE_INTEGER)
      const b = new TestToken(1)
      expect(() => TestToken.combine(a, b)).to.throw('amount too large')
    })

    it('should throw if combine only one token', () => {
      expect(() => TestToken.combine(new TestToken(1))).to.throw('must combine at least two tokens')
    })

    it('should throw if combine no tokens', () => {
      expect(() => TestToken.combine()).to.throw('must combine at least two tokens')
    })

    it('should throw if combine non-tokens', () => {
      const error = 'cannot combine different token classes'
      expect(() => TestToken.combine(new TestToken(1), 1)).to.throw(error)
      expect(() => TestToken.combine(new TestToken(1), {})).to.throw(error)
      expect(() => TestToken.combine(new TestToken(1), new TestToken(1), {})).to.throw(error)
    })

    it('should throw if combine different token classes', () => {
      const error = 'cannot combine different token classes'
      class DifferentToken extends Token { }
      class ExtendedToken extends TestToken { }
      expect(() => TestToken.combine(new TestToken(1), new DifferentToken(1))).to.throw(error)
      expect(() => TestToken.combine(new TestToken(1), new ExtendedToken(1))).to.throw(error)
    })

    it('should throw if combine duplicate tokens', () => {
      const token = new TestToken(1)
      expect(() => TestToken.combine(token, token)).to.throw('cannot combine duplicate tokens')
    })
  })

  describe('value', () => {
    it('should default to 0', () => {
      class Token2 extends Token { }
      expect(Token2.decimals).to.equal(0)
      expect(new Token2(120).value).to.equal(120)
    })

    it('should divide amount by decimals', () => {
      expect(new TestToken(120).value).to.equal(1.2)
    })
  })

  describe('_onMint', () => {
    it.skip('should support limiting supply', async () => {
      // TODO: need a good way to do this, ideally using class properties
    })
  })

  it.skip('should deploy', async () => {
    await deploy(Token)
  }).timeout(30000)
})

// ------------------------------------------------------------------------------------------------
