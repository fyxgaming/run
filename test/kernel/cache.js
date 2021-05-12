/**
 * cache.js
 *
 * Tests for cache functionality
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const LocalCache = require('../../lib/plugins/local-cache')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const CONFIG_KEY_CODE_FILTER = 'config://code-filter'

// ------------------------------------------------------------------------------------------------
// Cache
// ------------------------------------------------------------------------------------------------

describe('Cache', () => {
  // --------------------------------------------------------------------------
  // jig
  // --------------------------------------------------------------------------

  describe('jig', () => {
    it.skip('caches jigs after replace', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('loads jig from cache', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // berry
  // --------------------------------------------------------------------------

  describe('berry', () => {
    it.skip('cache berry after replay', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('caches berry with circular dependency', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('loads berry from cache', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('does not cache berry if undeployed', () => {
      // TODO
    })
  })

  // TODO
  /*
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
    it('should request load location', async () => {
      const run = new Run()
      spy(run.cache)
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      const value1 = { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } }
      const value2 = { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: 1 } }
      expect(run.cache.set.calledWith(`jig://${a.origin}`, value1)).to.equal(true)
      expect(run.cache.set.calledWith(`jig://${a.location}`, value2)).to.equal(true)
      const a2 = await run.load(a.location)
      expect(run.cache.get.calledWith(`jig://${a2.location}`)).to.equal(true)
    })

    it('should request dependent location', async () => {
      const run = new Run()
      spy(run.cache, 'set')
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      const middleLocation = a.location
      a.set(a)
      await a.sync()
      const value1 = { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } }
      const value2 = { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: 1 } }
      const value3 = { type: A.location, state: { origin: a.origin, owner: run.owner.address, satoshis: 0, n: { $ref: '_o1' } } }
      expect(run.cache.set.calledWith(`jig://${a.origin}`, value1)).to.equal(true)
      expect(run.cache.set.calledWith(`jig://${middleLocation}`, value2)).to.equal(true)
      expect(run.cache.set.calledWith(`jig://${a.location}`, value3)).to.equal(true)
      stub(run.cache, 'get').withArgs(`jig://${a.location}`).returns(undefined)
      const a2 = await run.load(a.location)
      expect(run.cache.get.calledWith(`jig://${a2.location}`)).to.equal(true)
      expect(run.cache.get.calledWith(`jig://${middleLocation}`)).to.equal(true)
    })

    it('should throw if return invalid state', async () => {
      const run = new Run()
      spy(run.cache, 'set')
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const value1 = { type: '_o1', state: { owner: run.owner.address, satoshis: 0 } }
      expect(run.cache.set.calledWith(`jig://${a.location}`, value1)).to.equal(true)
      // Load without a type property
      const badValue1 = { state: { owner: run.owner.address, satoshis: 0 } }
      const stubbedGet = stub(run.cache, 'get').withArgs(`jig://${a.location}`).returns(badValue1)
      await expect(run.load(a.location)).to.be.rejectedWith('Cached state is missing a valid type and/or state property')
      // Load without a state property
      const badValue2 = { type: A.location }
      stubbedGet.withArgs(`jig://${a.location}`).returns(badValue2)
      await expect(run.load(a.location)).to.be.rejectedWith('Cached state is missing a valid type and/or state property')
    })
  })
  */

  // --------------------------------------------------------------------------
  // filter
  // --------------------------------------------------------------------------

  describe('filter', () => {
    it('sets code filter for new code', async () => {
      const run = new Run({ cache: new LocalCache() })
      class A extends Jig { }
      run.deploy(A)
      await run.sync()
      const filter = await run.cache.get(CONFIG_KEY_CODE_FILTER)
      expect(filter.buckets.some(x => x > 0)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('updates code filter for new code', async () => {
      const run = new Run({ cache: new LocalCache() })
      run.cache = new LocalCache()
      class A extends Jig { }
      run.deploy(A)
      await run.sync()
      const buckets1 = Array.from((await run.cache.get(CONFIG_KEY_CODE_FILTER)).buckets)
      class B extends Jig { }
      run.deploy(B)
      await run.sync()
      const buckets2 = Array.from((await run.cache.get(CONFIG_KEY_CODE_FILTER)).buckets)
      expect(buckets1).not.to.deep.equal(buckets2)
    })

    // ------------------------------------------------------------------------

    it('does not update code filter for jigs or berries', async () => {
      const run = new Run({ cache: new LocalCache() })
      class A extends Jig { }
      run.deploy(A)
      await run.sync()
      const buckets1 = Array.from((await run.cache.get(CONFIG_KEY_CODE_FILTER)).buckets)
      const a = new A()
      await a.sync()
      const buckets2 = Array.from((await run.cache.get(CONFIG_KEY_CODE_FILTER)).buckets)
      expect(buckets1).to.deep.equal(buckets2)
    })
  })
})

// ------------------------------------------------------------------------------------------------
