
const bsv = require('bsv')
const { createRun, Run, deploy } = require('./test-util')
const { Token } = Run

const run = createRun()
beforeEach(() => run.blockchain.block())

class TestToken extends Token { }

TestToken.decimals = 2

describe('Token', () => {
  describe('init', () => {
    test('mint', () => {
      const token = new TestToken(100)
      expect(token.amount).toBe(100)
      expect(token.owner).toBe(TestToken.owner)
    })

    test('only class owner may mint', async () => {
      await run.deploy(TestToken)
      createRun({ blockchain: run.blockchain })
      expect(() => new TestToken(100)).toThrow('Only TestToken\'s owner may mint')
      run.activate()
    })

    test('must be extended', () => {
      expect(() => new Token(100)).toThrow('Token must be extended')
    })

    test('large amounts', () => {
      expect(new TestToken(2147483647).amount).toBe(2147483647)
      expect(new TestToken(Number.MAX_SAFE_INTEGER).amount).toBe(Number.MAX_SAFE_INTEGER)
    })

    test('bad amount', () => {
      expect(() => new TestToken()).toThrow('amount is not a number')
      expect(() => new TestToken('1')).toThrow('amount is not a number')
      expect(() => new TestToken(0)).toThrow('amount must be positive')
      expect(() => new TestToken(-1)).toThrow('amount must be positive')
      expect(() => new TestToken(Number.MAX_SAFE_INTEGER + 1)).toThrow('amount too large')
      expect(() => new TestToken(1.5)).toThrow('amount must be an integer')
      expect(() => new TestToken(Infinity)).toThrow('Infinity cannot be serialized to json')
      expect(() => new TestToken(NaN)).toThrow('NaN cannot be serialized to json')
    })
  })

  describe('send', () => {
    test('full amount', () => {
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      const token = new TestToken(100)
      expect(token.send(pubkey)).toBe(null)
      expect(token.owner).toBe(pubkey)
      expect(token.amount).toBe(100)
    })

    test('partial amount', () => {
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      const token = new TestToken(100)
      const change = token.send(pubkey, 30)
      expect(change).toBeInstanceOf(TestToken)
      expect(change.owner).toBe(run.owner.pubkey)
      expect(change.amount).toBe(70)
      expect(token.owner).toBe(pubkey)
      expect(token.amount).toBe(30)
    })

    test('too much', () => {
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      const token = new TestToken(100)
      expect(() => token.send(pubkey, 101)).toThrow('not enough funds')
    })

    test('bad amount', () => {
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      const token = new TestToken(100)
      expect(() => token.send(pubkey, {})).toThrow('amount is not a number')
      expect(() => token.send(pubkey, '1')).toThrow('amount is not a number')
      expect(() => token.send(pubkey, 0)).toThrow('amount must be positive')
      expect(() => token.send(pubkey, -1)).toThrow('amount must be positive')
      expect(() => token.send(pubkey, Number.MAX_SAFE_INTEGER + 1)).toThrow('amount too large')
      expect(() => token.send(pubkey, 1.5)).toThrow('amount must be an integer')
      expect(() => token.send(pubkey, Infinity)).toThrow('Infinity cannot be serialized to json')
      expect(() => token.send(pubkey, NaN)).toThrow('NaN cannot be serialized to json')
    })

    test('bad owner', () => {
      const token = new TestToken(100)
      expect(() => token.send(10)).toThrow('owner must be a pubkey string')
      expect(() => token.send('abc', 10)).toThrow('owner is not a valid public key')
    })
  })

  describe('combine', () => {
    test('two tokens', () => {
      const a = new TestToken(30)
      const b = new TestToken(70)
      const c = TestToken.combine(a, b)
      expect(c).toBeInstanceOf(TestToken)
      expect(c.amount).toBe(100)
      expect(c.owner).toBe(run.owner.pubkey)
      expect(a.amount).toBe(0)
      expect(a.owner).not.toBe(run.owner.pubkey)
      expect(b.amount).toBe(0)
      expect(b.owner).not.toBe(run.owner.pubkey)
    })

    test('many tokens', () => {
      const tokens = []
      for (let i = 0; i < 10; ++i) tokens.push(new TestToken(1))
      const combined = TestToken.combine(...tokens)
      expect(combined).toBeInstanceOf(TestToken)
      expect(combined.amount).toBe(10)
      expect(combined.owner).toBe(run.owner.pubkey)
      tokens.forEach(token => {
        expect(token.amount).toBe(0)
        expect(token.owner).not.toBe(run.owner.pubkey)
      })
    })

    test('load after combine', async () => {
      const a = new TestToken(30)
      const b = new TestToken(70)
      const c = TestToken.combine(a, b)
      await run.sync()
      Run.code.flush()
      const run2 = createRun({ blockchain: run.blockchain })
      const c2 = await run2.load(c.location)
      expect(c2.amount).toBe(c.amount)
      run.activate()
    })

    test('different owners', async () => {
      const a = new TestToken(1)
      const b = new TestToken(2)
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      b.send(pubkey)
      await expect(TestToken.combine(a, b).sync()).rejects.toThrow('Signature missing for TestToken')
    })

    test('amount too large', () => {
      const a = new TestToken(Number.MAX_SAFE_INTEGER)
      const b = new TestToken(1)
      expect(() => TestToken.combine(a, b)).toThrow('amount too large')
    })

    test('one token', () => {
      expect(() => TestToken.combine(new TestToken(1))).toThrow('must combine at least two tokens')
    })

    test('no tokens', () => {
      expect(() => TestToken.combine()).toThrow('must combine at least two tokens')
    })

    test('non-tokens', () => {
      const error = 'cannot combine different token classes'
      expect(() => TestToken.combine(new TestToken(1), 1)).toThrow(error)
      expect(() => TestToken.combine(new TestToken(1), {})).toThrow(error)
      expect(() => TestToken.combine(new TestToken(1), new TestToken(1), {})).toThrow(error)
    })

    test('different token classes', () => {
      const error = 'cannot combine different token classes'
      class DifferentToken extends Token { }
      class ExtendedToken extends TestToken { }
      expect(() => TestToken.combine(new TestToken(1), new DifferentToken(1))).toThrow(error)
      expect(() => TestToken.combine(new TestToken(1), new ExtendedToken(1))).toThrow(error)
    })

    test('duplicate tokens', () => {
      const token = new TestToken(1)
      expect(() => TestToken.combine(token, token)).toThrow('cannot combine duplicate tokens')
    })
  })

  describe('value', () => {
    test('defaults to 0', () => {
      class Token2 extends Token { }
      expect(Token2.decimals).toBe(0)
      expect(new Token2(120).value).toBe(120)
    })

    test('divides by decimals', () => {
      expect(new TestToken(120).value).toBe(1.2)
    })
  })

  describe('_onMint', () => {
    test.skip('limit supply', async () => {
      // TODO: need a good way to do this, ideally using class properties
    })
  })

  test.skip('deploy', async () => {
    await deploy(Token)
  })
})
