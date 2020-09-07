/**
 * token.js
 *
 * Tests for lib/extra/token.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { PrivateKey } = require('bsv')
const Run = require('../env/run')
const { Token } = Run

// ------------------------------------------------------------------------------------------------
// Token
// ------------------------------------------------------------------------------------------------

describe('Token', () => {
  // Wait for every test to finish. This makes debugging easier.
  // Don't deactive the current run instance between tests. Token needs to stay deployed.
  afterEach(() => Run.instance && Run.instance.sync())

  // --------------------------------------------------------------------------
  // mint
  // --------------------------------------------------------------------------

  describe('mint', () => {
    it('new tokens', async () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const token = TestToken.mint(100)
      await token.sync()
      expect(token.amount).to.equal(100)
      expect(token.owner).to.equal(TestToken.owner)
    })

    // ------------------------------------------------------------------------

    it('throws if mint outside', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      expect(() => new TestToken()).to.throw('Use TestToken.mint to mint')
    })

    // ------------------------------------------------------------------------

    it('throws if class is not extended', () => {
      new Run() // eslint-disable-line
      expect(() => Token.mint(100)).to.throw('Token must be extended')
    })

    // ------------------------------------------------------------------------

    it('large amounts', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      expect(TestToken.mint(2147483647).amount).to.equal(2147483647)
      expect(TestToken.mint(Number.MAX_SAFE_INTEGER).amount).to.equal(Number.MAX_SAFE_INTEGER)
    })

    // ------------------------------------------------------------------------

    it('throws for bad amounts', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      expect(() => TestToken.mint()).to.throw('amount is not a number')
      expect(() => TestToken.mint('1')).to.throw('amount is not a number')
      expect(() => TestToken.mint(0)).to.throw('amount must be positive')
      expect(() => TestToken.mint(-1)).to.throw('amount must be positive')
      expect(() => TestToken.mint(Number.MAX_SAFE_INTEGER + 1)).to.throw('amount too large')
      expect(() => TestToken.mint(1.5)).to.throw('amount must be an integer')
      expect(() => TestToken.mint(Infinity)).to.throw('amount must be an integer')
      expect(() => TestToken.mint(NaN)).to.throw('amount must be an integer')
    })
  })

  // --------------------------------------------------------------------------
  // send
  // --------------------------------------------------------------------------

  describe('send', () => {
    it('full amount', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      expect(token.send(address)).to.equal(null)
      expect(token.owner).to.equal(address)
      expect(token.amount).to.equal(100)
    })

    // ------------------------------------------------------------------------

    it('partial amount', async () => {
      const run = new Run()
      class TestToken extends Token { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      const change = token.send(address, 30)
      await run.sync()
      expect(change).to.be.instanceOf(TestToken)
      expect(change.owner).to.equal(run.owner.address)
      expect(change.amount).to.equal(70)
      expect(token.owner).to.equal(address)
      expect(token.amount).to.equal(30)
    })

    // ------------------------------------------------------------------------

    it('throws if send too much', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      expect(() => token.send(address, 101)).to.throw('not enough funds')
    })

    // ------------------------------------------------------------------------

    it('throws if send bad amount', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      expect(() => token.send(address, {})).to.throw('amount is not a number')
      expect(() => token.send(address, '1')).to.throw('amount is not a number')
      expect(() => token.send(address, 0)).to.throw('amount must be positive')
      expect(() => token.send(address, -1)).to.throw('amount must be positive')
      expect(() => token.send(address, Number.MAX_SAFE_INTEGER + 1)).to.throw('amount too large')
      expect(() => token.send(address, 1.5)).to.throw('amount must be an integer')
      expect(() => token.send(address, Infinity)).to.throw('amount must be an integer')
      expect(() => token.send(address, NaN)).to.throw('amount must be an integer')
    })

    // ------------------------------------------------------------------------

    it('throws if send to bad owner', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const token = TestToken.mint(100)
      expect(() => token.send(10)).to.throw('Invalid owner: 10')
      expect(() => token.send('abc', 10)).to.throw('Invalid owner: "abc"')
    })
  })

  // --------------------------------------------------------------------------
  // combine
  // --------------------------------------------------------------------------

  describe('combine', () => {
    it('two tokens', async () => {
      const run = new Run()
      class TestToken extends Token { }
      const a = TestToken.mint(30)
      const b = TestToken.mint(70)
      const c = new TestToken(a, b)
      await run.sync()
      expect(c).to.be.instanceOf(TestToken)
      expect(c.amount).to.equal(100)
      expect(c.owner).to.equal(run.owner.address)
      expect(a.amount).to.equal(0)
      expect(a.owner).not.to.equal(run.owner.address)
      expect(b.amount).to.equal(0)
      expect(b.owner).not.to.equal(run.owner.address)
    })

    // Throws if 0
    // Throws if 1
    // ...
  })

  /*

  describe('combine', () => {
    it('should support combining two tokens', () => {
      const a = TestToken.mint(30)
      const b = TestToken.mint(70)
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
      for (let i = 0; i < 10; ++i) tokens.push(TestToken.mint(1))
      const combined = TestToken.combine(...tokens)
      expect(combined).to.be.instanceOf(TestToken)
      expect(combined.amount).to.equal(10)
      expect(combined.owner).to.equal(run.owner.address)
      tokens.forEach(token => {
        expect(token.amount).to.equal(0)
        expect(token.owner).not.to.equal(run.owner.address)
      })
    })

    it('should support load after combine', async () => {
      const a = TestToken.mint(30)
      const b = TestToken.mint(70)
      const c = TestToken.combine(a, b)
      await run.sync()
      run.deactivate()
      const code = unmangle(unmangle(run)._kernel)._code
      const run2 = new Run({ blockchain: run.blockchain, code })
      const c2 = await run2.load(c.location)
      expect(c2.amount).to.equal(c.amount)
    })

    it('should throw if combine different owners without signatures', async () => {
      const a = TestToken.mint(1)
      const b = TestToken.mint(2)
      const address = new PrivateKey().toAddress().toString()
      b.send(address)
      await expect(TestToken.combine(a, b).sync()).to.be.rejectedWith('Missing signature for TestToken')
    })

    it('should throw if combined amount is too large', () => {
      const a = TestToken.mint(Number.MAX_SAFE_INTEGER)
      const b = TestToken.mint(1)
      expect(() => TestToken.combine(a, b)).to.throw('amount too large')
    })

    it('should throw if combine only one token', () => {
      expect(() => TestToken.combine(TestToken.mint(1))).to.throw('must combine at least two tokens')
    })

    it('should throw if combine no tokens', () => {
      expect(() => TestToken.combine()).to.throw('must combine at least two tokens')
    })

    it('should throw if combine non-tokens', () => {
      const error = 'cannot combine different token classes'
      expect(() => TestToken.combine(TestToken.mint(1), 1)).to.throw(error)
      expect(() => TestToken.combine(TestToken.mint(1), {})).to.throw(error)
      expect(() => TestToken.combine(TestToken.mint(1), TestToken.mint(1), {})).to.throw(error)
    })

    it('should throw if combine different token classes', () => {
      const error = 'cannot combine different token classes'
      class DifferentToken extends Token { }
      class ExtendedToken extends TestToken { }
      expect(() => TestToken.combine(TestToken.mint(1), new DifferentToken(1))).to.throw(error)
      expect(() => TestToken.combine(TestToken.mint(1), new ExtendedToken(1))).to.throw(error)
    })

    it('should throw if combine duplicate tokens', () => {
      const token = TestToken.mint(1)
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
      expect(TestToken.mint(120).value).to.equal(1.2)
    })
  })
  */
})

// ------------------------------------------------------------------------------------------------
