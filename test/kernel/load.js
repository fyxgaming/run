/**
 * load.js
 *
 * Tests for load functionality.
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig } = Run
const { LocalCache } = Run.plugins

// ------------------------------------------------------------------------------------------------
// Load
// ------------------------------------------------------------------------------------------------

describe('Load', () => {
  it('mixture of cached and replay with parent property', async () => {
    // A very particular test for a particular key ordering bug

    let run = new Run()

    class A { }
    A.n = 1
    run.deploy(A)

    const B = run.deploy(class B extends A { })
    await B.sync()
    const middleLocation = B.location

    run.deploy(class C extends B { })
    await run.sync()

    run.deactivate()
    run = new Run({ blockchain: run.blockchain })
    const B2 = await run.load(middleLocation)
    await B2.sync()
  })

  // --------------------------------------------------------------------------

  it('throws if location has query params', async () => {
    const run = new Run()
    const A = run.deploy(class A extends Jig { })
    await run.sync()
    await expect(run.load(`${A.location}?version=${Run.protocol}`)).to.be.rejectedWith('Bad location')
    const HASH = '0000000000000000000000000000000000000000000000000000000000000000'
    await expect(run.load(`${A.location}?hash=${HASH}`)).to.be.rejectedWith('Bad location')
  })
})

// ------------------------------------------------------------------------------------------------
// Client mode
// ------------------------------------------------------------------------------------------------

describe('Client mode', () => {
  it('loads from state cache', async () => {
    const run = new Run()
    run.client = false
    class A extends Jig { }
    class B extends A { }
    class C { }
    const b = new B(C)
    await run.sync()
    run.client = true
    await run.load(b.location)
  })

  // --------------------------------------------------------------------------

  it('throws if not in state cache', async () => {
    const run = new Run()
    run.client = false
    class A extends Jig { }
    class B extends A { }
    class C { }
    const b = new B(C)
    await run.sync()
    run.client = true
    run.cache = new LocalCache()
    await expect(run.load(b.location)).to.be.rejectedWith(`Cannot load ${b.location}\n\nOnly cached jigs may be loaded in client mode`)
  })

  // --------------------------------------------------------------------------

  it('manual import is ok', async () => {
    const run = new Run()
    run.client = false
    class A extends Jig { }
    class B extends A { }
    class C { }
    const b = new B(C)
    await run.sync()
    run.client = true
    run.cache = new LocalCache()
    const rawtx = await run.blockchain.fetch(b.location.slice(0, 64))
    await run.import(rawtx)
  })
})

// ------------------------------------------------------------------------------------------------
/*
  describe('load', () => {
    it('load single jig', async () => {
      const run = createHookedRun()
      class A extends Jig { f (n) { this.n = n }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      a.f([2])
      expectAction(a, 'f', [[2]], [a], [a], [])
      a.f({ n: 3 })
      expectAction(a, 'f', [{ n: 3 }], [a], [a], [])
      await a.sync()
      const a2 = await run.load(a.location)
      expect(a2.n.n).to.equal(3)
    })

    it('load older state', async () => {
      const run = createHookedRun()
      class A extends Jig { f (n) { this.n = n }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      await a.sync()
      const location1 = a.location
      a.f(2)
      expectAction(a, 'f', [2], [a], [a], [])
      await a.sync()
      const a2 = await run.load(location1)
      expect(a2.n).to.equal(1)
    })

    it('throws if location is bad', async () => {
      const run = createHookedRun()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expectAction(a, 'init', [], [], [a], [])
      await expect(run.load(a.location.slice(0, 64) + '_o0')).to.be.rejected
      await expect(run.load(a.location.slice(0, 64) + '_o3')).to.be.rejected
    })

    it('load jig with multiple updates', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n }}
      class B extends Jig {
        init () { this.a = new A() }

        set (n) { this.n = n; this.a.set(n) }
      }
      B.deps = { A }
      const b = new B()
      expectAction(b, 'init', [], [], [b, b.a], [])
      b.set(2)
      expectAction(b, 'set', [2], [b, b.a], [b, b.a], [b])
      await run.sync()
      const b2 = await run.load(b.location)
      const a2 = await run.load(b.a.location)
      expect(b2.n).to.equal(2)
      expect(a2.n).to.equal(2)
    })

    it('load jigs that updated other jigs', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n }}
      class B extends Jig { set (n, a) { a.set(n) } }
      B.deps = { A }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.set(2, a)
      expectAction(b, 'set', [2, a], [b, a], [b, a], [])
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('arguments with different instances of the same jig location', async () => {
      const run = createHookedRun()
      class Num extends Jig { init (n) { this.n = n }}
      const a = new Num(10)
      await a.sync()
      expectAction(a, 'init', [10], [], [a], [])
      const a2 = await run.load(a.location)
      const a3 = await run.load(a.location)
      class Sum extends Jig { init (x, y) { this.n = x.n + y.n }}
      const sum = new Sum(a2, a3)
      expectAction(sum, 'init', [a2, a3], [], [sum], [a2, a3])
      await run.sync()
      expect(sum.n).to.equal(20)
    })

    it('throws if pass different locations of same jig as arguments', async () => {
      const run = createHookedRun()
      class A extends Jig { f (n) { this.n = n; return this }}
      const a = new A()
      await a.sync()
      expectAction(a, 'init', [], [], [a], [])
      await a.f(1).sync()
      expectAction(a, 'f', [1], [a], [a], [])
      const a2 = await run.load(a.location)
      await a2.f(2).sync()
      expectAction(a2, 'f', [2], [a2], [a2], [])
      class B extends Jig { init (x, y) { this.n = x.n + y.n }}
      expect(() => new B(a, a2)).to.throw()
    })

    it('load instances of extended classes', async () => {
      createHookedRun()
      class A extends Jig { }
      class B extends A { }
      const b = new B()
      await b.sync()
      expectAction(b, 'init', [], [], [b], [])
      const run2 = new Run()
      await run2.load(b.location)
    })

    it('read jigs as arguments', async () => {
      const run = createHookedRun()
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig { init (a) { this.n = a.n } }
      const a = new A(1)
      await a.sync()
      expectAction(a, 'init', [1], [], [a], [])
      const b = new B(a)
      await b.sync()
      expectAction(b, 'init', [a], [], [b], [a])
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(1)
    })

    it('add inner jigs to reads', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig {
        init (a) { this.a = a }

        apply () { this.n = this.a.n }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.set(1)
      expectAction(a, 'set', [1], [a], [a], [])
      const b = new B(a)
      await b.sync()
      expectAction(b, 'init', [a], [], [b], [])
      a.set(2)
      expectAction(a, 'set', [2], [a], [a], [])
      b.apply()
      expectAction(b, 'apply', [], [b], [b], [b, a])
      expect(b.n).to.equal(2)
      await b.sync()
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(2)
    })
  })
  */
