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
const { COVER, STRESS } = require('../env/config')
const { LocalCache, Token } = Run

// ------------------------------------------------------------------------------------------------
// Token
// ------------------------------------------------------------------------------------------------

describe('Token', () => {
  // Wait for every test to finish. This makes debugging easier.
  // Don't deactivate the current run instance between tests. Token needs to stay deployed.
  afterEach(() => Run.instance && Run.instance.sync())

  if (COVER) Run.cover('TestToken')

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

    it('updates supply', () => {
      const run = new Run()
      const TestToken = run.deploy(class TestToken extends Token { })
      TestToken.mint(100)
      TestToken.mint(200)
      TestToken.mint(300)
      expect(TestToken.supply).to.equal(600)
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

    // ------------------------------------------------------------------------

    it('throws if try to fake class', async () => {
      const run = new Run()
      class TestToken extends Token { }
      run.deploy(TestToken)
      await run.sync()

      const run2 = new Run()
      class HackToken extends TestToken { }
      run2.deploy(HackToken)
      await expect(run2.sync()).to.be.rejectedWith('mandatory-script-verify-flag-failed')
    })
  })

  // --------------------------------------------------------------------------
  // send
  // --------------------------------------------------------------------------

  describe('send', () => {
    it('full amount', async () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      await token.sync()
      const sent = token.send(address)
      await sent.sync()
      expect(sent.owner).to.equal(address)
      expect(sent.amount).to.equal(100)
      expect(token.owner).to.equal(null)
      expect(token.amount).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('partial amount', async () => {
      const run = new Run()
      class TestToken extends Token { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      await token.sync()
      const sent = token.send(address, 30)
      await run.sync()
      expect(token.owner).to.equal(run.owner.address)
      expect(token.amount).to.equal(70)
      expect(sent).to.be.instanceOf(TestToken)
      expect(sent.owner).to.equal(address)
      expect(sent.amount).to.equal(30)
    })

    // ------------------------------------------------------------------------

    it('throws if send too much', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      expect(() => token.send(address, 101)).to.throw('Not enough funds')
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

    it('throws if send to bad owner', async () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const token = TestToken.mint(100)
      await token.sync()
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

    // ------------------------------------------------------------------------

    it('many tokens', async () => {
      const run = new Run()
      class TestToken extends Token { }
      const tokens = []
      for (let i = 0; i < 10; ++i) tokens.push(TestToken.mint(1))
      const combined = new TestToken(...tokens)
      await combined.sync()
      expect(combined).to.be.instanceOf(TestToken)
      expect(combined.amount).to.equal(10)
      expect(combined.owner).to.equal(run.owner.address)
      tokens.forEach(token => {
        expect(token.amount).to.equal(0)
        expect(token.owner).not.to.equal(run.owner.address)
      })
    })

    // ------------------------------------------------------------------------

    // load() does not work in cover mode for preinstalls
    if (!COVER) {
      it('load after combine', async () => {
        const run = new Run()
        class TestToken extends Token { }
        const a = TestToken.mint(30)
        const b = TestToken.mint(70)
        const c = new TestToken(a, b)
        await run.sync()
        run.cache = new LocalCache()
        const c2 = await run.load(c.location)
        expect(c2.amount).to.equal(c.amount)
      })
    }

    // ------------------------------------------------------------------------

    it('throws if combine different owners without signatures', async () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const a = TestToken.mint(1)
      const b = TestToken.mint(2)
      const address = new PrivateKey().toAddress().toString()
      await b.sync()
      b.send(address)
      await expect(new TestToken(a, b).sync()).to.be.rejected
    })

    // ------------------------------------------------------------------------

    it('throws if empty', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      expect(() => new TestToken()).to.throw('Invalid tokens to combine')
    })

    // ------------------------------------------------------------------------

    it('throws if one', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const token = TestToken.mint(1)
      expect(() => new TestToken(token)).to.throw('Invalid tokens to combine')
    })

    // ------------------------------------------------------------------------

    it('throws if combined amount is too large', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const a = TestToken.mint(Number.MAX_SAFE_INTEGER)
      const b = TestToken.mint(1)
      expect(() => new TestToken(a, b)).to.throw('amount too large')
    })

    // ------------------------------------------------------------------------

    it('throws if combine non-tokens', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const error = 'Cannot combine different token classes'
      expect(() => new TestToken(TestToken.mint(1), 1)).to.throw(error)
      expect(() => new TestToken(TestToken.mint(1), {})).to.throw(error)
      expect(() => new TestToken(TestToken.mint(1), TestToken.mint(1), {})).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if combine different token classes', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const error = 'Cannot combine different token classes'
      class DifferentToken extends Token { }
      class ExtendedToken extends TestToken { }
      expect(() => new TestToken(TestToken.mint(1), DifferentToken.mint(1))).to.throw(error)
      expect(() => new TestToken(TestToken.mint(1), ExtendedToken.mint(1))).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if combine duplicate tokens', () => {
      new Run() // eslint-disable-line
      class TestToken extends Token { }
      const token = TestToken.mint(1)
      expect(() => new TestToken(token, token)).to.throw('Cannot combine duplicate tokens')
    })
  })

  // --------------------------------------------------------------------------
  // Stress
  // --------------------------------------------------------------------------

  if (STRESS) {
    describe('Stress', () => {
      it('many sends', async () => {
        const a = new Run()
        a.timeout = 500000
        const b = new Run()
        b.timeout = 500000
        class TestToken extends Token { }
        const TT = await b.deploy(TestToken)

        // B mints tokens
        for (let i = 0; i < 20; i++) {
          const token = TT.mint(10)
          await token.sync()

          Run.instance.blockchain.block()
        }

        // B sends to A and back again in a loop
        for (let i = 0; i < 20; i++) {
          b.activate()
          await b.inventory.sync()
          b.inventory.jigs.forEach(jig => jig.send(a.owner.pubkey))
          await b.sync()

          a.activate()
          await a.inventory.sync()
          a.inventory.jigs.forEach(jig => jig.send(b.owner.pubkey))
          await a.sync()

          Run.instance.blockchain.block()
        }

        // Loading from scratch
        b.activate()
        b.cache = new LocalCache()
        await b.inventory.sync()
      })
    })
  }

  // ------------------------------------------------------------------------

  it.skip('deploy', async () => {
    // run.deploy(Run.Token)
    // await run.sync()
    // console.log(Run.Token)
  })
})

// ------------------------------------------------------------------------------------------------
