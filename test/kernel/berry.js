const { expect } = require('chai')
/**
 * berry.js
 *
 * Tests for lib/kernel/berry.js
 */

const { describe, it, afterEach } = require('mocha')
const Run = require('../env/run')
const { Berry, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Berry
// ------------------------------------------------------------------------------------------------

describe('Berry', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // pluck
  // --------------------------------------------------------------------------

  describe('pluck', () => {
    it('basic berry', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { return new B() } }
      const CB = run.deploy(B)
      await run.sync()
      const b = await run.load('abc', { berry: CB })
      const location = CB.location + '_abc'
      function test (b) {
        expect(b instanceof B).to.equal(true)
        expect(b.location).to.equal(location)
      }
      test(b)
      const b2 = await run.load(location)
      test(b2)
      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('undeployed berry', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { return new B() } }
      const b = await run.load('abc', { berry: B })
      expect(b instanceof B).to.equal(true)
      expect(() => b.location).to.throw()
    })

    // ------------------------------------------------------------------------

    it('deploying berry remains undeployed', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { return new B() } }
      const CB = run.deploy(B)
      const b = await run.load('abc', { berry: CB })
      expect(b instanceof B).to.equal(true)
      expect(() => b.location).to.throw()
      await run.sync()
      expect(() => b.location).to.throw()
    })

    // ------------------------------------------------------------------------

    it('berry with parent', async () => {
      const run = new Run()
      class B extends Berry { }
      class C extends B { static async pluck () { return new C() } }
      const c = await run.load('', { berry: C })
      expect(c instanceof C).to.equal(true)
    })
    // ------------------------------------------------------------------------

    it('may inherit parent pluck method', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { return new this() } }
      class C extends B { }
      class D extends B { }
      run.deploy(C)
      run.deploy(D)
      await run.sync()
      const c = await run.load('', { berry: C })
      const d = await run.load('', { berry: D })
      function test (c, d) {
        expect(c instanceof C).to.equal(true)
        expect(d instanceof D).to.equal(true)
      }
      test(c, d)
      const c2 = await run.load(C.location + '_')
      const d2 = await run.load(D.location + '_')
      test(c2, d2)
      run.cache = new LocalCache()
      const c3 = await run.load(C.location + '_')
      const d3 = await run.load(D.location + '_')
      test(c3, d3)
    })

    // ------------------------------------------------------------------------

    it.only('berry with deps', async () => {
      const run = new Run()
      function f () { return 1 }
      class B extends Berry {
        init (n) { this.n = n }
        static async pluck () { return new B(f()) }
      }
      B.deps = { f }
      run.deploy(B)
      await run.sync()
      console.log('-1')
      const b = await run.load('123', { berry: B })
      console.log('0')
      const location = b.constructor.location + '_123'
      function test (b) {
        expect(b.location).to.equal(location)
        expect(b.n).to.equal(1)
      }
      test(b)
      console.log('1')
      const b2 = await run.load(location)
      test(b2)
      console.log('2')
      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it.skip('return immutable', () => {
      // TODO
      // Check inner
    })

    // ------------------------------------------------------------------------

    it.skip('plucks from cache if possible', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('multi-line paths', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('unicode paths', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('spaces in paths', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws for invalid path', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if return unrelated class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if return parent class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if return child class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if return non-object', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if pluck Berry', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if create more than one', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if not async', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('caches future plucks', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if init throws', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if called by user', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // init
  // --------------------------------------------------------------------------

  describe('init', () => {
    it.skip('set properties', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('define properties', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('delete properties', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('get own properties', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('runs in sandbox', () => {
      // TODO
      // Check with undeployed class
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set location', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if define location', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set prototype', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if create outside pluck', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if create in a different plucker', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if return value', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if async', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // fetch
  // --------------------------------------------------------------------------

  describe('fetch', () => {
    it.skip('fetches raw transaction', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('sandboxed', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may fetch multiple transactions', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('call from internal helper', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('call from external helper', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if not a transaction', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if blockchain timeout', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('cannot catch fetch errors', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Method
  // --------------------------------------------------------------------------

  describe('Method', () => {
    it.skip('get', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('getOwnPropertyDescriptor', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if define', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if delete', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set prototype', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('method calls read berry class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('method calls that read dep reads dep', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('unify with args', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Jig
  // --------------------------------------------------------------------------

  describe('Jig', () => {
    it.skip('assigns to jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('pass into jig method', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if use undeployed berry', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Code
  // --------------------------------------------------------------------------

  describe('Code', () => {
    it.skip('assigns to code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('pass into code method', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if use undeployed berry', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Sync
  // --------------------------------------------------------------------------

  describe('Sync', () => {
    it.skip('no sync method', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may sync destroyed berry class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may sync authed berry class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('inner syncs berry classes', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('updates berry class when used in a transaction', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('berry location does not change with sync', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if inconsistent worldview', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('loads upgraded code dep with original', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('loads updated jig dep with original', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Instanceof
  // --------------------------------------------------------------------------

  describe('instanceof', () => {
    it.skip('returns true for Berry', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('returns true for berry class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('returns true for parent class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('returns false for another class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('returns true for local class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('berry class instanceof code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('cannot fake with setPrototypeOf', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('returns true for destroyed class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('returns true for authed class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('returns true in init', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Load
  // --------------------------------------------------------------------------

  describe('load', () => {
    it.skip('loads same berry class', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('loads different berry class', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('loads from cache if possible', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if invalid location', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if load times out', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('cannot catch load errors', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if call from inside berry', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if call from jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if call from code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may call from static code', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Protocols
  // --------------------------------------------------------------------------

  describe('Protocols', () => {
    it.skip('loads twetch post', () => {
      /*
      class TwetchPost extends Berry {
        init (text) {
          this.text = text
        }

        static async pluck (location, fetch, pluck) {
          const txo = await fetch(location)
          if (txo.out[0].s2 === '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut') { // B protocol
            return new TwetchPost(txo.out[0].s3)
          }
        }
      }
      const run = new Run({ network: 'main' })
      const txid = '4e146ac161324ef0b388798462867c29ad681ef4624ea4e3f7c775561af3ddd0'
      const post = await run.load(txid, TwetchPost)
      expect(post instanceof TwetchPost).to.equal(true)
      expect(post.text).to.equal('Came for the edgy marketing, stayed for truth & kindness')
      */
    })

    // ------------------------------------------------------------------------

    it.skip('loads metanet node', () => {
      /*
      class MetanetNode extends Berry {
        init (pnode, parent, data) {
          this.pnode = pnode
          this.parent = parent
          this.data = data
        }

        static async pluck (location, fetch, pluck) {
          const txo = await fetch(location)
          if (txo.out[0].s1 === 'meta') {
            const pnode = txo.out[0].s2
            const txidParent = txo.out[0].s3
            const data = txo.out[0].s4
            if (data === 'METANET_ROOT') {
              return new MetanetNode(pnode, null, data)
            } else {
              const parentNode = await pluck(txidParent)
              return new MetanetNode(pnode, parentNode, data)
            }
          }
        }
      }
      const run = new Run({ network: 'main' })
      const txid = '2f24d7edb8de0ef534d8e0bc2413eddda451b4accc481519a1647d7af79d8e88'
      const node = await run.load(txid, MetanetNode)
      expect(node.pnode).to.equal('1FqmFgY45CqSGXRNVpHNRQWqoNVCkRpUau')
      expect(node.parent instanceof MetanetNode).to.equal(true)
      expect(!!node.data).to.equal(true)
      */
    })

    // ------------------------------------------------------------------------

    it.skip('loads slp token', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
