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

  describe('set', () => {
    it('should call set for each update after sync', async () => {
      const run = new Run()
      spy(run.cache)
      class A extends Jig { inc () { this.n = (this.n || 0) + 1 } }
      const a = new A()
      await a.sync()
      const value1 = { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } }
      expect(run.cache.set.calledWith(`jig://${a.location}`, value1)).to.equal(true)
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
      const value1 = { type: '_o1', state: { owner: run.owner.address, satoshis: 0, b: { $ref: '_o4' } } }
      const value2 = { type: '_o2', state: { owner: run.owner.address, satoshis: 0 } }
      expect(run.cache.set.calledWith(`jig://${a.location}`, value1)).to.equal(true)
      expect(run.cache.set.calledWith(`jig://${a.b.location}`, value2)).to.equal(true)
    })

    it('should cache existing jig references', async () => {
      const run = new Run()
      spy(run.cache)
      class B extends Jig { }
      class A extends Jig { set (b) { this.b = b } }
      const b = new B()
      const a = new A()
      await a.set(b)
      await run.sync()
      const value1 = { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } }
      const value2 = { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } }
      const value3 = { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, b: { $ref: b.location } } }
      expect(run.cache.set.calledWith(`jig://${b.location}`, value1)).to.equal(true)
      expect(run.cache.set.calledWith(`jig://${a.origin}`, value2)).to.equal(true)
      expect(run.cache.set.calledWith(`jig://${a.location}`, value3)).to.equal(true)
    })

    it('should cache code references', async () => {
      const run = new Run()
      spy(run.cache)
      class B extends Jig { }
      run.deploy(B)
      class A extends Jig { init () { this.A = A; this.B = B } }
      A.deps = { B }
      const a = new A()
      await run.sync()
      const value = { type: '_o1', state: { owner: run.owner.address, satoshis: 0, A: { $ref: '_o1' }, B: { $ref: B.location } } }
      expect(run.cache.set.calledWith(`jig://${a.origin}`, value)).to.equal(true)
    })
  })

  describe('get', () => {
    /*
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
    */
  })

  /*
  describe('get', () => {
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
