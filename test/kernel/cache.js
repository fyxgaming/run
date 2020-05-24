/**
 * cache.js
 *
 * Cache API tests that should work across all Cache implementations
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const { spy } = require('sinon')
const { PrivateKey } = require('bsv')
const { Run } = require('../env/config')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Cache
// ------------------------------------------------------------------------------------------------

describe.only('Cache', () => {
  afterEach(() => Run.instance && Run.instance.deactivate())

  it('should call set for each update after sync', async () => {
    const run = new Run()
    spy(run.cache)
    class A extends Jig { inc () { this.n = (this.n || 0) + 1 } }
    const a = new A()
    await a.sync()
    const value = { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } }
    expect(run.cache.set.calledWith(`jig://${a.location}`, value)).to.equal(true)
    await a.inc()
    await a.sync()
    const value2 = { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: 1 } }
    expect(run.cache.set.calledWith(`jig://${a.location}`, value2)).to.equal(true)
  })

  it('should cache satoshis', async () => {
    const run = new Run()
    spy(run.cache)
    class A extends Jig { init () { this.satoshis = 3000 } }
    const a = new A()
    await a.sync()
    const value = { type: '_o1', state: { owner: run.owner.address, satoshis: 3000 } }
    expect(run.cache.set.calledWith(`jig://${a.location}`, value)).to.equal(true)
  })

  it('should cache owner', async () => {
    const run = new Run()
    spy(run.cache)
    const owner = new PrivateKey().publicKey.toString()
    class A extends Jig { init (owner) { this.owner = owner } }
    const a = new A(owner)
    await a.sync()
    const value = { type: '_o1', state: { owner, satoshis: 0 } }
    expect(run.cache.set.calledWith(`jig://${a.location}`, value)).to.equal(true)
  })

  it('should cache new jig references', async () => {
    const run = new Run()
    spy(run.cache)
    class B extends Jig { }
    class A extends Jig { init () { this.b = new B() } }
    A.deps = { B }
    const a = new A()
    await run.sync()
    const value = { type: '_o1', state: { owner: run.owner.address, satoshis: 0, b: { $ref: '_o4' } } }
    const value2 = { type: '_o2', state: { owner: run.owner.address, satoshis: 0 } }
    expect(run.cache.set.calledWith(`jig://${a.location}`, value)).to.equal(true)
    expect(run.cache.set.calledWith(`jig://${a.b.location}`, value2)).to.equal(true)
  })

  /*
  describe('set', () => {

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
  })
  */
})

// ------------------------------------------------------------------------------------------------
