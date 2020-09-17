/**
 * unify.js
 *
 * Tests for unify and auto-unification
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { expectTx } = require('../env/misc')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Unify
// ------------------------------------------------------------------------------------------------

describe('Unify', () => {
  // ------------------------------------------------------------------------

  it('autounifies', async () => {
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
})

// --------------------------------------------------------------------------
// Unify worldview
// --------------------------------------------------------------------------

describe('Unify worldview', () => {
  it('unifies jigs', async () => {
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

  it('unifies code', async () => {
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

  it('unifies jigs in maps', async () => {
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

  it('autounifies', async () => {
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
    const C2 = run.deploy(C)
    expect(C2.CA1).to.equal(C2.CA2)
    expect(C2.CA1.location).not.to.equal(C2.CA2.origin)
  })
  it('autounifies from upgrade', async () => {
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
})

// ------------------------------------------------------------------------------------------------
