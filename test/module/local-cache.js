/**
 * local-cache.js
 *
 * Tests for lib/module/local-cache.js
 */

const bsv = require('bsv')
const { describe, it, after, beforeEach, afterEach } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// LocalCache
// ------------------------------------------------------------------------------------------------

describe.only('LocalCache', () => {
  describe('constructor', () => {
    it('should accept valid maxSizeMB', () => {
      new LocalCache({ maxSizeMB: 0 }) // eslint-disable-line
      new LocalCache({ maxSizeMB: 0.5 }) // eslint-disable-line
      new LocalCache({ maxSizeMB: 1 }) // eslint-disable-line
      new LocalCache({ maxSizeMB: 100 }) // eslint-disable-line
      new LocalCache({ maxSizeMB: Infinity }) // eslint-disable-line
    })

    it('should throw if invalid maxSizeMB', () => {
      expect(() => new LocalCache({ maxSizeMB: NaN })).to.throw('Invalid maxSizeMB')
      expect(() => new LocalCache({ maxSizeMB: -Infinity })).to.throw('Invalid maxSizeMB')
      expect(() => new LocalCache({ maxSizeMB: -1 })).to.throw('Invalid maxSizeMB')
      expect(() => new LocalCache({ maxSizeMB: null })).to.throw('Invalid maxSizeMB')
      expect(() => new LocalCache({ maxSizeMB: '1' })).to.throw('Invalid maxSizeMB')
      expect(() => new LocalCache({ maxSizeMB: () => 10 })).to.throw('Invalid maxSizeMB')
    })

    it('should set default maxSizeMB to 10', () => {
      expect(new LocalCache().maxSizeMB).to.equal(10)
    })
  })

  describe('maxSizeMB', () => {
    it('should allow setting valid maxSizeMB', () => {
      new LocalCache().maxSizeMB = 0
      new LocalCache().maxSizeMB = 0.5
      new LocalCache().maxSizeMB = 1
      new LocalCache().maxSizeMB = 100
      new LocalCache().maxSizeMB = Infinity
    })

    it('should throw if set invalid maxSizeMB', () => {
      expect(() => { new LocalCache().maxSizeMB = NaN }).to.throw('Invalid maxSizeMB')
      expect(() => { new LocalCache().maxSizeMB = -Infinity }).to.throw('Invalid maxSizeMB')
      expect(() => { new LocalCache().maxSizeMB = -1 }).to.throw('Invalid maxSizeMB')
      expect(() => { new LocalCache().maxSizeMB = null }).to.throw('Invalid maxSizeMB')
      expect(() => { new LocalCache().maxSizeMB = '1' }).to.throw('Invalid maxSizeMB')
      expect(() => { new LocalCache().maxSizeMB = () => 10 }).to.throw('Invalid maxSizeMB')
    })

    it('should reduce size if necessary', async () => {
      const cache = new LocalCache()
      await cache.set('0', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      await cache.set('1', '1')
      cache.maxSizeMB = 10 / 1000 / 1000
      expect(await cache.get('0')).to.equal(undefined)
      expect(await cache.get('1')).to.equal('1')
    })
  })

  describe('get', () => {
    it('should return value previously set', async () => {
      const cache = new LocalCache()
      await cache.set('a', 1)
      expect(await cache.get('a')).to.equal(1)
    })

    it('should return undefined if missing', async () => {
      const cache = new LocalCache()
      expect(await cache.get('a')).to.equal(undefined)
    })

    it('should bump value to the front', async () => {
      const maxSizeMB = 20 / 1000 / 1000
      const cache = new LocalCache()
      await cache.set('a', 'a')
      await cache.set('b', 'b')
      await cache.get('a')
      cache.maxSizeMB = 10 / 1000 / 1000
      expect(await cache.get('a')).to.equal('a')
      expect(await cache.get('b')).to.equal(undefined)
    })
  })

  describe('set', () => {
    // TODO
  })

  describe('clear', () => {
    it('should remove all entries', async () => {
      const cache = new LocalCache()
      await cache.set('a', 1)
      await cache.clear()
      expect(await cache.get('a')).to.equal(undefined)
    })

    it('should reset cache size', async () => {
      const maxSizeMB = 10 / 1000 / 1000
      const cache = new LocalCache({ maxSizeMB })
      await cache.set('a', 'a')
      cache.clear()
      await cache.set('b', 'b')
      expect(await cache.get('b')).to.equal('b')
    })
  })
})

describe('LocalCache (old)', () => {
  const txid = '0000000000000000000000000000000000000000000000000000000000000000'

  const cacheGets = []
  const cacheSets = []
  const cacheGetOverrides = new Map()

  class WrappedCache extends LocalCache {
    async get (key) {
      cacheGets.push(key)
      if (cacheGetOverrides.has(key)) return cacheGetOverrides.get(key)
      return super.get(key)
    }

    async set (key, value) {
      cacheSets.push({ key, value })
      super.set(key, value)
    }
  }

  function expectCacheGet (key) {
    expect(cacheGets.shift()).to.equal(key)
  }

  function expectCacheSet (key, value) {
    expect(cacheSets.shift()).to.deep.equal({ key, value })
  }

  afterEach(() => {
    expect(cacheGets.length).to.equal(0)
    expect(cacheSets.length).to.equal(0)
  })

  const run = new Run({ cache: new WrappedCache() })
  beforeEach(() => run.activate())

  // Clear the instance after the cache tests so that we don't reuse the WrappedCache
  after(() => { Run.instance = null })

  describe('set', () => {
    it('should call set for each update after sync', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      await a.sync()
      expectCacheSet('jig://' + a.location, { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } })
      await a.set([true, null])
      await a.sync()
      expectCacheSet('jig://' + a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: [true, null] } })
    })

    it('should cache satoshis', async () => {
      class A extends Jig { init () { this.satoshis = 3000 } }
      const a = new A()
      await a.sync()
      expectCacheSet('jig://' + a.location, { type: '_o1', state: { owner: run.owner.address, satoshis: 3000 } })
    })

    it('should cache owner', async () => {
      const owner = new bsv.PrivateKey().publicKey.toString()
      class A extends Jig { init (owner) { this.owner = owner } }
      const a = new A(owner)
      await a.sync()
      expectCacheSet('jig://' + a.location, { type: '_o1', state: { owner, satoshis: 0 } })
    })

    it('should cache new jig references', async () => {
      class B extends Jig { }
      class A extends Jig { init () { this.b = new B() } }
      A.deps = { B }
      const a = new A()
      await run.sync()
      expectCacheSet('jig://' + a.location, { type: '_o1', state: { owner: run.owner.address, satoshis: 0, b: { $ref: '_o4' } } })
      expectCacheSet('jig://' + a.b.location, { type: '_o2', state: { owner: run.owner.address, satoshis: 0 } })
    })

    it('should cache pre-existing jig references', async () => {
      class B extends Jig { }
      class A extends Jig { set (b) { this.b = b } }
      const b = new B()
      const a = new A()
      await a.set(b)
      await run.sync()
      expectCacheSet('jig://' + b.location, { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } })
      expectCacheSet('jig://' + a.origin, { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } })
      expectCacheSet('jig://' + a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, b: { $ref: b.location } } })
    })

    it('should cache code references', async () => {
      class B extends Jig { }
      run.deploy(B)
      class A extends Jig { init () { this.A = A; this.B = B } }
      A.deps = { B }
      const a = new A()
      await run.sync()
      expectCacheSet('jig://' + a.origin, { type: '_o1', state: { owner: run.owner.address, satoshis: 0, A: { $ref: '_o1' }, B: { $ref: B.location } } })
    })

    it('should respect max cache size', async () => {
      const cache = unmangle(new Run.LocalCache({ maxSizeMB: 400 / 1000 / 1000 }))
      for (let i = 0; i < 100; i++) {
        await cache.set(`${txid}_o` + i, i)
      }
      expect(cache._map.size < 100).to.equal(true)
      expect(cache._map.has(`${txid}_o99`)).to.equal(true)
      expect(cache._map.has(`${txid}_o0`)).to.equal(false)
    })

    it('should move existing values to the front of the cache', async () => {
      const cache = unmangle(new Run.LocalCache({ maxSizeMB: 30 }))
      await cache.set(`${txid}_o0`, undefined)
      await cache.set(`${txid}_o1`, undefined)
      await cache.set(`${txid}_o2`, undefined)
      expect(cache._map.keys().next().value).to.equal(`${txid}_o0`)
      const sizeBytesBefore = unmangle(cache)._sizeBytes
      expect(sizeBytesBefore).not.to.equal(0)
      await cache.set(`${txid}_o0`, undefined)
      expect(unmangle(cache)._sizeBytes).to.equal(sizeBytesBefore)
      expect(cache._map.keys().next().value).to.equal(`${txid}_o1`)
    })

    it('should throw for different values of same key', async () => {
      const cache = new Run.LocalCache({ maxSizeMB: 30 })
      await cache.set(`${txid}_o0`, { n: 1 })
      await expect(cache.set(`${txid}_o0`, { n: 2 })).to.be.rejectedWith('Attempt to set different values for the same key')
      await expect(cache.set(`${txid}_o0`, { n: 'a' })).to.be.rejectedWith('Attempt to set different values for the same key')
      await expect(cache.set(`${txid}_o0`, { n: 'a', m: 'b' })).to.be.rejectedWith('Attempt to set different values for the same key')
    })
  })

  describe('get', () => {
    it('should return latest value', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      expectCacheSet('jig://' + a.origin, { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } })
      expectCacheSet('jig://' + a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: 1 } })
      const a2 = await run.load(a.location)
      expectCacheGet('jig://' + a2.location)
    })

    it('should return original value', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      expectCacheSet('jig://' + a.origin, { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } })
      expectCacheSet('jig://' + a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: 1 } })
      cacheGetOverrides.set('jig://' + a.location, undefined)
      const a2 = await run.load(a.location)
      expectCacheGet('jig://' + a2.location)
      expectCacheGet('jig://' + a2.origin)
    })

    it('should return middle state', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      const middleLocation = a.location
      a.set(a)
      await a.sync()
      expectCacheSet('jig://' + a.origin, { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } })
      expectCacheSet('jig://' + middleLocation, { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: 1 } })
      expectCacheSet('jig://' + a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: { $ref: '_o1' } } })
      cacheGetOverrides.set('jig://' + a.location, undefined)
      const a2 = await run.load(a.location)
      expectCacheGet('jig://' + a2.location)
      expectCacheGet('jig://' + middleLocation)
    })

    it('should throw if invalid state', async () => {
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expectCacheSet('jig://' + a.location, { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } })
      // Load without a type property
      cacheGetOverrides.set('jig://' + a.location, { state: { owner: run.owner.address, satoshis: 0 } })
      await expect(run.load(a.location)).to.be.rejectedWith('Cached state is missing a valid type and/or state property')
      expectCacheGet('jig://' + a.location)
      // Load without a state property
      cacheGetOverrides.set('jig://' + a.location, { type: A.location })
      await expect(run.load(a.location)).to.be.rejectedWith('Cached state is missing a valid type and/or state property')
      expectCacheGet('jig://' + a.location)
      // Load correct state
      cacheGetOverrides.clear()
      await run.load(a.location)
      expectCacheGet('jig://' + a.location)
    })

    it('should return undefined if missing', async () => {
      const cache = new Run.LocalCache({ maxSizeMB: 30 })
      expect(await cache.get(`${txid}_o0`)).to.equal(undefined)
    })

    it.skip('should throw if hashed state does not match', async () => {
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expectCacheSet('jig://' + a.origin, { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } })
      cacheGetOverrides.set('jig://' + a.location, { n: 1 })
      await expect(run.load(a.location)).to.be.rejectedWith('hello')
      expectCacheGet('jig://' + a.location)
    })

    // TODO: pending state of jigs changed, make sure does not interfere in _publishNext

    // TODO: Change maxSizeMB
  })
})

// ------------------------------------------------------------------------------------------------
