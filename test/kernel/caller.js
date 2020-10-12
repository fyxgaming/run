/**
 * caller.js
 *
 * Tests for the caller special property
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, LocalCache, Berry } = Run

// ------------------------------------------------------------------------------------------------
// Caller
// ------------------------------------------------------------------------------------------------

describe('Caller', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // ------------------------------------------------------------------------

  it('null externally', async () => {
    const run = new Run()
    class A extends Jig {
      init () { this.initCaller = caller }
      f () { this.fCaller = caller }
    }
    const a = new A()
    a.f()
    function test (a) {
      expect(a.initCaller).to.equal(null)
      expect(a.fCaller).to.equal(null)
    }
    test(a)
    await a.sync()
    const a2 = await run.load(a.location)
    test(a2)
    run.cache = new LocalCache()
    const a3 = await run.load(a.location)
    test(a3)
  })

  // --------------------------------------------------------------------------

  it('called from another jig', async () => {
    const run = new Run()
    class Parent extends Jig {
      init () { this.child = new Child(this) }
      f () { this.self = this.child.f(this) }
    }
    class Child extends Jig {
      init () { this.initCaller = caller }
      f () { this.fCaller = caller }
    }
    Parent.deps = { Child }
    const parent = new Parent()
    parent.f()
    function test (parent) {
      expect(parent.child.initCaller).to.equal(parent)
      expect(parent.child.fCaller).to.equal(parent)
    }
    test(parent)
    await run.sync()
    const parent2 = await run.load(parent.location)
    test(parent2)
    run.cache = new LocalCache()
    const parent3 = await run.load(parent.location)
    test(parent3)
  })

  // --------------------------------------------------------------------------

  it('called in a hierarchy', async () => {
    const run = new Run()
    class A extends Jig { init () { B.f() } }
    class B extends Jig { static f () { this.c = new C() } }
    class C extends Jig { init () { this.initCaller = caller } }
    A.deps = { B }
    B.deps = { C }
    const CB = run.deploy(B)
    const a = new A()
    await a.sync()
    function test (B) { expect(B.c.initCaller).to.equal(B) }
    test(CB)
    const CB2 = await run.load(CB.location)
    test(CB2)
    run.cache = new LocalCache()
    const CB3 = await run.load(CB.location)
    test(CB3)
  })

  // --------------------------------------------------------------------------

  it('caller is this', async () => {
    const run = new Run()
    class A extends Jig {
      init () { this.f() }
      f () { this.caller = caller }
    }
    const a = new A()
    await a.sync()
    function test (a) { expect(a.caller).to.equal(a) }
    test(a)
    const a2 = await run.load(a.location)
    test(a2)
    run.cache = new LocalCache()
    const a3 = await run.load(a.location)
    test(a3)
  })

  // --------------------------------------------------------------------------

  it('call method on caller', async () => {
    const run = new Run()
    class A extends Jig {
      set (n) { this.n = n }
      apply (b) { b.apply() }
    }
    class B extends Jig { apply () { caller.set(1) } }
    const a = new A()
    const b = new B()
    a.apply(b)
    function test (a) { expect(a.n).to.equal(1) }
    test(a)
    await run.sync()
    const a2 = await run.load(a.location)
    test(a2)
    run.cache = new LocalCache()
    const a3 = await run.load(a.location)
    test(a3)
  })

  // --------------------------------------------------------------------------

  it('local variable named caller', async () => {
    const run = new Run()
    class A extends Jig { init () { const caller = 2; this.n = caller } }
    const a = new A()
    await a.sync()
    function test (a) { expect(a.n).to.equal(2) }
    test(a)
    const a2 = await run.load(a.location)
    test(a2)
    run.cache = new LocalCache()
    const a3 = await run.load(a.location)
    test(a3)
  })

  // --------------------------------------------------------------------------

  it('dependency named caller', async () => {
    const run = new Run()
    function caller () { return 2 }
    class A extends Jig { static f () { this.n = caller() } }
    A.deps = { caller }
    const CA = run.deploy(A)
    CA.f()
    await CA.sync()
    function test (CA) { expect(CA.n).to.equal(2) }
    test(CA)
    const CA2 = await run.load(CA.location)
    test(CA2)
    run.cache = new LocalCache()
    const CA3 = await run.load(CA.location)
    test(CA3)
  })

  // --------------------------------------------------------------------------

  it('throws if set caller', () => {
    new Run() // eslint-disable-line
    class A extends Jig { init () { caller = 1 } } // eslint-disable-line
    expect(() => new A()).to.throw('Cannot set caller')
  })

  // ------------------------------------------------------------------------

  it('berry caller is null in pluck', async () => {
    const run = new Run()
    class B extends Berry {
      static async pluck () { return new B(caller) }
      init (c) { this.c = c }
    }
    const CB = run.deploy(B)
    await CB.sync()
    const b = await run.load('abc', { berry: CB })
    expect(b.c).to.equal(null)
  })

  // ------------------------------------------------------------------------

  it('berry caller is null in init', async () => {
    const run = new Run()
    class B extends Berry { init (c) { this.c = caller } }
    const CB = run.deploy(B)
    await CB.sync()
    const b = await run.load('abc', { berry: CB })
    expect(b.c).to.equal(null)
  })

  // ------------------------------------------------------------------------

  it.skip('berry caller is null in load', () => {
    // TODO
  })

  // ------------------------------------------------------------------------

  it.skip('berry caller is calling jig from a jig', () => {
    // TODO
  })

  // ------------------------------------------------------------------------

  it.skip('berry caller is null from external', () => {
    // TODO
  })

  // ------------------------------------------------------------------------

  it.skip('berry caller is null from static code', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
