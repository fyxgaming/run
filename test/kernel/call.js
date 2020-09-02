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
})

// ------------------------------------------------------------------------------------------------
