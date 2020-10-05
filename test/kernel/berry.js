/**
 * berry.js
 *
 * Tests for lib/kernel/berry.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { Berry, Jig, LocalCache } = Run

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

      function test (b) {
        expect(b instanceof B).to.equal(true)
        expect(b.location).to.equal(location)
      }

      const b = await run.load('abc', { berry: CB })
      const location = CB.location + '_abc'
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

      function test (c, d) {
        expect(c instanceof C).to.equal(true)
        expect(d instanceof D).to.equal(true)
      }

      const c = await run.load('', { berry: C })
      const d = await run.load('', { berry: D })
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

    it('berry with deps', async () => {
      const run = new Run()

      function f () { return 1 }

      class B extends Berry {
        init (n) { this.n = n }
        static async pluck () { return new B(f()) }
      }
      B.deps = { f }

      run.deploy(B)
      await run.sync()

      function test (b) {
        expect(b.location).to.equal(location)
        expect(b.n).to.equal(1)
      }

      const b = await run.load('123', { berry: B })
      const location = b.constructor.location + '_123'
      test(b)

      const b2 = await run.load(location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('immutable externally', async () => {
      const run = new Run()

      class B extends Berry {
        init () {
          this.n = 1
          this.a = []
        }

        static async pluck () { return new B() }
      }

      run.deploy(B)
      await run.sync()

      function test (b) {
        expect(() => { b.n = 1 }).to.throw('set disabled')
        expect(() => { b.a.push(1) }).to.throw('set disabled')
      }

      const b = await run.load('123', { berry: B })
      const location = b.constructor.location + '_123'
      test(b)

      const b2 = await run.load(location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('immutable internally', async () => {
      const run = new Run()

      class B extends Berry {
        init () {
          this.n = 1
          this.o = {}
        }

        f () { delete this.n }
        g () { this.o.n = 1 }

        static async pluck () { return new B() }
      }

      run.deploy(B)
      await run.sync()

      function test (b) {
        expect(() => b.f()).to.throw('delete disabled')
        expect(() => b.g()).to.throw('set disabled')
      }

      const b = await run.load('123', { berry: B })
      const location = b.constructor.location + '_123'
      test(b)

      const b2 = await run.load(location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('multi-line paths', async () => {
      const run = new Run()

      class B extends Berry {
        init (s) { this.s = s }
        static async pluck (path) { return new B(path) }
      }

      run.deploy(B)
      await run.sync()

      const text = `Hello
      Line 2
      
Line 3`

      const location = B.location + '_' + text

      function test (b) {
        expect(b.s).to.equal(text)
        expect(b.location).to.equal(location)
      }

      const b = await run.load(text, { berry: B })
      test(b)

      const b2 = await run.load(location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('unicode paths', async () => {
      const run = new Run()

      class B extends Berry {
        init (s) { this.s = s }
        static async pluck (path) { return new B(path) }
      }

      run.deploy(B)
      await run.sync()

      const text = '😀'

      const location = B.location + '_' + text

      function test (b) {
        expect(b.s).to.equal(text)
        expect(b.location).to.equal(location)
      }

      const b = await run.load(text, { berry: B })
      test(b)

      const b2 = await run.load(location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('throws for invalid path', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { return new B() } }
      const error = 'Berry path must be a string'
      await expect(run.load(null, { berry: B })).to.be.rejectedWith(error)
      await expect(run.load(undefined, { berry: B })).to.be.rejectedWith(error)
      await expect(run.load({}, { berry: B })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if return unrelated object', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { return {} } }
      const error = 'Berry must be an instance of B'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if return unrelated berry', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { return new B() } }
      run.deploy(B)
      await run.sync()
      const b = await run.load('', { berry: B })
      class C extends Berry { static async pluck () { return C.b } }
      C.b = b
      const error = 'Berry must be an instance of C'
      await expect(run.load('', { berry: C })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if return parent class berry', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { return new B() } }
      run.deploy(B)
      await run.sync()
      const b = await run.load('', { berry: B })
      class C extends B { static async pluck () { return C.b } }
      C.b = b
      const error = 'Berry must be an instance of C'
      await expect(run.load('', { berry: C })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if return non-object', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { return null } }
      class C extends Berry { static async pluck () { return 'hello' } }
      const error = name => 'Berry must be an instance of ' + name
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error('B'))
      await expect(run.load('', { berry: C })).to.be.rejectedWith(error('C'))
    })

    // ------------------------------------------------------------------------

    it('throws if pluck Berry', async () => {
      const run = new Run()
      const error = 'Berry class must extend from Berry'
      await expect(run.load('', { berry: Berry })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if pluck non-berry', async () => {
      const run = new Run()
      const error = 'Berry class must extend from Berry'
      await expect(run.load('', { berry: class B { } })).to.be.rejectedWith(error)
      await expect(run.load('', { berry: class C extends Jig { } })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if pluck more than one', async () => {
      const run = new Run()
      class B extends Berry {
        static async pluck () {
          new B() // eslint-disable-line
          return new B()
        }
      }
      const error = 'Must only pluck one berry at a time'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if not async', async () => {
      const run = new Run()
      class B extends Berry {
        static pluck () {
          return new B()
        }
      }
      const error = 'pluck method must be async'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if init throws', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { throw new Error('abc') } }
      await expect(run.load('', { berry: B })).to.be.rejectedWith('abc')
    })

    // ------------------------------------------------------------------------

    it('throws if called by user', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { return new B() } }
      const CB = run.deploy(B)
      const error = 'Must only create berry from its berry class'
      await expect(CB.pluck()).to.be.rejectedWith(error)
    })
  })

  // --------------------------------------------------------------------------
  // init
  // --------------------------------------------------------------------------

  describe('init', () => {
    it('set properties', async () => {
      const run = new Run()

      class B extends Berry {
        init () {
          this.n = 1
          this.o = {}
          this.o.m = 2
          this.s = new Set([this])
        }

        static async pluck () { return new B() }
      }

      run.deploy(B)
      await run.sync()

      function test (b) {
        expect(b.n).to.equal(1)
        expect(typeof b.o).to.equal('object')
        expect(b.o.m).to.equal(2)
        expect(b.s.constructor.name).to.equal('Set')
        expect(Array.from(b.s)[0]).to.equal(b)
      }

      const b = await run.load('123', { berry: B })
      const location = b.constructor.location + '_123'
      test(b)

      const b2 = await run.load(location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('define properties', async () => {
      const run = new Run()

      class B extends Berry {
        init () {
          this.arr = []
          const desc1 = { configurable: true, enumerable: true, writable: true, value: 1 }
          const desc2 = { configurable: true, enumerable: true, writable: true, value: 2 }
          Object.defineProperty(this, 'n', desc1)
          Object.defineProperty(this.arr, '1', desc2)
        }

        static async pluck () { return new B() }
      }

      run.deploy(B)
      await run.sync()

      function test (b) {
        expect(b.n).to.equal(1)
        expect(b.arr[1]).to.equal(2)
      }

      const b = await run.load('123', { berry: B })
      const location = b.constructor.location + '_123'
      test(b)

      const b2 = await run.load(location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('delete properties', async () => {
      const run = new Run()

      class B extends Berry {
        init () {
          this.n = 1
          delete this.n
          this.o = {}
          this.o.m = 2
          delete this.o.m
        }

        static async pluck () { return new B() }
      }

      run.deploy(B)
      await run.sync()

      function test (b) {
        expect(typeof b.n).to.equal('undefined')
        expect(typeof b.o.m).to.equal('undefined')
      }

      const b = await run.load('123', { berry: B })
      const location = b.constructor.location + '_123'
      test(b)

      const b2 = await run.load(location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('get own properties in deterministic order', async () => {
      const run = new Run()

      class B extends Berry {
        init () {
          this.n = 1
          this.m = new Map()
          this.p = Object.getOwnPropertyNames(this)
        }

        static async pluck () { return new B() }
      }

      run.deploy(B)
      await run.sync()

      function test (b) {
        expect(Object.getOwnPropertyNames(b)).to.deep.equal(['location', 'm', 'n', 'p'])
        expect(b.p).to.deep.equal(['location', 'm', 'n'])
      }

      const b = await run.load('123', { berry: B })
      const location = b.constructor.location + '_123'
      test(b)

      const b2 = await run.load(location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('calls method that sets properties', async () => {
      const run = new Run()

      class B extends Berry {
        init () {
          this.m = new Map()
          this.f()
        }

        f () {
          this.n = 1
          this.m.set(2, 3)
        }

        static async pluck () { return new B() }
      }

      run.deploy(B)
      await run.sync()

      function test (b) {
        expect(b.n).to.equal(1)
        expect(b.m.get(2)).to.equal(3)
      }

      const b = await run.load('123', { berry: B })
      const location = b.constructor.location + '_123'
      test(b)

      const b2 = await run.load(location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('calls method that defines properties', async () => {
      const run = new Run()

      class B extends Berry {
        init () {
          this.f()
        }

        f () {
          const desc = { configurable: true, enumerable: true, writable: true, value: 1 }
          Reflect.defineProperty(this, 'n', desc)
          this.o = this.g({})
        }

        g (o) {
          const desc = { configurable: true, enumerable: true, writable: true, value: 2 }
          Reflect.defineProperty(o, 'm', desc)
          return o
        }

        static async pluck () { return new B() }
      }

      run.deploy(B)
      await run.sync()

      function test (b) {
        expect(b.n).to.equal(1)
        expect(b.o.m).to.equal(2)
      }

      const b = await run.load('123', { berry: B })
      const location = b.constructor.location + '_123'
      test(b)

      const b2 = await run.load(location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('calls method that deletes properties', async () => {
      const run = new Run()

      class B extends Berry {
        init () {
          this.m = 1
          this.f()
        }

        f () {
          delete this.m
        }

        static async pluck () { return new B() }
      }

      run.deploy(B)
      await run.sync()

      function test (b) {
        expect(typeof b.m).to.equal('undefined')
      }

      const b = await run.load('123', { berry: B })
      const location = b.constructor.location + '_123'
      test(b)

      const b2 = await run.load(location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('throws if set unserializable properties', async () => {
      const run = new Run()
      class B extends Berry {
        init () { this.x = new WeakMap() }
        static async pluck () { return new B() }
      }
      class C extends Berry {
        init () { this.x = function f () { } }
        static async pluck () { return new C() }
      }
      const error = 'Not serializable'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
      await expect(run.load('', { berry: C })).to.be.rejectedWith(error)
    })

    // TODO: Pluck not required

    // ------------------------------------------------------------------------

    it.skip('throws if delete init', () => {
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

    it.skip('throws if set init', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set load', () => {
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

    // ------------------------------------------------------------------------

    it.skip('throws if create jig in init', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if create jig in inner method of init', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if create jig in berry method', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if update jig in berry method', () => {
      // TODO - init, inner init, other method
    })

    // ------------------------------------------------------------------------

    it.skip('throws if auth jig in berry method', () => {
      // TODO - init, inner init, other method
    })

    // ------------------------------------------------------------------------

    it.skip('throws if destroy jig in berry method', () => {
      // TODO - init, inner init, other method
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

    // ------------------------------------------------------------------------

    it.skip('throws if update code in berry method', () => {
      // TODO - init, inner init, other method
    })

    // ------------------------------------------------------------------------

    it.skip('throws if auth code in berry method', () => {
      // TODO - init, inner init, other method
    })

    // ------------------------------------------------------------------------

    it.skip('throws if destroy code in berry method', () => {
      // TODO - init, inner init, other method
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
