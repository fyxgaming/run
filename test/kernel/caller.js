/**
 * caller.js
 *
 * Tests for the caller special property
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Caller
// ------------------------------------------------------------------------------------------------

describe('Caller', () => {
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

  it.skip('called in a hierarchy', async () => {
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
    console.log(CB)
    console.log(B)
    test(CB)
    const CB2 = await run.load(B.location)
    test(CB2)
    run.cache = new LocalCache()
    const CB3 = await run.load(B.location)
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

  it.skip('dependency named caller', async () => {
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

  it('should throw if set caller', () => {
      new Run() // eslint-disable-line
      class A extends Jig { init () { caller = 1 } } // eslint-disable-line
    expect(() => new A()).to.throw('Cannot set caller')
  })
})

// ------------------------------------------------------------------------------------------------
