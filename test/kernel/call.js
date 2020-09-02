/**
 * call.js
 *
 * Tests for the call action
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Call
// ------------------------------------------------------------------------------------------------

describe('Call', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

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
    C.f(1)
    expect(C.x).to.equal(1)
    await C.sync()
    expect(C.location).not.to.equal(C.origin)

    function test (C2) {
      expect(C.location).to.equal(C2.location)
      expect(C.x).to.equal(C2.x)
    }

    const C2 = await run.load(C.location)
    test(C2)

    run.cache = new LocalCache()
    const C3 = await run.load(C.location)
    test(C3)
  })

  /*

    // ------------------------------------------------------------------------

    it('calls static method with passthrough and without this on arbitrary code', async () => {
      const run = new Run()
      class A {
        static f (x) {
          if (x !== Symbol.hasInstance) throw new Error()
          if (this) throw new Error()
          return Symbol.iterator
        }
      }
      const C = run.deploy(A)
      await C.sync()
      expect(C.f(Symbol.hasInstance)).to.equal(Symbol.iterator)
    })

    // ------------------------------------------------------------------------

    it('can only call static methods on class they are from', async () => {
      const run = new Run()

      class A extends Jig {
        static f () { this.f = 'a' }
        static g () { this.g = 'a' }
      }

      class B extends A {
        static g () { this.g = 'b' }
        static h () { this.h = 'b' }
      }

      const CA = run.deploy(A)
      await CA.sync()

      const CB = run.deploy(B)
      await CB.sync()
      // CB.h()
      // await CB.sync()
      // console.log(CB)
    })
    */
})

// ------------------------------------------------------------------------------------------------
