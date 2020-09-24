/**
 * caller.js
 *
 * Tests for the caller special property
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Caller
// ------------------------------------------------------------------------------------------------

describe('Caller', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // ------------------------------------------------------------------------

  it('subjig test', async () => {
    const run = new Run()

    class Child extends Jig {
      static createSubChild(SubChild) { this.SubSub = SubChild }
    }

    class SubChild { }

    const Child2 = run.deploy(Child)

    class Parent extends Jig { }
    Parent.Child = Child2

    const Parent2 = run.deploy(Parent)

    await run.sync()

    Child2.createSubChild(Parent)

    await run.sync()



    const Parent3 = await run.load(Parent2.location)
    const Child3 = await run.load(Child2.location)

    await Parent3.sync()
    await Child3.sync()

    run.cache = new LocalCache()
    const Parent4 = await run.load(Parent2.location)
    const Child4 = await run.load(Child2.location)

    await Parent4.sync()
    await Child4.sync()
  })

  it('subjig test 2', async () => {
    const run = new Run({ network: 'test', trust: [] })


    const loc = '9e67c9645024b3f3ebbc8afe41fe0d89fe44d0a3b51ba1cc352306dd82450365_o1'

    const txid = '9e67c9645024b3f3ebbc8afe41fe0d89fe44d0a3b51ba1cc352306dd824503651'
    const txid2 = '9c96c00386eb22547539c92b33fe30e3d69e3268ae820e877af5dce94e1b901f'
    const txid3 = 'f5100ad6091ae7e4459179376da4046905762bea25e2bad056cecd76bf5291a6'

    // const trust = [
      // txid, txid2, txid
    // ]

    console.log(JSON.stringify(run.payload(await run.blockchain.fetch(txid)), 0, 3))
    console.log(JSON.stringify(run.payload(await run.blockchain.fetch(txid2)), 0, 3))
    console.log(JSON.stringify(run.payload(await run.blockchain.fetch(txid3)), 0, 3))

    // run.trust(txid)
    // run.trust(txid2)
    run.trust(txid3)

    // await run.load(txid3 + '_o1')

    const X = await run.load(loc)


    await X.sync()
  })

  // ------------------------------------------------------------------------

  it.only('subjig test 3', async () => {
    const run = new Run({ network: 'test' })

    const location = '7dca6829e7ffd1d5cd3db43955ab2c3b6f58900db03c4cd4e2d14e703dea5a18_o1'

    const X = await run.load(location)

    console.log(X)
    console.log(X.toString())

    await X.sync()

  })

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
})

// ------------------------------------------------------------------------------------------------
