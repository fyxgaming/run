/**
 * token2.js
 *
 * Tests for lib/extra/token2.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { PrivateKey } = require('bsv')
const Run = require('../env/run')
const { COVER, STRESS } = require('../env/config')
const { getExtrasBlockchain } = require('../env/misc')
const unmangle = require('../env/unmangle')
const Token2 = unmangle(Run)._Token2
const { LocalCache } = Run.plugins

// ------------------------------------------------------------------------------------------------
// Token
// ------------------------------------------------------------------------------------------------

describe('Token', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  if (COVER) Run.cover('TestToken')

  // --------------------------------------------------------------------------
  // mint
  // --------------------------------------------------------------------------

  describe('mint', () => {
    it('new tokens', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token2 { }
      const token = TestToken.mint(100)
      await token.sync()
      expect(token.amount).to.equal(100)
      expect(token.owner).to.equal(TestToken.owner)
    })

    // ------------------------------------------------------------------------

    it('updates supply', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      const TestToken = run.deploy(class TestToken extends Token2 { })
      TestToken.mint(100)
      TestToken.mint(200)
      TestToken.mint(300)
      expect(TestToken.supply).to.equal(600)
    })

    // ------------------------------------------------------------------------

    it('throws if class is not extended', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      expect(() => Token2.mint(100)).to.throw('Token2 must be extended')
    })

    // ------------------------------------------------------------------------

    it('large amounts', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token2 { }
      expect(TestToken.mint(2147483647).amount).to.equal(2147483647)
      expect(TestToken.mint(Number.MAX_SAFE_INTEGER).amount).to.equal(Number.MAX_SAFE_INTEGER)
    })

    // ------------------------------------------------------------------------

    it('throws for bad amounts', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token2 { }
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
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      run.deploy(TestToken)
      await run.sync()

      const run2 = new Run({ blockchain: await getExtrasBlockchain() })
      class HackToken extends TestToken { }
      run2.deploy(HackToken)
      await expect(run2.sync()).to.be.rejectedWith('Missing signature for TestToken')
    })

    // ------------------------------------------------------------------------

    it('sender is null', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      const token = TestToken.mint(1)
      await run.sync()
      expect(token.sender).to.equal(null)
      if (COVER) return
      const token2 = await run.load(token.location)
      expect(token2.sender).to.equal(null)
      run.cache = new LocalCache()
      const token3 = await run.load(token.location)
      expect(token3.sender).to.equal(null)
    })
  })

  // --------------------------------------------------------------------------
  // send
  // --------------------------------------------------------------------------

  describe('send', () => {
    it('full amount', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      await token.sync()
      const change = token.send(address)
      expect(change).to.equal(null)
      expect(token.owner).to.equal(address)
      expect(token.amount).to.equal(100)
      expect(token.sender).to.equal(run.owner.address)
    })

    // ------------------------------------------------------------------------

    it('partial amount', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      await token.sync()
      const change = token.send(address, 30)
      await run.sync()
      expect(token.owner).to.equal(address)
      expect(token.amount).to.equal(30)
      expect(token.sender).to.equal(run.owner.address)
      expect(change).to.be.instanceOf(TestToken)
      expect(change.owner).to.equal(run.owner.address)
      expect(change.amount).to.equal(70)
      expect(change.sender).to.equal(null)
    })

    // ------------------------------------------------------------------------

    it('throws if send too much', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token2 { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      expect(() => token.send(address, 101)).to.throw('Not enough funds')
    })

    // ------------------------------------------------------------------------

    it('throws if send bad amount', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token2 { }
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
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token2 { }
      const token = TestToken.mint(100)
      await token.sync()
      expect(() => token.send(10)).to.throw('Invalid owner: 10')
      expect(() => token.send('abc', 10)).to.throw('Invalid owner: "abc"')
    })

    // ------------------------------------------------------------------------

    it('sender on sent token is sending owner', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      const token = TestToken.mint(2)
      await token.sync()
      const change = token.send(run.purse.address, 1)
      expect(token.sender).to.equal(change.owner)
      await change.sync()
      if (COVER) return
      const token2 = await run.load(token.location)
      expect(token2.sender).to.equal(change.owner)
      run.cache = new LocalCache()
      const token3 = await run.load(token.location)
      expect(token3.sender).to.equal(change.owner)
    })

    // ------------------------------------------------------------------------

    it('sender on change token is null', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      const token = TestToken.mint(2)
      await token.sync()
      const change = token.send(run.owner.address, 1)
      await change.sync()
      expect(change.sender).to.equal(null)
      if (COVER) return
      const change2 = await run.load(change.location)
      expect(change2.sender).to.equal(null)
      run.cache = new LocalCache()
      const change3 = await run.load(change.location)
      expect(change3.sender).to.equal(null)
    })

    // ------------------------------------------------------------------------

    it('custom lock', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      const CustomLock = await run.deploy(class CustomLock {
        script () { return '' }
        domain () { return 0 }
      }).sync()
      class TestToken extends Token2 { }
      const a = TestToken.mint(2)
      await a.sync()
      a.send(new CustomLock())
      await run.sync()
      expect(a.owner instanceof CustomLock).to.equal(true)
      await a.sync()
      if (COVER) return
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      expect(a2.owner instanceof CustomLock).to.equal(true)
    })
  })

  // --------------------------------------------------------------------------
  // combine
  // --------------------------------------------------------------------------

  describe('combine', () => {
    it('two tokens', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      const a = TestToken.mint(30)
      const b = TestToken.mint(70)
      expect(a.combine(b)).to.equal(a)
      await run.sync()
      expect(a.amount).to.equal(100)
      expect(a.owner).to.equal(run.owner.address)
      expect(b.amount).to.equal(0)
      expect(b.owner).not.to.equal(run.owner.address)
      expect(b.location.endsWith('_d0')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('many tokens', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      const tokens = []
      for (let i = 0; i < 10; ++i) tokens.push(TestToken.mint(1))
      const combined = tokens[0].combine(...tokens.slice(1))
      await combined.sync()
      expect(combined).to.be.instanceOf(TestToken)
      expect(combined.amount).to.equal(10)
      expect(combined.owner).to.equal(run.owner.address)
      tokens.forEach(token => {
        if (token === combined) return
        expect(token.amount).to.equal(0)
        expect(token.owner).not.to.equal(run.owner.address)
      })
    })

    // ------------------------------------------------------------------------

    // load() does not work in cover mode for preinstalls
    it('load after combine', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      const a = TestToken.mint(30)
      const b = TestToken.mint(70)
      a.combine(b)
      await run.sync()
      if (COVER) return
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      expect(a2.amount).to.equal(a.amount)
    })

    // ------------------------------------------------------------------------

    it('throws if combine different owners without signatures', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token2 { }
      const a = TestToken.mint(1)
      const b = TestToken.mint(2)
      const address = new PrivateKey().toAddress().toString()
      await b.sync()
      b.send(address)
      await expect(a.combine(b).sync()).to.be.rejected
    })

    // ------------------------------------------------------------------------

    it('throws if empty', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token2 { }
      const a = TestToken.mint(1)
      expect(() => a.combine()).to.throw('Invalid tokens to combine')
    })

    // ------------------------------------------------------------------------

    it('throws if combined amount is too large', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token2 { }
      const a = TestToken.mint(Number.MAX_SAFE_INTEGER)
      const b = TestToken.mint(1)
      expect(() => a.combine(b)).to.throw('amount too large')
    })

    // ------------------------------------------------------------------------

    it('throws if combine non-tokens', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token2 { }
      const error = 'Cannot combine different token classes'
      expect(() => TestToken.mint(1).combine(1)).to.throw(error)
      expect(() => TestToken.mint(1).combine({})).to.throw(error)
      expect(() => TestToken.mint(1).combine(TestToken.mint(1), {})).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if combine different token classes', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token2 { }
      const error = 'Cannot combine different token classes'
      class DifferentToken extends Token2 { }
      class ExtendedToken extends TestToken { }
      expect(() => TestToken.mint(1).combine(DifferentToken.mint(1))).to.throw(error)
      expect(() => TestToken.mint(1).combine(ExtendedToken.mint(1))).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if combine duplicate tokens', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token2 { }
      const token = TestToken.mint(1)
      expect(() => token.combine(token)).to.throw('Cannot combine duplicate tokens')
    })

    // ------------------------------------------------------------------------

    it('sender on combined token is null', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      const a = TestToken.mint(2)
      const b = TestToken.mint(2)
      await run.sync()
      const c = b.send(run.owner.address, 1)
      const combined = a.combine(b, c)
      await combined.sync()
      expect(combined.sender).to.equal(null)
      if (COVER) return
      const combined2 = await run.load(combined.location)
      expect(combined2.sender).to.equal(null)
      run.cache = new LocalCache()
      const combined3 = await run.load(combined.location)
      expect(combined3.sender).to.equal(null)
    })
  })

  // --------------------------------------------------------------------------
  // destroy
  // --------------------------------------------------------------------------

  describe('destroy', () => {
    it('amount is 0', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      const token = TestToken.mint(2)
      expect(token.amount).to.equal(2)
      token.destroy()
      expect(token.amount).to.equal(0)
      await run.sync()
      if (COVER) return
      run.cache = new LocalCache()
      const token2 = await run.load(token.location)
      expect(token2.amount).to.equal(0)
      const token3 = await run.load(token.location)
      expect(token3.amount).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('sender is null', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      const token = TestToken.mint(2)
      await token.sync()
      token.send(run.owner.address, 1)
      expect(token.sender).to.equal(run.owner.address)
      token.destroy()
      expect(token.sender).to.equal(null)
      await run.sync()
      if (COVER) return
      run.cache = new LocalCache()
      const token2 = await run.load(token.location)
      expect(token2.sender).to.equal(null)
      const token3 = await run.load(token.location)
      expect(token3.sender).to.equal(null)
    })

    // ------------------------------------------------------------------------

    it('cannot be combined', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token2 { }
      const a = TestToken.mint(2)
      a.destroy()
      const b = TestToken.mint(2)
      a.combine(b)
      await expect(a.sync()).to.be.rejected
    })

    // ------------------------------------------------------------------------

    it('cannot be sent', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      const a = TestToken.mint(2)
      a.destroy()
      expect(() => a.send(run.owner.address)).to.throw()
    })
  })

  // --------------------------------------------------------------------------
  // Batch
  // --------------------------------------------------------------------------

  describe('Batch', () => {
    it('combine and send', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token2 { }
      const a = TestToken.mint(1)
      const b = TestToken.mint(2)
      await run.sync()
      const address = new PrivateKey().toAddress().toString()
      run.transaction(() => a.combine(b).send(address))
      function test (a) {
        expect(a.amount).to.equal(3)
        expect(a.owner).to.equal(address)
      }
      test(a)
      await run.sync()
      if (COVER) return
      const a2 = await run.load(a.location)
      test(a2)
      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })
  })

  // --------------------------------------------------------------------------
  // Stress
  // --------------------------------------------------------------------------

  if (STRESS) {
    describe('Stress', () => {
      if (!COVER) {
        it('many sends', async () => {
          const a = new Run()
          a.timeout = 500000
          const b = new Run()
          b.timeout = 500000
          class TestToken extends Token2 { }
          const TT = b.deploy(TestToken)
          await b.sync()

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
      }
    })
  }

  // ------------------------------------------------------------------------

  it.skip('deploy', async () => {
    // Hint: Run with env NETWORK=<network> to deploy with keys
    const run = new Run()
    run.deploy(Run.extra.Token)
    await run.sync()
    console.log(Run.extra.Token)
  })
})

// ------------------------------------------------------------------------------------------------
