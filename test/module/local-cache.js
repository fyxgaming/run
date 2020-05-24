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

const txid = '0000000000000000000000000000000000000000000000000000000000000000'

describe('LocalCache', () => {
  const cacheGets = []
  const cacheSets = []
  const cacheGetOverrides = new Map()

  class WrappedCache extends LocalCache {
    async get (location) {
      cacheGets.push(location)
      if (cacheGetOverrides.has(location)) return cacheGetOverrides.get(location)
      return super.get(location)
    }

    async set (location, state) {
      cacheSets.push({ location, state })
      super.set(location, state)
    }
  }

  function expectCacheGet (location) {
    expect(cacheGets.shift()).to.equal(location)
  }

  function expectCacheSet (location, state) {
    expect(cacheSets.shift()).to.deep.equal({ location, state })
  }

  afterEach(() => {
    expect(cacheGets.length).to.equal(0)
    expect(cacheSets.length).to.equal(0)
  })

  const run = new Run({ cache: new WrappedCache() })
  beforeEach(() => run.activate())

  // Clear the instance after the state tests so that we don't reuse the WrappedCache
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
      const state = new Run.LocalCache({ maxSizeMB: 400 / 1000 / 1000 })
      for (let i = 0; i < 100; i++) {
        await state.set(`${txid}_o` + i, i)
      }
      expect(state.cache.size < 100).to.equal(true)
      expect(state.cache.has(`${txid}_o99`)).to.equal(true)
      expect(state.cache.has(`${txid}_o0`)).to.equal(false)
    })

    it('should move existing values to the front of the cache', async () => {
      const state = new Run.LocalCache({ maxSizeMB: 30 })
      await state.set(`${txid}_o0`, undefined)
      await state.set(`${txid}_o1`, undefined)
      await state.set(`${txid}_o2`, undefined)
      expect(state.cache.keys().next().value).to.equal(`${txid}_o0`)
      const sizeBytesBefore = unmangle(state)._sizeBytes
      expect(sizeBytesBefore).not.to.equal(0)
      await state.set(`${txid}_o0`, undefined)
      expect(unmangle(state)._sizeBytes).to.equal(sizeBytesBefore)
      expect(state.cache.keys().next().value).to.equal(`${txid}_o1`)
    })

    it('should throw for different values of same key', async () => {
      const state = new Run.LocalCache({ maxSizeMB: 30 })
      await state.set(`${txid}_o0`, { n: 1 })
      await expect(state.set(`${txid}_o0`, { n: 2 })).to.be.rejectedWith('Attempt to set different states for the same location')
      await expect(state.set(`${txid}_o0`, { n: 'a' })).to.be.rejectedWith('Attempt to set different states for the same location')
      await expect(state.set(`${txid}_o0`, { n: 'a', m: 'b' })).to.be.rejectedWith('Attempt to set different states for the same location')
    })
  })

  describe('get', () => {
    it('should return latest state', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      expectCacheSet('jig://' + a.origin, { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } })
      expectCacheSet('jig://' + a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: 1 } })
      const a2 = await run.load(a.location)
      expectCacheGet('jig://' + a2.location)
      expectCacheSet('jig://' + a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: 1 } })
    })

    it('should return original state', async () => {
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
      expectCacheSet('jig://' + a.origin, { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } })
      expectCacheSet('jig://' + a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: 1 } })
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
      expectCacheSet('jig://' + middleLocation, { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: 1 } })
      expectCacheSet('jig://' + a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: { $ref: '_o1' } } })
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
      expectCacheSet('jig://' + a.location, { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } })
    })

    it('should return undefined if missing', async () => {
      const state = new Run.LocalCache({ maxSizeMB: 30 })
      expect(await state.get(`${txid}_o0`)).to.equal(undefined)
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
