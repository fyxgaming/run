/**
 * jig.js
 *
 * Tests for lib/kernel/jig.js
 */

const { describe, it, afterEach } = require('mocha')
const Run = require('../env/run')
const { expectTx } = require('../env/misc')
const { expect } = require('chai')
const { Jig, LocalCache } = Run

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
    it('should match basic jigs', async () => {
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

    it('should match class extensions', async () => {
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

    it('should not match non-instances', () => {
      new Run() // eslint-disable-line
      expect(new class { }()).not.to.be.instanceOf(Jig)
      expect(new class { }() instanceof Jig).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('should match loaded jigs', async () => {
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

    it('should not match prototypes', () => {
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

  // METHODS
  // TODO
  describe('Method', () => {
    it('adds class references for each super call', () => {
      // TODO
      // in method, not init
    })
  })
})

// ------------------------------------------------------------------------------------------------
