/**
 * unify.js
 *
 * Tests for unify and auto-unification
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { expectTx } = require('../env/misc')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Unify
// ------------------------------------------------------------------------------------------------

describe('Unify', () => {
  // --------------------------------------------------------------------------
  // autounify
  // --------------------------------------------------------------------------

  describe('autounify', () => {
    it('args with each other', async () => {
      const run = new Run()
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      await a.sync()
      const a2 = await run.load(a.origin)
      a2.set(1)
      a2.constructor.auth()
      await a2.sync()
      const b = new A()
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
            data: [{ $jig: 0 }, 'set', [{ $jig: 1 }, { $dup: ['2', '0'] }]]
          }
        ]
      })

      b.set(a, a2)

      function test (b) {
        expect(b.x[0]).to.equal(b.x[1])
      }

      await b.sync()
      test(b)

      const b2 = await run.load(b.location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(b.location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('arg with jig property', async () => {
      const run = new Run()
      class A extends Jig { update () { this.n = 1 } }
      class B extends Jig {
        setX (x) { this.x = x }
        setY (y) { this.y = y }
      }

      function test (b) { expect(b.x.constructor).to.equal(b.y.constructor) }

      const a1 = new A()
      const b = new B()
      b.setX(a1)
      await a1.sync()
      const a2 = await run.load(a1.location)
      a2.update()
      await a2.sync()
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
            data: [{ $jig: 0 }, 'setY', [{ $jig: 1 }]]
          }
        ]
      })

      b.setY(a2)
      await b.sync()
      test(b)

      const b2 = await run.load(b.location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(b.location)
      test(b3)
    })

    // ------------------------------------------------------------------------

    it('arg with code property', async () => {
      const run = new Run()
      class A extends Jig { static set (n) { this.n = n } }
      const CA = run.deploy(A)
      await CA.sync()
      const CA2 = await run.load(CA.location)
      CA2.set(1)
      await CA2.sync()
      class B extends Jig { static set (Y) { this.Y = Y } }
      B.X = CA
      const CB = run.deploy(B)
      await CB.sync()

      function test (CB) { expect(CB.X).to.equal(CB.Y) }

      CB.set(CA2)
      await CB.sync()
      test(CB)

      const CB2 = await run.load(CB.location)
      test(CB2)

      run.cache = new LocalCache()
      const CB3 = await run.load(CB.location)
      test(CB3)
    })

    // ------------------------------------------------------------------------

    it.skip('deps with args', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('arg with inner upgraded code property', async () => {
      const run = new Run()
      function f () { return 1 }
      function g () { return 2 }
      const cg = run.deploy(f)
      cg.upgrade(g)
      await cg.sync()
      const cf = await run.load(cg.origin)
      class A extends Jig {
        init () { this.m = new Map() }
        setX (x) { this.m.set('x', x) }
        setY (y) { this.m.set('y', y) }
      }
      const a = new A()
      a.setX(cf)
      await a.sync()

      function test (a) { expect(a.m.get('x')).to.equal(a.m.get('y')) }

      a.setY(cg)
      await a.sync()
      test(a)

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('jig args in constructor', async () => {
      const run = new Run()

      class A extends Jig {
        init (n) { this.n = 1 }
        f () { return this.n }
      }

      const CA = run.deploy(A)
      CA.auth()
      await CA.sync()

      const CO = await run.load(CA.origin)
      expect(CA.location).not.to.equal(CO.location)

      const a = new CA()
      const b = new CO()

      class C extends Jig { init (a, b) { this.n = a.f() + b.f() } }
      new C(a, b) // eslint-disable-line
    })

    // ------------------------------------------------------------------------

    it('jig calling method with updated class arg with newer method', async () => {
      const run = new Run()

      const A = run.deploy(class A extends Jig { set (b) { this.b = b } })
      const a = new A()
      await A.sync()

      const B = await run.load(A.location)
      B.upgrade(class B extends Jig { set (b) { this.b = b; this.bset = true } })
      const b = new B()

      function test (a) {
        expect(a.constructor).to.equal(a.b.constructor)
        expect(a.bset).to.equal(true)
      }

      a.set(b)
      await a.sync()
      test(a)

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('code calling method with upgraded parent class in args', async () => {
      const run = new Run()
      class A extends Jig { f () { this.n = 1 } }
      class A2 extends Jig { f () { this.n = 2 } }
      const CA = run.deploy(A)
      class B extends CA { }
      run.deploy(B)
      await run.sync()
      const CA2 = await run.load(CA.location)
      const b = new B()
      CA2.upgrade(A2)
      await run.sync()
      expect(Object.getPrototypeOf(b.constructor).name).to.equal('A')
      b.f(CA2)
      expect(Object.getPrototypeOf(b.constructor).name).to.equal('A2')
      expect(b.n).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('jig calling method with upgraded dep in args', async () => {
      const run = new Run()

      class B { static f () { return 1 } }
      class B2 { static f () { return 2 } }
      const CB = run.deploy(B)
      await run.sync()

      const CB2 = await run.load(CB.location)
      CB2.upgrade(B2)
      await run.sync()

      class A extends Jig { f () { return B.f() } }
      A.deps = { B: CB }

      const a = new A()
      expect(a.f()).to.equal(1)
      expect(a.f(CB2)).to.equal(2)
      expect(a.f()).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('throws when jig calling method with upgraded class arg and removed method', async () => {
      const run = new Run()

      const A = run.deploy(class A extends Jig { set (b) { this.b = b } })
      const a = new A()
      await A.sync()

      const B = await run.load(A.location)
      B.upgrade(class B extends Jig { set2 (b) { this.b = b } })
      const b = new B()

      function test (a) {
        expect(() => a.set(b)).to.throw('Cannot call set on [jig B]')
        expect(a.constructor).to.equal(b.constructor)
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

    it('throws when code calling method with upgraded parent and removed method', async () => {
      const run = new Run()

      class P extends Jig { static set (b) { this.b = b } }
      class P2 extends Jig { }
      class A extends P { static set (b) { super.set(b) } }

      const CP = run.deploy(P)
      const CA = run.deploy(A)
      await run.sync()
      const CA2 = await run.load(CA.location)

      CP.upgrade(P2)
      await run.sync()

      CA2.set(1) // No error
      await run.sync()

      function test (CA) { expect(() => CA.set(CP)).to.throw() }
      test(CA2)

      const CA3 = await run.load(CA.location)
      test(CA3)

      run.cache = new LocalCache()
      const CA4 = await run.load(CA.location)
      test(CA4)
    })

    // ------------------------------------------------------------------------

    it('throws when jig instance calling method with upgraded parent class and removed method', async () => {
      const run = new Run()

      class P extends Jig { set (b) { this.b = b } }
      class P2 extends Jig { }
      class A extends P { set (b) { super.set(b) } }

      const a = new A()
      a.set(1) // No error

      await run.sync()

      const CP = await run.load(P.location)
      CP.upgrade(P2)

      function test (a) { expect(() => a.set({ CP })).to.throw() }
      test(a)

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('deploy props', async () => {
      const run = new Run()

      class A { }
      class B { }
      const CA = run.deploy(A)
      CA.upgrade(B)
      await run.sync()

      const CA2 = await run.load(CA.origin)
      class C { }
      C.CA1 = CA
      C.CA2 = CA2

      function test (C2) {
        expect(C2.CA1).to.equal(C2.CA2)
        expect(C2.CA1.location).not.to.equal(C2.CA2.origin)
      }

      const C2 = run.deploy(C)
      test(C2)
      await C2.sync()

      const C3 = await run.load(C2.location)
      test(C3)

      run.cache = new LocalCache()
      const C4 = await run.load(C2.location)
      test(C4)
    })

    // ------------------------------------------------------------------------

    it('upgrade props', async () => {
      const run = new Run()

      const X1 = run.deploy(class X extends Jig { })
      await X1.sync()
      const X2 = await run.load(X1.location)
      X2.auth()

      class A { }
      class B { }
      B.arr = [X1, X2]
      const CA = run.deploy(A)
      CA.upgrade(B)
      await run.sync()

      function test (C) {
        expect(C.arr[0]).to.equal(C.arr[1])
        expect(C.arr[0].location).not.to.equal(C.arr[1].origin)
      }

      test(CA)
      await CA.sync()

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })
  })

  // --------------------------------------------------------------------------
  // autounify disabled
  // --------------------------------------------------------------------------

  describe('autounify disabled', () => {
    it('throws if deploy with inconsistent props', async () => {
      const run = new Run()

      const A2 = run.deploy(class A { })
      A2.destroy()
      await A2.sync()
      const A1 = await run.load(A2.origin)

      class B { }
      B.A1 = A1
      B.A2 = A2

      run.autounify = false
      expect(() => run.deploy(B)).to.throw('Inconsistent worldview')

      run.uninstall(B)
      run.autounify = true
      const B2 = run.deploy(B)
      await B2.sync()
    })

    // ------------------------------------------------------------------------

    it('throws if upgrade with inconsistent props', async () => {
      const run = new Run()

      class A extends Jig { update () { this.n = 1 } }
      const a2 = new A()
      a2.update()
      await a2.sync()
      const a1 = await run.load(a2.origin)

      const B = run.deploy(class B { })

      class C { }
      C.set = new Set([a1, a2])
      run.autounify = false
      expect(() => B.upgrade(C)).to.throw('Inconsistent worldview')

      run.autounify = true
      B.upgrade(C)
      await run.sync()
    })

    // ------------------------------------------------------------------------

    it('throws if call method with inconsitent arg and jig property', async () => {
      const run = new Run()

      class A extends Jig { }
      const a = new A()
      await a.sync()
      const a2 = await run.load(a.location)
      a2.destroy()

      class B extends Jig {
        init (a) { this.a = a }
        f (a2) { this.a2 = a2 }
      }

      const b = new B(a)
      await b.sync({ inner: false })
      run.autounify = false
      b.f(a2)
      await expect(b.sync()).to.be.rejectedWith('Inconsistent worldview')

      run.autounify = true
      b.f(a2)
      await b.sync()
    })

    // ------------------------------------------------------------------------

    it('throws if call method with two inconsistent class args', async () => {
      const run = new Run()

      class A extends Jig {
        init (n) { this.n = n }
        getN () { return this.n }
      }

      const a = new A(1)
      await a.sync()

      const A2 = await run.load(A.location)
      A2.auth()
      const b = new A2(2)
      await b.sync()

      expect(a.constructor.origin).to.equal(b.constructor.origin)
      expect(a.constructor.location).not.to.equal(b.constructor.location)

      class C extends Jig { set (a, b) { this.an = a.getN(); this.bn = b.getN() } }
      const c = new C()

      run.autounify = false
      expect(() => c.set(a, b)).to.throw('Inconsistent worldview')

      run.autounify = true
      c.set(a, b)
    })

    // ------------------------------------------------------------------------

    it('throws if time travel during publish', async () => {
      const run = new Run()

      class A extends Jig {
        init (n) { this.n = n }
        getN () { return this.n }
      }

      const a = new A(1)
      await a.sync()

      const A2 = await run.load(A.location)
      A2.auth()
      const b = new A2(2)
      await b.sync()

      expect(a.constructor.origin).to.equal(b.constructor.origin)
      expect(a.constructor.location).not.to.equal(b.constructor.location)

      class C extends Jig { set (a, b) { this.an = a.getN(); this.bn = b.n } }
      const c = new C()
      run.autounify = false
      c.set(a, b)
      await expect(c.sync()).to.be.rejectedWith('Time travel for A')
    })

    // ------------------------------------------------------------------------

    it('throws if time travel during export', async () => {
      const run = new Run()

      const A = run.deploy(class A extends Jig { })
      await A.sync()
      const A2 = await run.load(A.location)
      A2.auth()

      class B extends Jig { static set (A) { this.name = A.name } }
      B.A = A2
      const B2 = run.deploy(B)
      await run.sync()

      run.autounify = false
      const transaction = new Run.Transaction()
      transaction.update(() => B2.set(A))
      await expect(transaction.export()).to.be.rejectedWith('Time travel for A')
      transaction.rollback()

      run.autounify = true
      const transaction2 = new Run.Transaction()
      transaction2.update(() => B2.set(A))
      await transaction2.export()
    })

    // ------------------------------------------------------------------------

    // This is allowed references alone are not reads
    it('allows inconsistent sets of jigs', async () => {
      const run = new Run()

      class A extends Jig { }
      const a = new A()
      await a.sync()

      const A2 = await run.load(A.location)
      A2.auth()
      const b = new A2()
      await b.sync()

      expect(a.constructor.origin).to.equal(b.constructor.origin)
      expect(a.constructor.location).not.to.equal(b.constructor.location)

      class C extends Jig { set (a, b) { this.a = a; this.b = b } }
      const c = new C()
      run.autounify = false
      c.set(a, b)
    })

    // ------------------------------------------------------------------------

    it.skip('throws if method time travel', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if parent method time travel', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // inconsistent transaction
  // --------------------------------------------------------------------------

  describe('inconsistent transaction', () => {
    it('throws if create inconsistent jig classes', async () => {
      const run = new Run()

      const A2 = run.deploy(class A extends Jig { })
      A2.destroy()
      await A2.sync()
      const A1 = await run.load(A2.origin)

      const transaction = new Run.Transaction()

      expect(() => transaction.update(() => {
        new A1() // eslint-disable-line
        new A2() // eslint-disable-line
      })).to.throw('Inconsistent worldview')
    })

    // ------------------------------------------------------------------------

    it('throws if create inconsistent base jig classes', async () => {
      const run = new Run()

      const A2 = run.deploy(class A extends Jig { })
      A2.destroy()
      await A2.sync()
      const A1 = await run.load(A2.origin)

      class B extends A1 { }
      class C extends A2 { }

      const transaction = new Run.Transaction()

      expect(() => transaction.update(() => {
        new B() // eslint-disable-line
        new C() // eslint-disable-line
      })).to.throw('Inconsistent worldview')
    })

    // ------------------------------------------------------------------------

    it('throws if deploy inconsistent props', async () => {
      const run = new Run()

      class A extends Jig { }
      const a2 = new A()
      a2.auth()
      await a2.sync()
      const a1 = await run.load(a2.origin)

      class B { }
      B.a = a1

      class C { }
      C.a = a2

      const transaction = new Run.Transaction()

      expect(() => transaction.update(() => {
        run.deploy(B)
        run.deploy(C)
      })).to.throw('Inconsistent worldview')
    })

    // ------------------------------------------------------------------------

    it.skip('throws if call methods with inconsistent args', async () => {
      const run = new Run()

      class A extends Jig { }
      A.sealed = false
      const A2 = run.deploy(A)
      A2.destroy()
      await A2.sync()
      const A1 = await run.load(A2.origin)

      class B extends A1 { }
      class C extends Jig { }

      const transaction = new Run.Transaction()

      transaction.update(() => {
        new B() // eslint-disable-line
        new C(A2) // eslint-disable-line
      })

      await transaction.publish()
    })
  })

  // --------------------------------------------------------------------------
  // unify
  // --------------------------------------------------------------------------

  describe('unify', () => {
    // unifies props
    // unifies classes
    // throws if unify inconsistent top-level jigs
  })
})

// ------------------------------------------------------------------------------------------------
