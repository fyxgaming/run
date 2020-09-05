/**
 * jig.js
 *
 * Tests for lib/kernel/jig.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { stub } = require('sinon')
const Run = require('../env/run')
const { expectTx } = require('../env/misc')
const { Jig, LocalCache } = Run
const unmangle = require('../env/unmangle')
const PrivateKey = require('bsv/lib/privatekey')
const SI = unmangle(Run.sandbox)._intrinsics

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

describe('Jig', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('basic jig', async () => {
      const run = new Run()
      class A extends Jig { }

      expectTx({
        nin: 0,
        nref: 1,
        nout: 2,
        ndel: 0,
        ncre: 2,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class A extends Jig { }',
              { deps: { Jig: { $jig: 0 } } }
            ]
          },
          {
            op: 'NEW',
            data: [{ $jig: 1 }, []]
          }
        ]
      })

      function test (a) {
        expect(a instanceof Jig).to.equal(true)
        expect(a.origin.length).to.equal(67)
      }

      const a = new A()
      await a.sync()
      test(a)

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('calls init method with constructor args', async () => {
      const run = new Run()
      class A extends Jig { init (a, b) { this.a = a; this.b = b } }

      expectTx({
        nin: 0,
        nref: 1,
        nout: 2,
        ndel: 0,
        ncre: 2,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              A.toString(),
              { deps: { Jig: { $jig: 0 } } }
            ]
          },
          {
            op: 'NEW',
            data: [{ $jig: 1 }, [1, 'z']]
          }
        ]
      })

      function test (a) {
        expect(a.a).to.equal(1)
        expect(a.b).to.equal('z')
      }

      const a = new A(1, 'z')
      test(a)
      await a.sync()

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('should throw if not extended', () => {
      new Run() // eslint-disable-line
      expect(() => new Jig()).to.throw('Jig must be extended')
    })

    // ------------------------------------------------------------------------

    it('throws if constructor exists', () => {
      new Run() // eslint-disable-line
      class A extends Jig { constructor () { super(); this.n = 1 } }
      expect(() => new A()).to.throw('Jig must use init() instead of constructor()')
    })
  })

  // --------------------------------------------------------------------------
  // init
  // --------------------------------------------------------------------------

  describe('init', () => {
    it('should throw if called by user', () => {
      new Run() // eslint-disable-line
      class A extends Jig { init (n) { this.n = n } }
      const a = new A(5)
      expect(() => a.init(6)).to.throw('init disabled')
    })

    // ------------------------------------------------------------------------

    it('should throw if called by other jig code', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        init (n) { this.n = n }
        f (n) { this.init(n) }
      }
      const a = new A(5)
      expect(() => a.f(6)).to.throw('init disabled')
    })

    // ------------------------------------------------------------------------

    it('should throw if init returns a value', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { init () { return {} }}
      expect(() => new A()).to.throw('init must not return a value')
    })

    // ------------------------------------------------------------------------

    it('may call super.init on Jig', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { init () { super.init() } }

      expectTx({
        nin: 0,
        nref: 1,
        nout: 2,
        ndel: 0,
        ncre: 2,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              A.toString(),
              { deps: { Jig: { $jig: 0 } } }
            ]
          },
          {
            op: 'NEW',
            data: [{ $jig: 1 }, []]
          }
        ]
      })

      const a = new A()
      await a.sync()
    })

    // ------------------------------------------------------------------------

    it('may call super.init on parent', async () => {
      const run = new Run()
      class A extends Jig { init () { this.a = true } }
      class B extends A { init () { super.init(); this.b = true } }

      expectTx({
        nin: 0,
        nref: 1,
        nout: 3,
        ndel: 0,
        ncre: 3,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              A.toString(),
              { deps: { Jig: { $jig: 0 } } },
              B.toString(),
              { deps: { A: { $jig: 1 } } }
            ]
          },
          {
            op: 'NEW',
            data: [{ $jig: 2 }, []]
          }
        ]
      })

      function test (b) {
        expect(b.a).to.equal(true)
        expect(b.b).to.equal(true)
      }

      const b = new B()
      test(b)
      await b.sync()

      run.cache = new LocalCache()
      const b2 = await run.load(b.location)
      test(b2)
    })

    // ------------------------------------------------------------------------

    it('is not required to call super.init', () => {
      new Run() // eslint-disable-line
      class A extends Jig { init () { this.a = true } }
      class B extends A { init () { this.b = true } }
      const b = new B()
      expect(b.a).to.equal(undefined)
      expect(b.b).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('adds references for entire class chain', async () => {
      const run = new Run()
      class A extends Jig { }
      class B extends A { }
      class C extends B { }
      run.deploy(C)
      await run.sync()

      expectTx({
        nin: 0,
        nref: 3,
        nout: 1,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'NEW',
            data: [{ $jig: 0 }, []]
          }
        ]
      })

      const c = new C()
      await c.sync()

      run.cache = new LocalCache()
      await run.load(c.location)
    })
  })

  // --------------------------------------------------------------------------
  // instanceof
  // --------------------------------------------------------------------------

  describe('instanceof', () => {
    it('matches basic jigs', async () => {
      const run = new Run()
      class A extends Jig { }

      function test (a) {
        expect(a).to.be.instanceOf(A)
        expect(a).to.be.instanceOf(Jig)
      }

      const a = new A()
      test(a)
      await a.sync()

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('matches class extensions', async () => {
      const run = new Run()

      class A extends Jig { }
      class B extends A { }
      class C extends Jig { }

      function test (b, c) {
        expect(b).to.be.instanceOf(A)
        expect(b).to.be.instanceOf(B)
        expect(b).to.be.instanceOf(Jig)
        expect(c).not.to.be.instanceOf(B)
        expect(c).to.be.instanceOf(Jig)
      }

      const b = new B()
      const c = new C()

      test(b, c)
      await run.sync()

      const b2 = await run.load(b.location)
      const c2 = await run.load(c.location)
      test(b2, c2)

      run.cache = new LocalCache()
      const b3 = await run.load(b.location)
      const c3 = await run.load(c.location)
      test(b3, c3)
    })

    // ------------------------------------------------------------------------

    it('does not match non-instances', () => {
      new Run() // eslint-disable-line
      expect(new class { }()).not.to.be.instanceOf(Jig)
      expect(new class { }() instanceof Jig).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('matches loaded jigs', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const A2 = await run.load(A.location)
      const a2 = await run.load(a.location)
      expect(a2 instanceof A).to.equal(true)
      expect(a2 instanceof A2).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('does not match prototypes', () => {
      new Run // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      expect(a.constructor.prototype instanceof Jig).to.equal(false)
      expect(Object.getPrototypeOf(a) instanceof Jig).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('cannot use Reflect to create instance', () => {
      const run = new Run()
      class A extends Jig { }
      const o = { }
      const A2 = run.deploy(A)
      Object.setPrototypeOf(o, A2.prototype)
      expect(o instanceof A).to.equal(false)
      expect(o instanceof A2).to.equal(false)
      expect(o instanceof Jig).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('matches updated classes', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { this.n = 1 }
        g () { this.n = 1 }
      }
      const A2 = run.deploy(A)
      const a = new A()
      await A2.sync()
      const A3 = await run.load(A2.location)
      expect(a.constructor).not.to.equal(A3)
      expect(a instanceof A3).to.equal(true)
      A3.f()
      expect(a instanceof A3).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('matches inner jigs set from outside', () => {
      new Run() // eslint-disable-line
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      const b = new A()
      a.set(b)
      expect(a.x instanceof Jig).to.equal(true)
    })
  })

  // --------------------------------------------------------------------------
  // Sandbox
  // --------------------------------------------------------------------------

  describe('Sandbox', () => {
    it('throws if access external variables', () => {
      try {
        new Run() // eslint-disable-line
        let n = 1 // eslint-disable-line
        class A extends Jig { init () { n = 2 } }
        expect(() => new A()).to.throw()
        global.x = 1 // eslint-disable-line
        class B extends Jig { init () { x = 2 } } // eslint-disable-line
        expect(() => new B()).to.throw()
      } finally {
        delete global.x
      }
    })

    // ------------------------------------------------------------------------

    it('throws if access JigDeps', () => {
      new Run() // eslint-disable-line
      class A extends Jig { init () { JigDeps._stack.push(1) } } // eslint-disable-line
      expect(() => new A()).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if access disabled globals', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        isUndefined (x) {
          if (typeof window !== 'undefined') return typeof window[x] === 'undefined'
          if (typeof global !== 'undefined') return typeof global[x] === 'undefined'
          return true
        }
      }
      const a = new A()
      const bad = ['Date', 'Math', 'eval', 'XMLHttpRequest', 'FileReader', 'WebSocket', 'setTimeout', 'setInterval']
      bad.forEach(x => expect(a.isUndefined(x)).to.equal(true))
    })

    // ------------------------------------------------------------------------

    it('throws useful error for Date and Math', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        createDate () { return new Date() }
        useMath () { return Math.random() }
      }
      const a = new A()
      expect(() => a.createDate()).to.throw('Date is not defined\n\nHint: Date is disabled because it is non-deterministic.')
      expect(() => a.useMath()).to.throw('Math is not defined\n\nHint: Math is disabled because it is non-deterministic.')
    })

    // ------------------------------------------------------------------------

    it('cannot change globals', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        changeGlobals () {
          Set.n = 1
        }
      }
      expect(() => new A().changeGlobals()).to.throw()
    })
  })

  // --------------------------------------------------------------------------
  // Get
  // --------------------------------------------------------------------------

  describe('get', () => {
    it('reads become refs', async () => {
      const run = new Run()
      class B extends Jig { }
      class A extends Jig { init (b) { this.n = b.n } }
      const b = new B()
      await b.sync()

      expectTx({
        nin: 0,
        nref: 2,
        nout: 2,
        ndel: 0,
        ncre: 2,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              A.toString(),
              { deps: { Jig: { $jig: 0 } } }
            ]
          },
          {
            op: 'NEW',
            data: [{ $jig: 2 }, [{ $jig: 1 }]]
          }
        ]
      })

      const a = new A(b)
      await a.sync()

      await run.load(a.location)

      run.cache = new LocalCache()
      await run.load(a.location)
    })
  })

  // --------------------------------------------------------------------------
  // Spends
  // --------------------------------------------------------------------------

  describe('Spends', async () => {
    it('spend all callers for a change', async () => {
      const run = new Run()
      class A extends Jig { set (n) { this.n = n }}
      class B extends Jig { set (a, n) { a.set(n); return this } }
      const a = new A()
      const b = new B()
      await run.sync()

      expectTx({
        nin: 2,
        nref: 2,
        nout: 2,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 1 }, 'set', [{ $jig: 0 }, 2]]
          }
        ]
      })

      function test (a, b) {
        expect(a.nonce).to.equal(2)
        expect(b.nonce).to.equal(2)
        expect(a.n).to.equal(2)
      }

      b.set(a, 2)
      await a.sync()
      await b.sync()
      test(a, b)

      const a2 = await run.load(a.location)
      const b2 = await run.load(b.location)
      test(a2, b2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      const b3 = await run.load(b.location)
      test(a3, b3)
    })

    // ------------------------------------------------------------------------

    it('spends all creators', async () => {
      const run = new Run()
      class A extends Jig { create () { return new A() } }
      const a = new A()
      await a.sync()

      function test (a, b) {
        expect(a.nonce).to.equal(2)
        expect(b.nonce).to.equal(1)
        expect(a.owner).to.deep.equal(b.owner)
      }

      expectTx({
        nin: 1,
        nref: 1,
        nout: 2,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 0 }, 'create', []]
          }
        ]
      })

      const b = a.create()
      await b.sync()
      test(a, b)

      const a2 = await run.load(a.location)
      const b2 = await run.load(b.location)
      test(a2, b2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      const b3 = await run.load(b.location)
      test(a3, b3)
    })

    // ------------------------------------------------------------------------

    it('spends all callers', async () => {
      const run = new Run()

      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { f (a, c) { a.set(1); c.g(a) } }
      class C extends Jig { g (a) { a.set(2) } }

      const a = new A()
      const b = new B()
      const c = new C()
      await run.sync()

      function test (a, b, c) {
        expect(a.n).to.equal(2)
      }

      expectTx({
        nin: 3,
        nref: 3,
        nout: 3,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 1 }, 'f', [{ $jig: 0 }, { $jig: 2 }]]
          }
        ]
      })

      b.f(a, c)
      await b.sync()
      test(a, b, c)

      const a2 = await run.load(a.location)
      const b2 = await run.load(b.location)
      const c2 = await run.load(c.location)
      test(a2, b2, c2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      const b3 = await run.load(b.location)
      const c3 = await run.load(c.location)
      test(a3, b3, c3)
    })

    // ------------------------------------------------------------------------

    it('update self through many jigs', async () => {
      const run = new Run()

      class A extends Jig {
        g (b, c) { b.h(this, c) }

        set (n) { this.n = n }
      }

      class B extends Jig {
        f (a, c) { a.g(this, c) }

        h (a, c) { c.set(a, 1) }
      }

      class C extends Jig {
        set (a, n) { a.set(n) }
      }

      const a = new A()
      const b = new B()
      const c = new C()
      await run.sync()

      function test (a, b, c) {
        expect(a.n).to.equal(1)
      }

      expectTx({
        nin: 3,
        nref: 3,
        nout: 3,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 1 }, 'f', [{ $jig: 0 }, { $jig: 2 }]]
          }
        ]
      })

      b.f(a, c)
      await b.sync()
      test(a, b, c)

      const a2 = await run.load(a.location)
      const b2 = await run.load(a.location)
      const c2 = await run.load(a.location)
      test(a2, b2, c2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      const b3 = await run.load(b.location)
      const c3 = await run.load(c.location)
      test(a3, b3, c3)
    })

    // ------------------------------------------------------------------------

    it('should not spend reads involved in update', async () => {
      const run = new Run()
      class A extends Jig {
        set (n) { this.n = n }

        get () { return this.n }
      }
      class B extends Jig {
        f (a, c) { a.set(1); a.set(c.get(a) + 1) }
      }
      class C extends Jig {
        get (a) { return a.get() }
      }

      const a = new A()
      const b = new B()
      const c = new C()
      await run.sync()

      expectTx({
        nin: 2,
        nref: 4,
        nout: 2,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 1 }, 'f', [{ $jig: 0 }, { $jig: 2 }]]
          }
        ]
      })

      function test (a, b, c) {
        expect(a.n).to.equal(2)
      }

      b.f(a, c)
      await b.sync()
      test(a, b, c)

      const a2 = await run.load(a.location)
      const b2 = await run.load(a.location)
      const c2 = await run.load(a.location)
      test(a2, b2, c2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      const b3 = await run.load(b.location)
      const c3 = await run.load(c.location)
      test(a3, b3, c3)
    })
  })

  // --------------------------------------------------------------------------
  // Reads
  // --------------------------------------------------------------------------

  describe('Reads', () => {
    it('do not spend', async () => {
      const run = new Run()

      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig {
        init () { this.a = new A(3) }

        set (a) { this.n = a.n + this.a.n }
      }
      B.deps = { A }

      const b = new B()
      const a = new A(2)
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
            data: [{ $jig: 0 }, 'set', [{ $jig: 1 }]]
          }
        ]
      })

      function test (a, b) {
        expect(b.n).to.equal(5)
      }

      b.set(a)
      test(a, b)
      await b.sync()

      const a2 = await run.load(a.location)
      const b2 = await run.load(b.location)
      test(a2, b2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      const b3 = await run.load(b.location)
      test(a3, b3)
    })

    // ------------------------------------------------------------------------

    it('throws if different read instances', async () => {
      const run = new Run()
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      class B extends Jig {
        init (a) { this.a = a }

        apply (a2) { this.n = this.a + a2.n }
      }
      const b = new B(a)
      expect(() => b.apply(a2)).to.throw('Inconsistent worldview')
    })

    // ------------------------------------------------------------------------

    it('throws if read different instance than written', async () => {
      const run = new Run()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a, a2) { this.n = a.n; a2.set(3) } }
      const a = new A()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      const b = new B()
      expect(() => b.apply(a, a2)).to.throw('Inconsistent worldview')
    })

    // ------------------------------------------------------------------------

    it.skip('throws if read different instances of a jig across a batch', async () => {
      const run = new Run()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      run.transaction.begin()
      const b = new B()
      const b2 = new B()
      b.apply(a)
      b2.apply(a2)
      run.transaction.end()
      await expect(run.sync()).to.be.rejectedWith(`read different locations of same jig ${a.origin}`)
    })

    // ------------------------------------------------------------------------

    it.skip('throws if write difference locations of the same jig', async () => {
      const run = new Run()
      class Store extends Jig { set (x) { this.x = x } }
      class Setter extends Jig { set (a, x) { a.set(x) } }
      const a = new Store()
      const b = new Setter()
      a.set(1)
      await a.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      await a2.sync()
      run.transaction.begin()
      b.set(a, 3)
      expect(() => b.set(a2, 3)).to.throw('Different location for [jig Store] found in set()')
      run.transaction.rollback()
    })

    // ------------------------------------------------------------------------

    it.skip('throws if write difference instances but same location of the same jig', async () => {
      const run = new Run()
      class Store extends Jig { set (x) { this.x = x } }
      class Setter extends Jig { set (a, x) { a.set(x) } }
      const a = new Store()
      const b = new Setter()
      a.set(1)
      await a.sync()
      const a2 = await run.load(a.location)
      run.transaction.begin()
      b.set(a, 2)
      expect(() => b.set(a2, 3)).to.throw('Different location for [jig Store] found in set()')
      run.transaction.rollback()
    })
  })

  // --------------------------------------------------------------------------
  // Uint8Array
  // --------------------------------------------------------------------------

  describe('Uint8Array', () => {
    it('matches instanceof', async () => {
      const run = new Run()
      class A extends Jig {
        set () { this.buf = Uint8Array.from([1, 2, 3]) }

        check1 (buf) { return buf instanceof Uint8Array }

        check2 () { return this.buf instanceof Uint8Array }
      }
      class B extends A {
        check3 () { return this.buf instanceof Uint8Array }
      }
      const a = new A()
      a.set()
      expect(a.check1(new Uint8Array([1, 2, 3]))).to.equal(true)
      const b = new B()
      b.set()
      await b.sync()
      const b2 = await run.load(b.location)
      expect(b.buf.length).to.equal(b2.buf.length)
      for (let i = 0; i < b.buf.length; i++) {
        expect(b.buf[i]).to.equal(b2.buf[i])
      }
    })

    // ------------------------------------------------------------------------

    it('return', async () => {
      const run = new Run()
      class A extends Jig {
        init () { this.buf = new Uint8Array([1, 2, 3]) }

        getBuf () { return this.buf }
      }

      function testBuf (buf) {
        expect(buf.length).to.equal(3)
        expect(buf[0]).to.equal(1)
        expect(buf[1]).to.equal(2)
        expect(buf[2]).to.equal(3)
        expect(buf.constructor === SI.Uint8Array).to.equal(true)
      }

      function test (a) {
        testBuf(a.buf)
        testBuf(a.getBuf())
      }

      const a = new A()
      await a.sync()
      test(a)

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })
  })

  // --------------------------------------------------------------------------
  // Set
  // --------------------------------------------------------------------------

  describe('set', () => {
    it('throws if not serializable', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        f () { this.n = new WeakMap() }
        g () { this.n = Symbol.hasInstance }
      }
      const a = new A()
      expect(() => a.f()).to.throw('Not serializable')
      expect(typeof a.n).to.equal('undefined')
      expect(() => a.g()).to.throw('Not serializable')
      expect(typeof a.n).to.equal('undefined')
    })

    // ------------------------------------------------------------------------

    it('throws if external', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      class B extends Jig { init () { this.a = new A(); this.a.n = 1 }}
      B.deps = { A }
      const a = new A()
      expect(() => { a.n = 1 }).to.throw()
      expect(() => new B()).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if override jig methods', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        h () { this.sync = [] }

        i () { this.init = 'hello' }
      }
      const a = new A()
      expect(() => a.h()).to.throw('Cannot set sync')
      expect(() => a.i()).to.throw('Cannot set init')
    })

    // ------------------------------------------------------------------------

    it('allowed to override user methods', () => {
      // With class upgrades we can't stop it. So allow it by design.
      new Run() // eslint-disable-line
      class A extends Jig {
        f () { }

        g () { this.f = 1 }

        h () { this.sync = [] }

        i () { this.init = 'hello' }
      }
      const a = new A()
      expect(() => a.g()).not.to.throw()
    })

    // ------------------------------------------------------------------------

    it('should throw if set properties on custom methods', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        f () { this.f.n = 1 }
      }
      const a = new A()
      expect(() => a.f()).to.throw('set disabled')
    })

    // ------------------------------------------------------------------------

    it('cannot set methods on builtin methods', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        init () { this.arr = [] }
        f () { this.sync.n = 1 }
        h () { Array.n = 1 }
      }
      const a = new A()
      expect(() => a.f()).to.throw('set disabled')
      expect(() => a.g()).to.throw()
    })

    // ------------------------------------------------------------------------

    it('creates transaction if no change', async () => {
      const run = new Run()

      class A extends Jig {
        init () { this.n = 1 }

        set (n) { this.n = n }
      }
      const a = new A()
      await a.sync()

      expectTx({
        nin: 1,
        nref: 1,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 0 }, 'set', [1]]
          }
        ]
      })

      function test (a) {
        expect(a.nonce).to.equal(2)
        expect(a.n).to.equal(1)
      }

      a.set(1)
      await a.sync()
      test(a)

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('zero-length properties', async () => {
      const run = new Run()
      class A extends Jig {
        init () { this[''] = 1 }
      }

      function test (a) {
        expect(a['']).to.equal(1)
      }

      const a = new A()
      await a.sync()
      test(a)

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })
  })

  // --------------------------------------------------------------------------
  // Delete
  // --------------------------------------------------------------------------

  describe('Delete', () => {
    it('delete properties', async () => {
      const run = new Run()
      class A extends Jig {
        init () { this.n = 1 }
        delete () { delete this.n }
      }
      const a = new A()
      await a.sync()

      function test (a) {
        expect(a.n).to.equal(undefined)
      }

      expectTx({
        nin: 1,
        nref: 1,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 0 }, 'delete', []]
          }
        ]
      })

      a.delete()
      test(a)
      await a.sync()

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('throws if delete externally', () => {
      new Run() // eslint-disable-line
      class A extends Jig { init () { this.n = 1 }}
      const a = new A()
      expect(() => { delete a.n }).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('cannot delete user method', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        f () {
          delete this.constructor.prototype.f
          return !!this.constructor.prototype.f
        }
      }
      const a = new A()
      expect(a.f()).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('throws if delete jig method', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { delete this.sync } }
      const a = new A()
      expect(() => { delete a.sync }).to.throw('Cannot delete sync')
      expect(() => { a.f() }).to.throw('Cannot delete sync')
    })

    // ------------------------------------------------------------------------

    it('creates transactions if no change', async () => {
      const run = new Run()
      class A extends Jig { delete () { this.n = 1; delete this.n } }
      const a = new A()
      await a.sync()
      a.delete()
      await a.sync()
      await run.load(a.location)
      run.cache = new LocalCache()
      await run.load(a.location)
    })
  })

  // --------------------------------------------------------------------------
  // getPrototypeOf
  // --------------------------------------------------------------------------

  describe('getPrototypeOf', () => {
    it('reads jig', async () => {
      const run = new Run()
      class A extends Jig {
        init () { }

        f () { this.a2 = new A() }

        g () {
          this.x = this.a2 instanceof A
          this.y = this.a2.constructor.prototype === 'hello'
          this.z = Object.getPrototypeOf(this.a2) === 'world'
        }
      }
      const a = new A()
      a.f()
      await a.sync()

      function test (a) {
        expect(a.x).to.equal(true)
        expect(a.y).to.equal(false)
        expect(a.z).to.equal(false)
      }

      expectTx({
        nin: 1,
        nref: 2,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 0 }, 'g', []]
          }
        ]
      })

      a.g()
      test(a)
      await a.sync()

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })
  })

  // --------------------------------------------------------------------------
  // setPrototypeOf
  // --------------------------------------------------------------------------

  describe('setPrototypeOf', () => {
    it('throws', () => {
        new Run() // eslint-disable-line
      class A extends Jig { f () { Reflect.setPrototypeOf(this, Object) }}
      const a = new A()
      expect(() => Reflect.setPrototypeOf(a, Object)).to.throw('setPrototypeOf disabled')
      expect(() => a.f()).to.throw('setPrototypeOf disabled')
    })
  })

  // --------------------------------------------------------------------------
  // preventExtensions
  // --------------------------------------------------------------------------

  describe('preventExtensions', () => {
    it('throws', () => {
        new Run() // eslint-disable-line
      class A extends Jig { f () { Object.preventExtensions(this) }}
      const a = new A()
      expect(() => Object.preventExtensions(a)).to.throw()
      expect(() => a.f()).to.throw()
    })
  })

  // --------------------------------------------------------------------------
  // defineProperty
  // --------------------------------------------------------------------------

  describe('defineProperty', () => {
    it('throws if external', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      const desc = { value: 1, configurable: true, enumerable: true, writable: true }
      const error = 'Updates must be performed in the jig\'s methods'
      expect(() => Object.defineProperty(a, 'n', desc)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('allowed internally', async () => {
      const run = new Run()
      class A extends Jig {
        f () {
          const desc = { value: 1, configurable: true, enumerable: true, writable: true }
          Object.defineProperty(this, 'n', desc)
        }
      }
      const a = new A()
      a.f()
      function test (a) { expect(a.n).to.equal(1) }
      test(a)
      await a.sync()
      const a2 = await run.load(a.location)
      test(a2)
      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('throws if non-configurable, non-enumerable, or non-writable', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f (desc) { Object.defineProperty(this, 'n', desc) } }
      const a = new A()
      expect(() => a.f({ value: 1, configurable: true, enumerable: true })).to.throw()
      expect(() => a.f({ value: 1, configurable: true, writable: true })).to.throw()
      expect(() => a.f({ value: 1, enumerable: true, writable: true })).to.throw()
    })
  })

  // --------------------------------------------------------------------------
  // has
  // --------------------------------------------------------------------------

  describe('has', () => {
    it('reads jig', async () => {
      const run = new Run()
      class A extends Jig { init () { this.arr = [1] }}
      class B extends Jig {
        f (a) { this.x = 'n' in a }

        g (a) { this.y = 'arr' in a }

        h (a) { this.z = '1' in a.arr }
      }
      function test (a) {
        expect(b.x).to.equal(false)
        expect(b.y).to.equal(true)
        expect(b.z).to.equal(false)
      }
      const a = new A()
      const b = new B()
      await run.sync()

      expectTx({
        nin: 1,
        nref: 2,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 0 }, 'f', [{ $jig: 1 }]]
          }
        ]
      })

      b.f(a)
      await b.sync()

      expectTx({
        nin: 1,
        nref: 2,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 0 }, 'g', [{ $jig: 1 }]]
          }
        ]
      })

      b.g(a)
      await b.sync()

      expectTx({
        nin: 1,
        nref: 2,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 0 }, 'h', [{ $jig: 1 }]]
          }
        ]
      })

      b.h(a)
      await b.sync()

      test(b)

      const b2 = await run.load(b.location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(b.location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('should support has for undefined values', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        init () { this.x = undefined }
      }
      const a = new A()
      expect('x' in a).to.equal(true)
    })
  })

  // --------------------------------------------------------------------------
  // ownKeys
  // --------------------------------------------------------------------------

  describe('ownKeys', () => {
    it('reads jig', async () => {
      const run = new Run()
      class A extends Jig {}
      class B extends Jig { f (a) { this.x = Reflect.ownKeys(a) }}
      const a = new A()
      const b = new B()
      await run.sync()
      expectTx({
        nin: 1,
        nref: 2,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 0 }, 'f', [{ $jig: 1 }]]
          }
        ]
      })
      b.f(a)
      await b.sync()
      await run.load(b.location)
      run.cache = new LocalCache()
      await run.load(b.location)
    })
  })

  // --------------------------------------------------------------------------
  // getOwnPropertyDescriptor
  // --------------------------------------------------------------------------

  describe('getOwnPropertyDescriptor', () => {
    it('reads jig', async () => {
      const run = new Run()
      class A extends Jig { init () { this.n = 1 }}
      class B extends Jig { f (a) { this.x = Object.getOwnPropertyDescriptor(a, 'n') }}
      const a = new A()
      const b = new B()
      await run.sync()
      expectTx({
        nin: 1,
        nref: 2,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 0 }, 'f', [{ $jig: 1 }]]
          }
        ]
      })
      b.f(a)
      await b.sync()
      await run.load(b.location)
      run.cache = new LocalCache()
      await run.load(b.location)
    })
  })

  // --------------------------------------------------------------------------
  // Array
  // --------------------------------------------------------------------------

  describe('Array', () => {
    it('push internal', async () => {
      const run = new Run()
      class A extends Jig {
        init () { this.a = [] }
        add (n) { this.a.push(n) }
      }
      const a = new A()
      await a.sync()

      expectTx({
        nin: 1,
        nref: 1,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 0 }, 'add', [1]]
          }
        ]
      })

      function test (a) { expect(a.a[0]).to.equal(1) }

      a.add(1)
      await a.sync()
      test(a)

      const a2 = await run.load(a.location)
      test(a2)

      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('throws if change externally', async () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        init () { this.a = [3, 1, 2, 5, 0] }

        add (n) { this.a.push(n) }
      }
      class B extends Jig { init () { new A().a.push(1) } }
      B.deps = { A }
      const a = new A()
      const error = "Updates must be performed in the jig's methods"
      const expectArrayError = (method, ...args) => {
        expect(() => a.a[method](...args)).to.throw(error)
      }
      expectArrayError('copyWithin', 1)
      expectArrayError('pop')
      expectArrayError('push', 1)
      expectArrayError('reverse')
      expectArrayError('shift')
      expectArrayError('sort')
      expectArrayError('splice', 0, 1)
      expectArrayError('unshift', 4)
      expectArrayError('fill', 0)
      expect(() => new B()).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('read without spending', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { init () { this.a = [] } }
      const a = new A()
      const readOps = [
        () => expect(a.a.length).to.equal(0),
        () => expect(() => a.a.concat([1])).not.to.throw(),
        () => expect(() => a.a.entries()).not.to.throw(),
        () => expect(() => a.a.every(() => true)).not.to.throw(),
        () => expect(() => a.a.filter(() => true)).not.to.throw(),
        () => expect(() => a.a.find(() => true)).not.to.throw(),
        () => expect(() => a.a.findIndex(() => true)).not.to.throw(),
        () => expect(() => a.a.forEach(() => {})).not.to.throw(),
        () => expect(() => a.a.includes(1)).not.to.throw(),
        () => expect(() => a.a.indexOf(1)).not.to.throw(),
        () => expect(() => a.a.join()).not.to.throw(),
        () => expect(() => a.a.keys()).not.to.throw(),
        () => expect(() => a.a.lastIndexOf(1)).not.to.throw(),
        () => expect(() => a.a.map(() => true)).not.to.throw(),
        () => expect(() => a.a.reduce(() => true, 0)).not.to.throw(),
        () => expect(() => a.a.reduceRight(() => true, 0)).not.to.throw(),
        () => expect(() => a.a.slice(0)).not.to.throw(),
        () => expect(() => a.a.some(() => true)).not.to.throw(),
        () => expect(() => a.a.toLocaleString()).not.to.throw(),
        () => expect(() => a.a.toString()).not.to.throw()
      ]
      readOps.forEach(op => op())
      await a.sync()
      expect(a.origin).to.equal(a.location)
    })

    // ------------------------------------------------------------------------

    it('iterator', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        init () { this.a = [] }

        add (x) { this.a.push(x) }
      }
      const a = new A()
      a.add(1)
      a.add(2)
      expect(Array.from(a.a)).to.deep.equal([1, 2])
      const e = [1, 2]
      for (const x of a.a) { expect(x).to.equal(e.shift()) }
    })
  })

  // --------------------------------------------------------------------------
  // owner
  // --------------------------------------------------------------------------

  describe('owner', () => {
    it('throws if read before assigned', () => {
      new Run() // eslint-disable-line
      class A extends Jig { init () { this.ownerAtInit = this.owner }}
      expect(() => new A()).to.throw('Cannot read owner')
    })

    // ------------------------------------------------------------------------

    it('assigned to creator owner', async () => {
      const run = new Run()
      class A extends Jig { init () { this.ownerAtInit = this.owner } }
      class B extends Jig { create () { return new A() } }
      B.deps = { A }
      function test (a, b) {
        expect(a.owner).to.equal(b.owner)
        expect(a.ownerAtInit).to.equal(b.owner)
      }
      const b = new B()
      await b.sync()
      const a = b.create()
      test(a, b)
      await a.sync()
      const a2 = await run.load(a.location)
      const b2 = await run.load(b.location)
      test(a2, b2)
      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      const b3 = await run.load(b.location)
      test(a3, b3)
    })

    // ------------------------------------------------------------------------

    it('throws if creator owner is undetermined', () => {
      new Run() // eslint-disable-line
      class A extends Jig { init () { this.ownerAtInit = this.owner } }
      class B extends Jig { create () { return new A() } }
      B.deps = { A }
      const b = new B()
      expect(() => b.create()).to.throw('Cannot read owner')
    })

    // ------------------------------------------------------------------------

    it('set owner during init', async () => {
      const run = new Run()
      class A extends Jig { init (owner) { this.owner = owner } }
      const addr = new PrivateKey().toPublicKey().toAddress().toString()
      function test (a) { expect(a.owner).to.equal(addr) }
      const a = new A(addr)
      await a.sync()
      test(a)
      const a2 = await run.load(a.location)
      test(a2)
      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('throws if change while unbound', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f (owner) { this.owner = owner; this.owner = owner } }
      const addr = new PrivateKey().toPublicKey().toAddress().toString()
      const a = new A(addr)
      expect(() => a.f(addr)).to.throw('Cannot set owner')
    })

    // ------------------------------------------------------------------------

    it('throws if invalid', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f (owner) { this.owner = owner } }
      const a = new A()
      expect(() => a.f(new PrivateKey().publicKey)).to.throw()
      expect(() => a.f('123')).to.throw()
      expect(() => a.f(null)).to.throw()
      expect(() => a.f(undefined)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if set to address on another network', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { send (addr) { this.owner = addr } }
      const a = new A()
      await a.sync()
      const addr = new PrivateKey('mainnet').toAddress().toString()
      a.send(addr)
      await expect(a.sync()).to.be.rejectedWith('Invalid owner')
    })

    // ------------------------------------------------------------------------

    it('throws if delete owner', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { delete this.owner }}
      const a = new A()
      expect(() => { delete a.owner }).to.throw('Cannot delete owner')
      expect(() => a.f()).to.throw('Cannot delete owner')
    })

    // ------------------------------------------------------------------------

    it('throws if set externally', () => {
      new Run () // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      const error = 'Updates must be performed in the jig\'s methods'
      const addr = new PrivateKey().publicKey.toAddress().toString()
      expect(() => { a.owner = addr }).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if owner method', () => {
      new Run() // eslint-disable-line
      class A extends Jig { owner () {} }
      expect(() => new A()).to.throw('Cannot override Jig methods or properties')
    })

    // ------------------------------------------------------------------------

    it('reads jig', async () => {
      const run = new Run()
      class A extends Jig { f (a) { this.x = a.owner }}
      const a = new A()
      const b = new A()
      await a.sync()

      function test (a, b) { expect(b.x).to.equal(a.owner) }

      expectTx({
        nin: 1,
        nref: 2,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 0 }, 'f', [{ $jig: 1 }]]
          }
        ]
      })

      b.f(a)
      test(a, b)
      await b.sync()

      const a2 = await run.load(a.location)
      const b2 = await run.load(b.location)
      test(a2, b2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      const b3 = await run.load(b.location)
      test(a3, b3)
    })

    // ------------------------------------------------------------------------

    it('only class can create instance', async () => {
      class A extends Jig {
        init () { if (this.owner !== A.owner) throw new Error() }
        static create () { return new A() }
      }
      const run = new Run()
      const A2 = run.deploy(A)
      await A2.sync()
      expect(() => new A()).to.throw()
      const a = A2.create()
      await a.sync()
      await run.load(a.location)
      run.cache = new LocalCache()
      await run.load(a.location)
    })
  })

  // --------------------------------------------------------------------------
  // satoshis
  // --------------------------------------------------------------------------

  describe('satoshis', () => {
    async function testSatoshisPass (amount) {
      const run = new Run()
      class A extends Jig { f (s) { this.satoshis = s } }
      const a = new A()
      a.f(amount)
      await a.sync()
      const a2 = await run.load(a.location)
      expect(a2.satoshis).to.equal(amount)
      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      expect(a3.satoshis).to.equal(amount)
    }

    // ------------------------------------------------------------------------

    // minimum amount
    it('set to 0', () => testSatoshisPass(0))

    // less than dust
    it('set to 50', () => testSatoshisPass(50))

    // more than dust
    it('set to 600', () => testSatoshisPass(600))

    // ------------------------------------------------------------------------

    function testFailToSet (amount, error) {
      new Run() // eslint-disable-line
      class A extends Jig { f (s) { this.satoshis = s } }
      const a = new A()
      expect(() => a.f(amount)).to.throw(error)
    }

    // ------------------------------------------------------------------------

    it('throws if set to negative', () => testFailToSet(-1, 'satoshis must be non-negative'))
    it('throws if set to float', () => testFailToSet(1.1, 'satoshis must be an integer'))
    it('throws if set to string', () => testFailToSet('1', 'satoshis must be a number'))
    it('throws if set above 100M', () => testFailToSet(100000001, 'satoshis must be <= 100000000'))
    it('throws if set to NaN', () => testFailToSet(NaN, 'satoshis must be an integer'))
    it('throws if set to Infinity', () => testFailToSet(Infinity, 'satoshis must be an integer'))
    it('throws if set to undefined', () => testFailToSet(undefined, 'satoshis must be a number'))

    // ------------------------------------------------------------------------

    it('throws if read while unbound', () => {
      new Run() // eslint-disable-line
      class A extends Jig { init () { this.satoshisAtInit = this.satoshis }}
      expect(() => new A()).to.throw('Cannot read satoshis')
    })

    // ------------------------------------------------------------------------

    it('throws if satoshis method exists', () => {
      new Run() // eslint-disable-line
      class A extends Jig { satoshis () {} }
      expect(() => new A()).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if delete', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { delete this.satoshis }}
      const a = new A()
      expect(() => { delete a.satoshis }).to.throw('Cannot delete satoshis')
      expect(() => a.f()).to.throw('Cannot delete satoshis')
    })

    // ------------------------------------------------------------------------

    it('throws if set externally', () => {
      new Run () // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      const error = 'Updates must be performed in the jig\'s methods'
      expect(() => { a.satoshis = 1 }).to.throw(error)
    })
  })

  // --------------------------------------------------------------------------
  // Class
  // --------------------------------------------------------------------------

  describe('Class', () => {
    it('access class properties from outside', async () => {
      const run = new Run()
      class A extends Jig {}
      A.n = 1
      const a = new A()
      await a.sync()
      const a2 = await run.load(a.location)
      expect(a2.constructor.n).to.equal(1)
      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      expect(a3.constructor.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('read class properties from inside', async () => {
      const run = new Run()
      class A extends Jig { f () { this.n = this.constructor.n }}
      A.n = 1
      const a = new A()
      a.f()
      await a.sync()
      expect(a.n).to.equal(1)
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(1)
      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      expect(a3.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('call class method from instance', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { this.n = 1 }
        f () { A.f(); this.n = this.constructor.n + 1 }
      }
      const CA = run.deploy(A)
      const a = new A()
      await a.sync()

      expectTx({
        nin: 2,
        nref: 0,
        nout: 2,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 1 }, 'f', []]
          }
        ]
      })

      function test (A, a) {
        expect(A.n).to.equal(1)
        expect(a.n).to.equal(2)
      }

      a.f()
      await a.sync()
      test(CA, a)

      const A2 = await run.load(CA.location)
      const a2 = await run.load(a.location)
      test(A2, a2)

      run.cache = new LocalCache()
      const A3 = await run.load(CA.location)
      const a3 = await run.load(a.location)
      test(A3, a3)
    })

    // ------------------------------------------------------------------------

    it('should support reading presets', async () => {
      const run = new Run()
      const network = run.blockchain.network
      class B extends Jig { init () { this.n = B.n } }
      B.presets = { [network]: { n: 1 } }
      const b = new B()
      expect(b.n).to.equal(1)
      await b.sync()
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(1)
      run.cache = new LocalCache()
      const b3 = await run.load(b.location)
      expect(b3.n).to.equal(1)
    })
  })

  // --------------------------------------------------------------------------
  // Misc
  // --------------------------------------------------------------------------

  describe('Misc', () => {
    it('toJSON', () => {
      new Run() // eslint-disable-line
      class A extends Jig { toJSON () { return [1, 2, 3] } }
      const a = new A()
      expect(JSON.stringify(a)).to.equal('[1,2,3]')
    })

    // ------------------------------------------------------------------------

    it('complex self-reference', async () => {
      const run = new Run()
      class C { }

      class A extends Jig {
        init (C) {
          this.C = C
          this.b = new B()
        }
      }

      class B extends Jig {
        init () {
          this.x = caller
        }
      }
      A.deps = { B }

      function test (a) {
        Object.keys(a.C) // simulates console.log
        expect(a.b.x).to.equal(a)
      }

      const a = new A(C)
      await a.sync()
      test(a)

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('$ properties and args', async () => {
      const run = new Run()
      class A extends Jig {
        init () { this.o = { $class: 'undefined' } }
        f () { this.$ref = '123' }
        g (x) { this.x = x }
      }
      const a = new A()
      a.f()
      a.g({ $undef: 1 })

      function test (a) {
        expect(a.$ref).to.equal('123')
        expect(a.x).to.deep.equal({ $undef: 1 })
        expect(a.o).to.deep.equal({ $class: 'undefined' })
      }

      await a.sync()
      test(a)

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('unusable if deploy fails', async () => {
      const run = new Run()
      stub(run.purse, 'pay').returns()
      class A extends Jig {
        init () { this.n = 1 }
        f () {}
      }
      const a = new A()
      await expect(a.sync()).to.be.rejected
      const error = 'Deploy failed'
      expect(() => a.origin).to.throw(error)
      expect(() => a.n).to.throw(error)
      expect(() => Reflect.ownKeys(a)).to.throw(error)
      expect(() => a.f()).to.throw(error)
      expect(() => console.log(a.n)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('should detect uncaught errors', async () => {
      const run = new Run()
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      await a.sync()
      stub(run.blockchain, 'broadcast').throws()
      expect(a.n).to.equal(undefined)
      a.f()
      expect(a.n).to.equal(1)
      await new Promise(resolve => {
        setTimeout(() => {
          let completed = false
          try { a.origin } catch (e) { completed = true } // eslint-disable-line
          if (completed) {
            const error = 'Unhandled Error'
            expect(() => a.origin).to.throw(error)
            expect(() => a.location).to.throw(error)
            expect(() => a.owner).to.throw(error)
            expect(() => a.n).to.throw(error)
            expect(() => a.f()).to.throw(error)
            resolve()
          }
        }, 0)
      })
    })

    // ------------------------------------------------------------------------

    it('should support arbitrary objects', async () => {
      const run = new Run()
      class Store extends Jig { set (x) { this.x = x } }
      const store = new Store()
      class Dragon { }
      store.set(new Dragon())
      await store.sync()
      expect(!!Dragon.location).to.equal(true)
      await run.load(store.location)
      run.cache.clear()
      await run.load(store.location)
    })

    // ------------------------------------------------------------------------

    it('should support circular objects', async () => {
      const run = new Run()
      class A extends Jig {
        init () {
          this.x = []
          this.x.push(this.x)
        }
      }
      const a = new A()
      await a.sync()
      await run.load(a.location)
      run.cache.clear()
      await run.load(a.location)
    })
  })

  // --------------------------------------------------------------------------
  // toString
  // --------------------------------------------------------------------------

  describe('toString', () => {
    it('returns default value', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      expect(a.toString()).to.equal('[jig A]')
    })

    // ------------------------------------------------------------------------

    it('returns overridden value', () => {
      new Run() // eslint-disable-line
      class A extends Jig { toString () { return 'hello' }}
      const a = new A()
      expect(a.toString()).to.equal('hello')
    })
  })

  // --------------------------------------------------------------------------
  // origin
  // --------------------------------------------------------------------------

  describe('origin', () => {
    it('throws if read before sync', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { this.origin2 = this.origin }}
      const a = new A()
      expect(() => a.origin).to.throw('Cannot read origin')
      expect(() => a.f()).to.throw('Cannot read origin')
      await a.sync()
      expect(() => a.origin).not.to.throw()
      expect(() => a.f()).not.to.throw()
    })

    // ------------------------------------------------------------------------

    it('read after sync', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { this.origin2 = this.origin }}
      const a = new A()
      await a.sync()
      a.f()
      expect(this.origin2).to.equal(this.origin)
    })

    // ------------------------------------------------------------------------

    it('throws if delete', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { delete this.origin }}
      const a = new A()
      expect(() => { delete a.origin }).to.throw('Cannot delete origin')
      expect(() => a.f()).to.throw('Cannot delete origin')
    })

    // ------------------------------------------------------------------------

    it('throws if set', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { this.origin = '123' }}
      const a = new A()
      expect(() => { a.origin = '123' }).to.throw('Cannot set origin')
      expect(() => a.f()).to.throw('Cannot set origin')
    })

    // ------------------------------------------------------------------------

    it('throws if define', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        f () {
          const desc = { value: '123', configurable: true, enumerable: true, writable: true }
          Object.defineProperty(this, 'origin', desc)
        }
      }
      const a = new A()
      const desc = { value: '123', configurable: true, enumerable: true, writable: true }
      expect(() => Object.defineProperty(a, 'origin', desc)).to.throw('Cannot set origin')
      expect(() => a.f()).to.throw('Cannot set origin')
    })

    // ------------------------------------------------------------------------

    it('throws if method exists', () => {
      new Run() // eslint-disable-line
      class A extends Jig { origin () {} }
      expect(() => new A()).to.throw('Cannot override Jig methods or properties')
    })
  })

  // --------------------------------------------------------------------------
  // Location
  // --------------------------------------------------------------------------

  describe('location', () => {
    it('throws if read before sync', async () => {
      new Run() // eslint-disable-line
      class A extends Jig {}
      const a = new A()
      expect(() => a.location).to.throw('Cannot read location')
      await a.sync()
      expect(() => a.location).not.to.throw()
    })

    // ------------------------------------------------------------------------

    it('read after sync', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { this.location2 = this.location }}
      const a = new A()
      await a.sync()
      a.f()
      expect(a.location2).to.equal(a.origin)
      expect(() => a.f()).to.throw('Cannot read location')
      await a.sync()
      const secondLocation = a.location
      a.f()
      expect(a.location2).to.equal(secondLocation)
    })

    // ------------------------------------------------------------------------

    it('throws if delete', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { delete this.location }}
      const a = new A()
      expect(() => { delete a.location }).to.throw('Cannot delete location')
      expect(() => a.f()).to.throw('Cannot delete location')
    })

    // ------------------------------------------------------------------------

    it('throws if set', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { this.location = '123' }}
      const a = new A()
      expect(() => { a.location = '123' }).to.throw('Cannot set location')
      expect(() => a.f()).to.throw('Cannot set location')
    })

    // ------------------------------------------------------------------------

    it('throws if define', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        f () {
          const desc = { value: '123', configurable: true, enumerable: true, writable: true }
          Object.defineProperty(this, 'location', desc)
        }
      }
      const a = new A()
      const desc = { value: '123', configurable: true, enumerable: true, writable: true }
      expect(() => Object.defineProperty(a, 'location', desc)).to.throw('Cannot set location')
      expect(() => a.f()).to.throw('Cannot set location')
    })

    // ------------------------------------------------------------------------

    it('throws if method exists', () => {
      new Run() // eslint-disable-line
      class A extends Jig { location () {} }
      expect(() => new A()).to.throw('Cannot override Jig methods or properties')
    })
  })

  // --------------------------------------------------------------------------
  // Nonce
  // --------------------------------------------------------------------------

  describe('nonce', () => {
    it('updates with every action', async () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        update () { this.n += 1; return this.nonce }
      }

      const a = new A()
      await a.sync()
      expect(a.nonce).to.equal(1)

      expect(a.update()).to.equal(1)
      await a.sync()
      expect(a.nonce).to.equal(2)

      expect(a.update()).to.equal(2)
      await a.sync()
      expect(a.nonce).to.equal(3)

      expect(a.update()).to.equal(3)
      await a.sync()
      expect(a.nonce).to.equal(4)
    })

    it('throws if read before sync', async () => {
      new Run() // eslint-disable-line
      class A extends Jig {}
      const a = new A()
      expect(() => a.nonce).to.throw('Cannot read nonce')
      await a.sync()
      expect(() => a.nonce).not.to.throw()
    })

    // ------------------------------------------------------------------------

    it('read after sync', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { this.nonce2 = this.nonce }}
      const a = new A()
      await a.sync()
      a.f()
      expect(() => a.f()).to.throw('Cannot read nonce')
      await a.sync()
      const secondNonce = a.nonce
      a.f()
      expect(a.nonce2).to.equal(secondNonce)
    })

    // ------------------------------------------------------------------------

    it('throws if delete', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { delete this.nonce }}
      const a = new A()
      expect(() => { delete a.nonce }).to.throw('Cannot delete nonce')
      expect(() => a.f()).to.throw('Cannot delete nonce')
    })

    // ------------------------------------------------------------------------

    it('throws if set', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { this.nonce = '123' }}
      const a = new A()
      expect(() => { a.nonce = '123' }).to.throw('Cannot set nonce')
      expect(() => a.f()).to.throw('Cannot set nonce')
    })

    // ------------------------------------------------------------------------

    it('throws if define', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        f () {
          const desc = { value: '123', configurable: true, enumerable: true, writable: true }
          Object.defineProperty(this, 'nonce', desc)
        }
      }
      const a = new A()
      const desc = { value: '123', configurable: true, enumerable: true, writable: true }
      expect(() => Object.defineProperty(a, 'nonce', desc)).to.throw('Cannot set nonce')
      expect(() => a.f()).to.throw('Cannot set nonce')
    })

    // ------------------------------------------------------------------------

    it('throws if method exists', () => {
      new Run() // eslint-disable-line
      class A extends Jig { nonce () {} }
      expect(() => new A()).to.throw('Cannot override Jig methods or properties')
    })
  })

  // --------------------------------------------------------------------------
  // Inner objects
  // --------------------------------------------------------------------------

  describe.only('Inner objects', () => {
    /*
    it('should support calling a read-only method on an internal property from outside', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.obj.toString()).not.to.throw()
      expect(() => a.arr.indexOf(3)).not.to.throw()
      expect(() => a.buf.indexOf(2)).not.to.throw()
    })

    it('should support calling a read-only method on an internal property from another jig', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      class B extends Jig {
        f (a) {
          this.x = a.obj.toString()
          this.y = a.arr.indexOf(3)
          this.z = a.buf.indexOf(2)
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).not.to.throw()
    })

    it('should support calling a write method on an internal property from outside', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([3, 2, 1])
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.arr.push(1)).to.throw('internal method push may not be called to change state')
      expectNoAction()
      expect(() => a.buf.sort()).to.throw('internal method sort may not be called to change state')
      expectNoAction()
    })

    it('should support calling a write method on an internal property from another jig', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([3, 2, 1])
        }
      }
      class B extends Jig {
        f (a) { a.arr.push(1) }

        g (a) { a.buf.sort() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).to.throw('internal method push may not be called to change state')
      expectNoAction()
      expect(() => b.g(a)).to.throw('internal method sort may not be called to change state')
      expectNoAction()
    })

    it('should support internal methods that do not require args to be serializable', () => {
      createHookedRun()
      class A extends Jig { init () { this.arr = [1, 2, 3] } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.arr.filter(x => x === 1)).not.to.throw()
      expect(() => a.arr.indexOf(Symbol.hasInstance)).not.to.throw()
    })

    it('should throw if save an internal property on another jig', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      class B extends Jig {
        f (a) { this.x = a.obj }

        g (a) { this.y = a.arr }

        h (a) { this.z = a.buf }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).to.throw('[object Object] belongs to a different resource')
      expect(() => b.g(a)).to.throw('[object Array] belongs to a different resource')
      expect(() => b.h(a)).to.throw('[object Uint8Array] belongs to a different resource')
    })

    it('should throw if save an arbitrary object from another jig', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          class Blob { f () { return 2 } }
          this.blob = new Blob()
        }
      }
      class B extends Jig {
        set (a) { this.x = a.blob }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.set(a)).to.throw('[object Blob] belongs to a different resource')
    })

    it('should not throw if save a copy of an internal property on another jig', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      class B extends Jig {
        f (a) { this.x = Object.assign({}, a.obj) }

        g (a) { this.y = [...a.arr] }

        h (a) {
          this.z = new Uint8Array(a.buf)
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).not.to.throw()
      expect(() => b.g(a)).not.to.throw()
      expect(() => b.h(a)).not.to.throw()
    })
    */
  })
})

// ------------------------------------------------------------------------------------------------
