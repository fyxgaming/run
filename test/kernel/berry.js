/**
 * berry.js
 *
 * Tests for lib/kernel/berry.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { stub } = require('sinon')
const Run = require('../env/run')
const { expectTx } = require('../env/misc')
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
      class B extends Berry { }
      const b = await run.load('abc', { berry: B })
      expect(b instanceof B).to.equal(true)
      expect(() => b.location).to.throw()
    })

    // ------------------------------------------------------------------------

    it('deploying berry remains undeployed', async () => {
      const run = new Run()
      class B extends Berry { }
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
      class C extends B { }
      const c = await run.load('', { berry: C })
      expect(c instanceof C).to.equal(true)
    })
    // ------------------------------------------------------------------------

    it('may inherit parent pluck method', async () => {
      const run = new Run()
      class B extends Berry { }
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

    // ------------------------------------------------------------------------

    it('pluck method not required', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await run.sync()
      const b = await run.load('abc', { berry: B })
      const c = await run.load('123', { berry: B })
      expect(b.location).to.equal(CB.location + '_abc')
      expect(c.location).to.equal(CB.location + '_123')
    })

    // ------------------------------------------------------------------------

    it('may pluck with destroyed berry class', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      CB.destroy()
      await CB.sync()
      const b = await run.load('abc', { berry: CB })
      expect(b.location).to.equal(CB.location + '_' + 'abc')
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
      class B extends Berry { init () { this.x = new WeakMap() } }
      class C extends Berry { init () { this.x = function f () { } } }
      const error = 'Not serializable'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
      await expect(run.load('', { berry: C })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('set non-location bindings', async () => {
      const run = new Run()
      class B extends Berry {
        init () {
          this.origin = '123'
          this.satoshis = -1
          this.owner = {}
          this.nonce = this
        }
      }
      run.deploy(B)
      await run.sync()
      const location = B.location + '_abc'

      function test (b) {
        expect(b.origin).to.equal('123')
        expect(b.satoshis).to.equal(-1)
        expect(b.owner).to.deep.equal({})
        expect(b.nonce).to.equal(b)
      }

      const b = await run.load('abc', { berry: B })
      test(b)

      const b2 = await run.load(location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('throws if set location', async () => {
      const run = new Run()
      class B extends Berry { init () { this.location = '123' } }
      const error = 'Cannot set location'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if set init', async () => {
      const run = new Run()
      class B extends Berry { init () { this.init = 1 } }
      const error = 'Cannot set init'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if delete init', async () => {
      const run = new Run()
      class B extends Berry { init () { delete this.init } }
      const error = 'Cannot delete init'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if define location', async () => {
      const run = new Run()
      class B extends Berry {
        init () {
          const desc = { configurable: true, enumerable: true, writable: true, value: 'abc' }
          Object.defineProperty(this, 'location', desc)
        }
      }
      const error = 'Cannot set location'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if set prototype', async () => {
      const run = new Run()
      class B extends Berry { init () { Object.setPrototypeOf(this, {}) } }
      const error = 'setPrototypeOf disabled'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if created by user', () => {
      new Run() // eslint-disable-line
      class B extends Berry { }
      const error = 'Must only create berry from its berry class'
      expect(() => new B()).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if created by non-pluck static method', () => {
      new Run() // eslint-disable-line
      class B extends Berry { static f () { return new B() } }
      const error = 'Must only create berry from its berry class'
      expect(() => B.f()).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if create in a different plucker', async () => {
      const run = new Run()
      class B extends Berry { }
      class C extends Berry { static async pluck () { return new B() } }
      C.deps = { B }
      const error = 'Must only create berry from its berry class'
      await expect(run.load('', { berry: C })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if return value', async () => {
      const run = new Run()
      class B extends Berry { init () { return 1 } }
      class C extends Berry { init () { return this } }
      const error = 'init must not return a value'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
      await expect(run.load('', { berry: C })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if async', async () => {
      const run = new Run()
      class B extends Berry { async init () { } }
      const error = 'init must not return a value'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('cannot swallow init errors', async () => {
      const run = new Run()

      class B extends Berry {
        init () {
          try { this.location = '123' } catch (e) { }
        }
      }
      const error = 'Cannot set location'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)

      class C extends Berry {
        init () {
          try { this.f() } catch (e) { }
        }

        f () { throw new Error('abc') }
      }
      await expect(run.load('', { berry: C })).to.be.rejectedWith('abc')
    })

    // ------------------------------------------------------------------------

    it('runs in sandbox', async () => {
      const run = new Run()
      const n = 1
      class B extends Berry {
        init () {
          this.a = typeof global
          this.b = typeof window
          this.c = typeof n
        }
      }
      const b = await run.load('', { berry: B })
      expect(b.a).to.equal('undefined')
      expect(b.b).to.equal('undefined')
      expect(b.c).to.equal('undefined')
    })
  })

  // --------------------------------------------------------------------------
  // fetch
  // --------------------------------------------------------------------------

  describe('fetch', () => {
    it('fetches raw transaction', async () => {
      const run = new Run()
      class B extends Berry {
        init (rawtx) { this.rawtx = rawtx }
        static async pluck (path, fetch) {
          const rawtx = await fetch(path)
          return new B(rawtx)
        }
      }
      const CB = run.deploy(B)
      await CB.sync()
      const txid = CB.location.slice(0, 64)
      const rawtx = await run.blockchain.fetch(txid)
      const b = await run.load(txid, { berry: CB })
      expect(b.rawtx).to.equal(rawtx)
    })

    // ------------------------------------------------------------------------

    it('immutable', async () => {
      const run = new Run()
      class B extends Berry {
        static async pluck (path, fetch) {
          fetch.n = 1
        }
      }
      await expect(run.load('', { berry: B })).to.be.rejected
    })

    // ------------------------------------------------------------------------

    it('sandboxed', async () => {
      const run = new Run()
      class B extends Berry {
        init (b) { this.b = b }
        static async pluck (path, fetch) {
          return new B(fetch instanceof Function)
        }
      }
      const b = await run.load('', { berry: B })
      expect(b.b).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('fetch multiple', async () => {
      const run = new Run()
      const txidA = (await run.deploy(class A { }).sync()).location.slice(0, 64)
      const txidB = (await run.deploy(class B { }).sync()).location.slice(0, 64)
      class B extends Berry {
        init (a, b) { this.a = a; this.b = b }
        static async pluck (path, fetch) {
          const a = await fetch(path.split(',')[0])
          const b = await fetch(path.split(',')[1])
          return new B(a, b)
        }
      }
      await run.deploy(B).sync()
      const b = await run.load(txidA + ',' + txidB, { berry: B })
      const txA = await run.blockchain.fetch(txidA)
      const txB = await run.blockchain.fetch(txidB)
      expect(b.a).to.equal(txA)
      expect(b.b).to.equal(txB)
      expect(b.a).not.to.equal(b.b)
    })

    // ------------------------------------------------------------------------

    it('call from internal helper', async () => {
      const run = new Run()
      class B extends Berry {
        init (rawtx) { this.rawtx = rawtx }
        static async pluck (path, fetch) {
          const rawtx = await this.f(path, fetch)
          return new B(rawtx)
        }

        static f (path, fetch) {
          return fetch(path)
        }
      }
      const CB = run.deploy(B)
      await CB.sync()
      const txid = CB.location.slice(0, 64)
      const rawtx = await run.blockchain.fetch(txid)
      const b = await run.load(txid, { berry: CB })
      expect(b.rawtx).to.equal(rawtx)
    })

    // ------------------------------------------------------------------------

    it('call from external helper', async () => {
      const run = new Run()
      function f (path, fetch) {
        return fetch(path)
      }
      class B extends Berry {
        init (rawtx) { this.rawtx = rawtx }
        static async pluck (path, fetch) {
          const rawtx = await f(path, fetch)
          return new B(rawtx)
        }
      }
      B.deps = { f }
      const CB = run.deploy(B)
      await CB.sync()
      const txid = CB.location.slice(0, 64)
      const rawtx = await run.blockchain.fetch(txid)
      const b = await run.load(txid, { berry: CB })
      expect(b.rawtx).to.equal(rawtx)
    })

    // ------------------------------------------------------------------------

    it('throws if not a transaction', async () => {
      const run = new Run()
      class B extends Berry {
        static async pluck (path, fetch) {
          await fetch('123')
          return new B()
        }
      }
      const error = 'No such mempool or blockchain transaction: 123'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if blockchain timeout', async () => {
      const run = new Run()
      stub(run.blockchain, 'fetch').throws(new Run.errors.TimeoutError())
      class B extends Berry {
        init (rawtx) { this.rawtx = rawtx }
        static async pluck (path, fetch) {
          const rawtx = await fetch(path)
          return new B(rawtx)
        }
      }
      await expect(run.load('', { berry: B })).to.be.rejectedWith(Run.errors.TimeoutError)
    })

    // ------------------------------------------------------------------------

    it('cannot swallow fetch errors', async () => {
      const run = new Run()
      class B extends Berry {
        static async pluck (path, fetch) {
          try { await fetch('123') } catch (e) { }
          return new B()
        }
      }
      const error = 'No such mempool or blockchain transaction: 123'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
    })
  })

  // --------------------------------------------------------------------------
  // Method
  // --------------------------------------------------------------------------

  describe('Method', () => {
    it('get', async () => {
      const run = new Run()
      class B extends Berry {
        init () { this.n = 1 }
        f () { return this.n }
      }
      run.deploy(B)
      await run.sync()
      const location = B.location + '_'
      function test (b) { expect(b.f()).to.equal(1) }
      const b = await run.load('', { berry: B })
      test(b)
      const b2 = await run.load(location)
      test(b2)
      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('get non-location bindings', async () => {
      const run = new Run()
      class B extends Berry {
        init () {
          this.origin = 1
          this.nonce = 2
          this.owner = 3
          this.satoshis = 4
        }

        f () { return [this.origin, this.nonce, this.owner, this.satoshis] }
      }
      run.deploy(B)
      await run.sync()
      const location = B.location + '_'
      function test (b) { expect(b.f()).to.deep.equal([1, 2, 3, 4]) }
      const b = await run.load('', { berry: B })
      test(b)
      const b2 = await run.load(location)
      test(b2)
      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('getOwnPropertyDescriptor', async () => {
      const run = new Run()
      class B extends Berry {
        init () { this.o = [] }
        f () { return Object.getOwnPropertyDescriptor(this, 'o') }
      }
      run.deploy(B)
      await run.sync()
      const location = B.location + '_'
      function test (b) {
        const desc = { configurable: true, enumerable: true, writable: true, value: b.o }
        expect(b.f()).to.deep.equal(desc)
      }
      const b = await run.load('', { berry: B })
      test(b)
      const b2 = await run.load(location)
      test(b2)
      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('throws if set', async () => {
      const run = new Run()
      class B extends Berry { f () { this.n = 1 } }
      run.deploy(B)
      await run.sync()
      const location = B.location + '_'
      function test (b) { expect(() => b.f()).to.throw('set disabled') }
      const b = await run.load('', { berry: B })
      test(b)
      const b2 = await run.load(location)
      test(b2)
      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('throws if define', async () => {
      const run = new Run()
      class B extends Berry {
        init () { this.a = [] }
        f () {
          const desc = { configurable: true, enumerable: true, writable: true, value: new Map() }
          Object.defineProperty(this.a, '0', desc)
        }
      }
      run.deploy(B)
      await run.sync()
      const location = B.location + '_'
      function test (b) { expect(() => b.f()).to.throw('defineProperty disabled') }
      const b = await run.load('', { berry: B })
      test(b)
      const b2 = await run.load(location)
      test(b2)
      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('throws if delete', async () => {
      const run = new Run()
      class B extends Berry {
        init () { this.a = [1, 2, 3] }
        f () { delete this.a[0] }
      }
      run.deploy(B)
      await run.sync()
      const location = B.location + '_'
      function test (b) { expect(() => b.f()).to.throw('delete disabled') }
      const b = await run.load('', { berry: B })
      test(b)
      const b2 = await run.load(location)
      test(b2)
      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('throws if set prototype', async () => {
      const run = new Run()
      class B extends Berry { f () { Object.setPrototypeOf(this, B) } }
      run.deploy(B)
      await run.sync()
      const location = B.location + '_'
      function test (b) { expect(() => b.f()).to.throw('setPrototypeOf disabled') }
      const b = await run.load('', { berry: B })
      test(b)
      const b2 = await run.load(location)
      test(b2)
      run.cache = new LocalCache()
      const b3 = await run.load(location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('method call reads berry class', async () => {
      const run = new Run()
      class B extends Berry { f () { return 1 } }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await run.load('abc', { berry: B })
      class A extends Jig { f (b) { this.n = b.f() } }
      const a = new A()
      await run.sync()

      expectTx({
        nin: 1,
        nref: 3,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [
              { $jig: 0 },
              'f',
              [{ $jig: 1 }]
            ]
          }
        ]
      })

      a.f(b)
      expect(a.n).to.equal(1)
      await a.sync()

      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(1)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      expect(a3.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('method calls that read dep reads dep', async () => {
      const run = new Run()
      function g () { return 1 }
      const cg = run.deploy(g)
      class B extends Berry { f () { return g() } }
      B.deps = { g: cg }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await run.load('abc', { berry: B })
      class A extends Jig { f (b) { this.n = b.f() } }
      const a = new A()
      await run.sync()

      expectTx({
        nin: 1,
        nref: 4,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [
              { $jig: 0 },
              'f',
              [{ $jig: 1 }]
            ]
          }
        ]
      })

      a.f(b)
      await a.sync()
      expect(a.n).to.equal(1)

      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(1)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      expect(a3.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('unify with args', async () => {
      const run = new Run()
      class B extends Berry { f () { return B.nonce } }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await run.load('abc', { berry: CB })
      expect(b.f()).to.equal(1)
      const CB2 = await run.load(CB.location)
      CB2.auth()
      await CB2.sync()
      class A extends Jig { init (b, CB2) { this.n = b.f() } }
      const a = new A(b, CB2)
      expect(a.n).to.equal(2)
      await a.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      expect(a3.n).to.equal(2)
    })
  })

  // --------------------------------------------------------------------------
  // Jig
  // --------------------------------------------------------------------------

  describe('Jig', () => {
    it('pass into jig method', async () => {
      const run = new Run()
      class B extends Berry { init () { this.n = 1 } }
      run.deploy(B)
      await run.sync()
      const b = await run.load('abc', { berry: B })

      function test (a) {
        expect(a.b instanceof B).to.equal(true)
        expect(a.b.n).to.equal(1)
      }

      class A extends Jig { f (b) { this.b = b } }
      const a = new A()
      await a.sync()

      expectTx({
        nin: 1,
        nref: 2,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [
              { $jig: 0 },
              'f',
              [{ $jig: 1 }]
            ]
          }
        ]
      })

      a.f(b)
      await a.sync()
      test(a)

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('throws if pass undeployed berry', async () => {
      const run = new Run()
      class B extends Berry { }
      const b = await run.load('', { berry: B })
      class A extends Jig { init (b) { this.b = b } }
      const a = new A(b)
      await expect(a.sync()).to.be.rejectedWith('Bad location')
    })

    // ------------------------------------------------------------------------

    it('throws if create jig in init', async () => {
      const run = new Run()
      class A extends Jig { }
      class B extends Berry { init () { this.b = new A() } }
      B.deps = { A }
      const error = 'Cannot create A in berry'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if create jig in inner method of init', async () => {
      const run = new Run()
      class A extends Jig { }
      class B extends Berry {
        init () { this.f() }
        f () { this.b = new A() }
      }
      B.deps = { A }
      const error = 'Cannot create A in berry'
      await expect(run.load('', { berry: B })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('may create jig in berry method', async () => {
      // Berries are sidekick code
      const run = new Run()
      class A extends Jig { }
      class B extends Berry { f () { return new A() } }
      B.deps = { A }
      const b = await run.load('', { berry: B })
      expect(b.f() instanceof A).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('may update jig in berry method', async () => {
      // Berries are sidekick code
      const run = new Run()
      class A extends Jig { g () { this.n = 1 } }
      class B extends Berry { f (a) { a.g() } }
      const a = new A()
      await a.sync()
      const b = await run.load('', { berry: B })

      expectTx({
        nin: 1,
        nref: 1,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [
              { $jig: 0 },
              'g',
              []
            ]
          }
        ]
      })

      b.f(a)
      expect(a.n).to.equal(1)
      await a.sync()
    })
  })

  // --------------------------------------------------------------------------
  // Code
  // --------------------------------------------------------------------------

  describe('Code', () => {
    it('assigns to code', async () => {
      const run = new Run()
      class B extends Berry { init () { this.n = 1 } }
      run.deploy(B)
      await run.sync()
      const b = await run.load('abc', { berry: B })

      function test (CA) {
        expect(CA.b instanceof B).to.equal(true)
        expect(CA.b.n).to.equal(1)
      }

      class A { }
      A.b = b

      expectTx({
        nin: 0,
        nref: 1,
        nout: 1,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              A.toString(),
              {
                deps: { },
                b: { $jig: 0 }
              }
            ]
          }
        ]
      })

      const CA = run.deploy(A)
      await CA.sync()
      test(CA)

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('pass into code method', async () => {
      const run = new Run()
      class B extends Berry { init () { this.n = 1 } }
      run.deploy(B)
      await run.sync()
      const b = await run.load('abc', { berry: B })

      function test (CA) {
        expect(CA.b instanceof B).to.equal(true)
        expect(CA.b.n).to.equal(1)
      }

      class A extends Jig { static f (b) { this.b = b } }
      const CA = run.deploy(A)
      await CA.sync()

      expectTx({
        nin: 1,
        nref: 1,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [
              { $jig: 0 },
              'f',
              [{ $jig: 1 }]
            ]
          }
        ]
      })

      CA.f(b)
      await CA.sync()
      test(CA)

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('throws if use undeployed berry', async () => {
      const run = new Run()
      class B extends Berry { }
      const b = await run.load('', { berry: B })
      class A { }
      A.b = b
      const CA = run.deploy(A)
      await expect(CA.sync()).to.be.rejectedWith('Bad location')
    })

    // ------------------------------------------------------------------------

    it('may auth code in berry method', async () => {
      const run = new Run()
      class B extends Berry { f (CA) { CA.auth() } }
      run.deploy(B)
      await run.sync()
      const b = await run.load('abc', { berry: B })
      const CA = run.deploy(class A { })
      await CA.sync()

      expectTx({
        nin: 1,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'AUTH',
            data: { $jig: 0 }
          }
        ]
      })

      b.f(CA)
      await CA.sync()
    })
  })

  // --------------------------------------------------------------------------
  // Sync
  // --------------------------------------------------------------------------

  describe('Sync', () => {
    it('no sync method', async () => {
      const run = new Run()
      class B extends Berry { }
      const b = await run.load('abc', { berry: B })
      expect(typeof b.sync).to.equal('undefined')
    })

    // ------------------------------------------------------------------------

    it('may sync destroyed berry class', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      CB.destroy()
      await CB.sync()
      await CB.sync()
      const b = await run.load('abc', { berry: CB })
      expect(b.location).to.equal(CB.location + '_abc')
    })

    // ------------------------------------------------------------------------

    it('may sync authed berry class', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      CB.auth()
      await CB.sync()
      await CB.sync()
      const b = await run.load('abc', { berry: CB })
      expect(b.location).to.equal(CB.location + '_abc')
    })

    // ------------------------------------------------------------------------

    it('inner syncs berry classes in jigs', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await run.load('abc', { berry: CB })

      class A extends Jig { init (b) { this.b = b } }
      const a = new A(b)
      await a.sync()

      CB.destroy()
      await CB.sync()

      const a2 = await run.load(a.location)
      expect(a2.b.constructor.location).to.equal(CB.origin)
      await a2.sync()
      expect(a2.b.constructor.location).to.equal(CB.location)
    })

    // ------------------------------------------------------------------------

    it('updates berry class when used in a transaction', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await run.load('abc', { berry: CB })

      class A extends Jig {
        init (b) { this.b = b }
        f () { this.Blocation = this.b.constructor.location }
      }
      const a = new A(b)
      await a.sync()

      CB.destroy()
      await CB.sync()

      const a2 = await run.load(a.location)
      await a2.sync()
      expect(a2.b.constructor.location).to.equal(CB.location)
      a2.f()
      await a2.sync()

      const a3 = await run.load(a2.location)
      expect(a3.Blocation).to.equal(CB.location)
      expect(a3.b.constructor.location).to.equal(CB.origin)

      run.cache = new LocalCache()
      const a4 = await run.load(a2.location)
      expect(a4.Blocation).to.equal(CB.location)
      expect(a4.b.constructor.location).to.equal(CB.origin)
    })

    // ------------------------------------------------------------------------

    it('berry location does not change with sync', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await run.load('abc', { berry: CB })
      const bLocation = b.location
      CB.destroy()
      await CB.sync()
      await b.constructor.sync()
      expect(b.constructor.nonce).to.equal(2)
      expect(b.location).to.equal(bLocation)
    })
  })

  // --------------------------------------------------------------------------
  // Instanceof
  // --------------------------------------------------------------------------

  describe('instanceof', () => {
    it('returns true for Berry', async () => {
      const run = new Run()
      class B extends Berry { }
      const b = await run.load('abc', { berry: B })
      expect(b instanceof Berry).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns true for berry class', async () => {
      const run = new Run()
      class B extends Berry { }
      const b = await run.load('abc', { berry: B })
      expect(b instanceof B).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns true for parent class', async () => {
      const run = new Run()
      class B extends Berry { }
      class C extends B { }
      const b = await run.load('abc', { berry: C })
      expect(b instanceof C).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns false for another class', async () => {
      const run = new Run()
      class B extends Berry { }
      class C extends B { }
      const b = await run.load('abc', { berry: B })
      expect(b instanceof C).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns true for local class', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await run.load('abc', { berry: CB })
      expect(b instanceof B).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('berry class instanceof code', () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      expect(B instanceof Run.Code).to.equal(false)
      expect(CB instanceof Run.Code).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('cannot fake with setPrototypeOf', () => {
      new Run() // eslint-disable-line
      const b = { }
      class B extends Berry { }
      Object.setPrototypeOf(b, B.prototype)
      expect(b instanceof Berry).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns true for destroyed class', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await run.load('abc', { berry: B })
      CB.destroy()
      expect(b instanceof CB).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns true for authed class', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await run.load('abc', { berry: B })
      CB.auth()
      await CB.sync()
      expect(b instanceof CB).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns true in pluck', async () => {
      const run = new Run()
      class B extends Berry {
        static async pluck () {
          const b = new B()
          if (!(b instanceof Berry)) throw new Error()
          return b
        }
      }
      await run.load('abc', { berry: B })
    })

    // ------------------------------------------------------------------------

    it('returns true in init', async () => {
      const run = new Run()
      class B extends Berry {
        init () {
          if (!(this instanceof Berry)) throw new Error()
        }
      }
      await run.load('abc', { berry: B })
    })
  })

  // --------------------------------------------------------------------------
  // Load
  // --------------------------------------------------------------------------

  describe('load', () => {
    it('load general berry', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await Berry.load(`${CB.location}_abc`)
      expect(b.location).to.equal(`${CB.location}_abc`)
      expect(b instanceof CB).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('loads specific berry with path', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await CB.load('abc')
      expect(b.location).to.equal(`${CB.location}_abc`)
      expect(b instanceof B).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('loads specific berry from local', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await B.load('abc')
      expect(b.location).to.equal(`${CB.location}_abc`)
      expect(b instanceof B).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('can load with undeployed berry class', async () => {
      new Run() // eslint-disable-line
      class B extends Berry { }
      const b = await B.load('abc')
      expect(b instanceof B).to.equal(true)
      expect(() => b.location).to.throw('Cannot read location')
    })

    // ------------------------------------------------------------------------

    it('can load with local berry class', async () => {
      const run = new Run()
      class B extends Berry { }
      run.deploy(B)
      await run.sync()
      const b = await B.load('abc')
      expect(b instanceof B).to.equal(true)
      expect(b.location).to.equal(`${B.location}_abc`)
    })

    // ------------------------------------------------------------------------

    it('load same berry class in pluck', async () => {
      const run = new Run()
      class B extends Berry {
        static async pluck (path) {
          const c = path.length ? await B.load('') : null
          return new B(c)
        }

        init (c) { this.c = c }
      }
      const CB = run.deploy(B)
      await run.sync()
      const b = await B.load('abc')

      expect(b instanceof B).to.equal(true)
      expect(b.c instanceof B).to.equal(true)
      expect(b.c.c).to.equal(null)
      expect(b.location).to.equal(`${CB.location}_abc`)
      expect(b.c.location).to.equal(`${CB.location}_`)
    })

    // ------------------------------------------------------------------------

    it('load different berry class in pluck', async () => {
      const run = new Run()
      class A extends Berry { }
      run.deploy(A)
      class B extends Berry {
        static async pluck () { return new B(await A.load('a')) }
        init (a) { this.a = a }
      }
      B.deps = { A }
      run.deploy(B)
      await run.sync()
      const b = await B.load('abc')
      expect(b instanceof B).to.equal(true)
      expect(b.a instanceof A).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('recursively load jigs in pluck', async () => {
      new Run() // eslint-disable-line
      class B extends Berry {
        static async pluck (path) {
          const n = parseInt(path)
          const b = n ? await B.load((n - 1).toString()) : null
          return new B(b, n)
        }

        init (b, n) { this.b = b; this.n = n }
      }
      const b = await B.load('2')
      expect(b.n).to.equal(2)
      expect(b.b.n).to.equal(1)
      expect(b.b.b.n).to.equal(0)
      expect(b instanceof B).to.equal(true)
      expect(b.b instanceof B).to.equal(true)
      expect(b.b.b instanceof B).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('cannot swallow berry load failures', async () => {
      new Run() // eslint-disable-line
      class B extends Berry {
        static async pluck (path) {
          try {
            if (path === 'outer') await B.load('inner')
          } catch (e) { /* illegal swallow */ }
          if (path === 'inner') throw new Error('inner error')
          return new B()
        }
      }
      await expect(B.load('outer')).to.be.rejectedWith('inner error')
    })

    // ------------------------------------------------------------------------

    it('cannot swallow jig load failures', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      class B extends Berry {
        static async pluck (path) {
          try {
            await A.load('abc')
          } catch (e) { /* illegal swallow */ }
          return new B()
        }
      }
      B.deps = { A }
      await expect(B.load('')).to.be.rejectedWith('Bad location')
    })

    // ------------------------------------------------------------------------

    it('may be loaded from sidekick code', async () => {
      const run = new Run()
      class B extends Berry { }
      class A { static f (path) { return B.load(path) } }
      A.deps = { B }
      const CB = run.deploy(B)
      await CB.sync()
      const CA = Run.install(A)
      const b = await CA.f('abc')
      expect(b.location).to.equal(`${CB.location}_abc`)
      expect(b instanceof B).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('throws if load non-berry jig', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      await a.sync()
      await expect(Berry.load(a.location)).to.be.rejectedWith('[jig A] not an instance of Berry')
    })

    // ------------------------------------------------------------------------

    it('throws if invalid location', async () => {
      new Run() // eslint-disable-line
      await expect(Berry.load(false)).to.be.rejectedWith('Location is not a string')
      await expect(Berry.load('abc_')).to.be.rejectedWith('Bad location')
      await expect(Berry.load()).to.be.rejectedWith('Location is not a string')
    })

    // ------------------------------------------------------------------------

    it('throws if invalid path', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      await expect(CB.load(false)).to.be.rejectedWith('Berry path must be a string')
      await expect(CB.load()).to.be.rejectedWith('Berry path must be a string')
    })

    // ------------------------------------------------------------------------

    it('throws if load times out', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      const sleep = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))
      stub(run.cache, 'get').callsFake(() => sleep(10))
      run.timeout = 1
      await expect(CB.load('abc')).to.be.rejectedWith('load timeout')
    })

    // ------------------------------------------------------------------------

    it('cannot swallow load errors', async () => {
      const run = new Run()
      class B extends Berry {
        init () { try { this.f() } catch (e) { } }
        f () { throw new Error() }
      }
      const CB = run.deploy(B)
      await CB.sync()
      await expect(CB.load('abc')).to.be.rejected
    })

    // ------------------------------------------------------------------------

    it('throws if call from inside berry init', async () => {
      const run = new Run()
      class B extends Berry {
        init () { B.load('abc') }
      }
      const CB = run.deploy(B)
      await CB.sync()
      const error = 'load cannot be called internally'
      await expect(CB.load('abc')).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if call from jig', async () => {
      const run = new Run()
      class B extends Berry { }
      class A extends Jig {
        f () { B.load('abc') }
      }
      A.deps = { B }
      const CB = run.deploy(B)
      await CB.sync()
      const a = new A()
      const error = 'load cannot be called internally'
      expect(() => a.f()).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if call from code', async () => {
      const run = new Run()
      class B extends Berry { }
      class A extends Jig {
        static f () { B.load('abc') }
      }
      A.deps = { B }
      const CB = run.deploy(B)
      await CB.sync()
      const CA = run.deploy(A)
      await CA.sync()
      const error = 'load cannot be called internally'
      expect(() => CA.f()).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if called on non-berry class', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      class A { }
      expect(() => CB.load.apply(A)).to.throw('load unavailable')
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
