/**
 * call.js
 *
 * Tests for the call action
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, LocalCache } = Run
const { expectTx } = require('../env/misc')

// ------------------------------------------------------------------------------------------------
// Call
// ------------------------------------------------------------------------------------------------

describe('Call', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // Code
  // --------------------------------------------------------------------------

  describe('Code', () => {
    it('calls static get method on jig', async () => {
      const run = new Run()
      class A extends Jig { static f (x) { return 123 + x } }
      const C = run.deploy(A)
      await C.sync()
      const location = C.location
      expect(C.f(1)).to.equal(124)
      expect(C.origin).to.equal(C.location)
      expect(C.location).to.equal(location)
    })

    // ------------------------------------------------------------------------

    it('calls static set method on jig', async () => {
      const run = new Run()

      class A extends Jig { static f (x) { this.x = x } }
      const C = run.deploy(A)
      await C.sync()

      function test (C2) {
        expect(C2.location).not.to.equal(C2.origin)
        expect(C.location).to.equal(C2.location)
        expect(C.x).to.equal(C2.x)
      }

      C.f(1)
      expect(C.x).to.equal(1)
      await C.sync()
      test(C)

      const C2 = await run.load(C.location)
      test(C2)

      run.cache = new LocalCache()
      const C3 = await run.load(C.location)
      test(C3)
    })

    // ------------------------------------------------------------------------

    it('can only call static methods on class they are from', async () => {
      const run = new Run()

      class A extends Jig {
        static f () { this.calledF = 'a' }
        static g () { this.calledG = 'a' }
      }

      class B extends A {
        static g () { this.calledG = 'b' }
        static h () { this.calledH = 'b' }
      }

      const CA = run.deploy(A)
      await CA.sync()

      const CB = run.deploy(B)
      await CB.sync()

      CA.f()
      CA.g()
      await CA.sync()
      expect(Object.getOwnPropertyDescriptor(CA, 'calledF').value).to.equal('a')
      expect(Object.getOwnPropertyDescriptor(CA, 'calledG').value).to.equal('a')

      CB.g()
      CB.h()
      expect(Object.getOwnPropertyDescriptor(CB, 'calledG').value).to.equal('b')
      expect(Object.getOwnPropertyDescriptor(CB, 'calledH').value).to.equal('b')

      expect(() => CA.g.apply(CB, [])).to.throw('Cannot call g on B')
    })

    // ------------------------------------------------------------------------

    it('throws for unsupported args', () => {
      const run = new Run()
      class A extends Jig { static f () { } }
      const C = run.deploy(A)
      expect(() => C.f(Symbol.hasInstance)).to.throw('Cannot clone')
    })
  })

  // --------------------------------------------------------------------------
  // Static Code
  // --------------------------------------------------------------------------

  describe('Static Code', () => {
    it('calls method with passthrough and without this on arbitrary code', async () => {
      const run = new Run()

      class A {
        static f (x) {
          if (x !== Symbol.hasInstance) throw new Error()
          if (this) throw new Error()
          return Symbol.iterator
        }
      }

      function test (C2) {
        expect(C2.f(Symbol.hasInstance)).to.equal(Symbol.iterator)
      }

      const C = run.deploy(A)
      await C.sync()
      test(C)

      const C2 = await run.load(C.location)
      test(C2)

      run.cache = new LocalCache()
      const C3 = await run.load(C.location)
      test(C3)
    })
  })

  // --------------------------------------------------------------------------
  // Jig
  // --------------------------------------------------------------------------

  describe('Jig', () => {
    it('should update basic jig', async () => {
      const run = new Run()
      class Sword extends Jig {
        upgrade () { this.upgrades = (this.upgrades || 0) + 1 }
      }
      const sword = new Sword()
      await sword.sync()

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
              'upgrade',
              []
            ]
          }
        ]
      })

      function test (sword) {
        expect(sword.upgrades).to.equal(1)
      }

      sword.upgrade()
      await sword.sync()
      test(sword)

      const sword2 = await run.load(sword.location)
      test(sword2)

      run.cache = new LocalCache()
      const sword3 = await run.load(sword.location)
      test(sword3)
    })

    // ------------------------------------------------------------------------

    it('adds class references for each super call', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { h () { return 1 } }
      class B extends A { g () { return super.h() + 2 } }
      class C extends B { f () { return super.g() + 3 } }
      const c = new C()
      await c.sync()

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
              []
            ]
          }
        ]
      })

      c.f()
      await c.sync()
    })

    // ------------------------------------------------------------------------

    it('should support passing null in args', async () => {
      const run = new Run()
      class Dragon extends Jig {
        init (lair) {
          this.lair = lair
        }
      }
      await run.deploy(Dragon).sync()

      expectTx({
        nin: 0,
        nref: 1,
        nout: 1,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'NEW',
            data: [
              { $jig: 0 },
              [null]
            ]
          }
        ]
      })

      const dragon = new Dragon(null)
      await dragon.sync()

      run.cache = new LocalCache()
      const dragon2 = await run.load(dragon.location)

      expect(dragon).to.deep.equal(dragon2)
    })

    // ------------------------------------------------------------------------

    it('swap inner jigs', async () => {
      const run = new Run()
      class A extends Jig {
        init (name) { this.name = name }
        setX (a) { this.x = a }

        setY (a) { this.y = a }

        swapXY () { const t = this.x; this.x = this.y; this.y = t }
      }
      const a = new A('a')
      const b = new A('b')
      const c = new A('c')
      a.setX(b)
      a.setY(c)
      a.swapXY()

      function test (a) {
        expect(a.x).not.to.equal(a.y)
        expect(a.x.name).to.equal('c')
        expect(a.y.name).to.equal('b')
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

    it('restores old state if method throws', () => {
      new Run() // eslint-disable-line
      class Outer extends Jig { setN () { this.n = 1 } }
      class Inner extends Jig { setZ () { this.z = 1 } }
      class Revertable extends Jig {
        init () {
          this.n = 1
          this.arr = ['a', { b: 1 }]
          this.self = this
          this.inner = new Inner()
        }

        methodThatThrows (outer) {
          outer.setN()
          this.n = 2
          this.arr[1].b = 2
          this.arr.push(3)
          this.inner.setZ()
          throw new Error('an error')
        }
      }
      Revertable.deps = { Inner }
      const main = new Revertable()
      const outer = new Outer()
      expect(() => main.methodThatThrows(outer)).to.throw()
      expect(main.n).to.equal(1)
      expect(main.arr).to.deep.equal(['a', { b: 1 }])
      expect(main.self).to.equal(main)
      expect(main.inner.z).to.equal(undefined)
      expect(outer.n).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('throws if swallow internal errors', () => {
      new Run() // eslint-disable-line
      class B extends Jig { init () { throw new Error('some error message') } }
      class A extends Jig { f () { try { return new B() } catch (e) { } } }
      A.deps = { B }
      const a = new A()
      expect(() => a.f()).to.throw('some error message')
    })

    // ------------------------------------------------------------------------

    it('call super', async () => {
      const run = new Run()
      class A extends Jig { h () { this.a = true } }
      class B extends A { g () { super.h(); this.b = true } }
      class C extends B { f () { super.g(); this.c = true } }

      function test (c) {
        expect(c.a).to.equal(true)
        expect(c.b).to.equal(true)
        expect(c.c).to.equal(true)
      }

      const c = new C()
      c.f()
      test(c)
      await c.sync()

      const c2 = await run.load(c.location)
      test(c2)

      run.cache = new LocalCache()
      const c3 = await run.load(c.location)
      test(c3)
    })

    // ------------------------------------------------------------------------

    it('call static helper', async () => {
      const run = new Run()
      class Preconditions { static checkArgument (b) { if (!b) throw new Error() } }
      class A extends Jig { set (n) { $.checkArgument(n > 0); this.n = n } } // eslint-disable-line
      A.deps = { $: Preconditions }
      const a = new A()
      expect(() => a.set(0)).to.throw()
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
              'set',
              [1]
            ]
          }
        ]
      })
      a.set(1)
      await a.sync()
      await run.load(a.location)
      run.cache = new LocalCache()
      await run.load(a.location)
    })

    // ------------------------------------------------------------------------

    it('throws if set directly on another jig', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        setB (b) { this.b = b }
        g () { this.b.n = 1 }
      }
      class B extends Jig {
        setA (a) { this.a = a }
        f () { this.a.g() }
      }
      const a = new A()
      const b = new B()
      a.setB(b)
      b.setA(a)
      expect(() => b.f()).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('throws if async', async () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        async f () {}
        g () { return new Promise((resolve, reject) => { }) }
      }
      const a = new A()
      expect(() => a.f()).to.throw('Async methods not supported')
      expect(() => a.g()).to.throw('Async methods not supported')
    })

    // ------------------------------------------------------------------------

    it('throws if modify return value values', async () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        f () {
          const x = { }
          this.x = x
          return x
        }
      }
      const a = new A()
      const error = 'Updates must be performed in the jig\'s methods'
      expect(() => { a.f().n = 1 }).to.throw(error)
      class B extends Jig {
        f (a) { a.f().n = 1 }
      }
      const b = new B()
      expect(() => b.f(a)).to.throw(error)
    })
  })
})

// ------------------------------------------------------------------------------------------------
