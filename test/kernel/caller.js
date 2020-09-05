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

  it.only('called in a hierarchy', async () => {
    const run = new Run()
    class A extends Jig { init () { B.f() } }
    class B extends Jig { static f () { this.c = new C() } }
    class C extends Jig { init () { this.initCaller = caller } }
    A.deps = { B }
    B.deps = { C }
    const a = new A()
    function test (a) { expect(a.deps.B.c.initCaller).to.equal(a.deps.B) }
    test(a)
    const a2 = await run.load(a.location)
    test(a2)
    run.cache = new LocalCache()
    const a3 = await run.load(a.location)
    test(a3)
  })

/*
    it('should support caller being this', async () => {
      const run = createHookedRun()
      class A extends Jig {
        init () { this.f() }
        f () { this.caller = caller }
      }
      const a = new A()
      await a.sync()
      expect(a.caller).to.equal(a)
      const a2 = await run.load(a.location)
      expect(a2.caller).to.equal(a2)
    })

    it('should support calling a method on the caller', async () => {
      const run = createHookedRun()
      class A extends Jig {
        set (n) { this.n = n }
        apply (b) { b.apply() }
      }
      class B extends Jig { apply () { caller.set(1) } }
      const a = new A()
      const b = new B()
      a.apply(b)
      expect(a.n).to.equal(1)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(1)
    })

    it('should allow local variables named caller', async () => {
      const run = createHookedRun()
      class A extends Jig { init () { const caller = 2; this.n = caller } }
      const a = new A()
      await a.sync()
      expect(a.n).to.equal(2)
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should allow dependencies named caller', async () => {
      const run = createHookedRun()
      function caller () { return 2 }
      class A extends Jig { init () { this.n = caller() } }
      A.deps = { caller }
      const a = new A()
      await a.sync()
      expect(a.n).to.equal(2)
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should throw if set caller', () => {
      createHookedRun()
      class A extends Jig { init () { caller = 1 } } // eslint-disable-line
      expect(() => new A()).to.throw('Cannot set caller')
    })
  */
})

// ------------------------------------------------------------------------------------------------
