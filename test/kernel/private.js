/**
 * private.js
 *
 * Tests for private properties and methods on jigs
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Private
// ------------------------------------------------------------------------------------------------

describe('Private', () => {
  // --------------------------------------------------------------------------
  // Jig
  // --------------------------------------------------------------------------

  describe('Jig', () => {
    // ------------------------------------------------------------------------
    // has
    // ------------------------------------------------------------------------

    describe('has', () => {
      it('available internally', async () => {
        const run = new Run()
        class A extends Jig {
          init () { this._x = 1 }
          has () { return '_x' in this }
        }
        function test (a) { expect(a.has()).to.equal(true) }
        const a = new A()
        test(a)
        await a.sync()
        const a2 = await run.load(a.location)
        test(a2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        test(a3)
      })

      // ----------------------------------------------------------------------

      it('throws externally', async () => {
        const run = new Run()
        class A extends Jig { init () { this._x = 1 } }
        function test (a) { expect(() => ('_x' in a)).to.throw('Cannot access private property _x') }
        const a = new A()
        test(a)
        await a.sync()
        const a2 = await run.load(a.location)
        test(a2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        test(a3)
      })

      // ----------------------------------------------------------------------

      it('throws from another jig of different class', async () => {
        const run = new Run()
        class A extends Jig { init () { this._x = 1 } }
        class B extends Jig { has (a) { return '_x' in a }}
        function test (a, b) { expect(() => b.has(a)).to.throw('Cannot access private property _x') }
        const a = new A()
        const b = new B()
        test(a, b)
        await a.sync()
        const a2 = await run.load(a.location)
        const b2 = await run.load(b.location)
        test(a2, b2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        const b3 = await run.load(b.location)
        test(a3, b3)
      })

      // ----------------------------------------------------------------------

      it('throws from another jig of child class', async () => {
        const run = new Run()
        class A extends Jig { init () { this._x = 1 } }
        class B extends A { has (a) { return '_x' in a }}
        function test (a, b) { expect(() => b.has(a)).to.throw('Cannot access private property _x') }
        const a = new A()
        const b = new B()
        test(a, b)
        await a.sync()
        const a2 = await run.load(a.location)
        const b2 = await run.load(b.location)
        test(a2, b2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        const b3 = await run.load(b.location)
        test(a3, b3)
      })

      // ----------------------------------------------------------------------

      it('available from another jig of same class', async () => {
        const run = new Run()
        class A extends Jig {
          init () { this._x = 1 }
          has (a) { return '_x' in a }
        }
        function test (a, b) { expect(b.has(a)).to.equal(true) }
        const a = new A()
        const b = new A()
        test(a, b)
        await a.sync()
        const a2 = await run.load(a.location)
        const b2 = await run.load(b.location)
        test(a2, b2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        const b3 = await run.load(b.location)
        test(a3, b3)
      })
    })

    // ------------------------------------------------------------------------
    // get
    // ------------------------------------------------------------------------

    describe('get', () => {
      it('available internally', async () => {
        const run = new Run()
        class A extends Jig {
          init () { this._x = 1 }
          get () { return this._x }
        }
        function test (a) { expect(a.get()).to.equal(1) }
        const a = new A()
        test(a)
        await a.sync()
        const a2 = await run.load(a.location)
        test(a2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        test(a3)
      })

      // ----------------------------------------------------------------------

      it('throws externally', async () => {
        const run = new Run()
        class A extends Jig { init () { this._x = 1 } }
        function test (a) { expect(() => a._x).to.throw('Cannot access private property _x') }
        const a = new A()
        test(a)
        await a.sync()
        const a2 = await run.load(a.location)
        test(a2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        test(a3)
      })

      // ----------------------------------------------------------------------

      it('throws from another jig of different class', async () => {
        const run = new Run()
        class A extends Jig { init () { this._x = 1 } }
        class B extends Jig { get (a) { return a._x }}
        function test (a, b) { expect(() => b.get(a)).to.throw('Cannot access private property _x') }
        const a = new A()
        const b = new B()
        test(a, b)
        await a.sync()
        const a2 = await run.load(a.location)
        const b2 = await run.load(b.location)
        test(a2, b2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        const b3 = await run.load(b.location)
        test(a3, b3)
      })

      // ----------------------------------------------------------------------

      it('throws from another jig of parent class', async () => {
        const run = new Run()
        class B extends Jig { get (a) { return a._x }}
        class A extends B { init () { this._x = 1 } }
        function test (a, b) { expect(() => b.get(a)).to.throw('Cannot access private property _x') }
        const a = new A()
        const b = new B()
        test(a, b)
        await a.sync()
        const a2 = await run.load(a.location)
        const b2 = await run.load(b.location)
        test(a2, b2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        const b3 = await run.load(b.location)
        test(a3, b3)
      })

      // ----------------------------------------------------------------------

      it('available from another jig of same class', async () => {
        const run = new Run()
        class A extends Jig {
          init () { this._x = 1 }
          get (a) { return a._x }
        }
        function test (a, b) { expect(b.get(a)).to.equal(1) }
        const a = new A()
        const b = new A()
        test(a, b)
        await a.sync()
        const a2 = await run.load(a.location)
        const b2 = await run.load(b.location)
        test(a2, b2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        const b3 = await run.load(b.location)
        test(a3, b3)
      })
    })

    // ------------------------------------------------------------------------
    // getOwnPropertyDescriptor
    // ------------------------------------------------------------------------

    describe('getOwnPropertyDescriptor', () => {
      it('available internally', async () => {
        const run = new Run()
        class A extends Jig {
          init () { this._x = 1 }
          get () { return Object.getOwnPropertyDescriptor(this, '_x').value }
        }
        function test (a) { expect(a.get()).to.equal(1) }
        const a = new A()
        test(a)
        await a.sync()
        const a2 = await run.load(a.location)
        test(a2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        test(a3)
      })

      // ----------------------------------------------------------------------

      it('throws externally', async () => {
        const run = new Run()
        class A extends Jig { init () { this._x = 1 } }
        function test (a) {
          expect(() => Object.getOwnPropertyDescriptor(a, '_x').value)
            .to.throw('Cannot access private property _x')
        }
        const a = new A()
        test(a)
        await a.sync()
        const a2 = await run.load(a.location)
        test(a2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        test(a3)
      })

      // ----------------------------------------------------------------------

      it('throws from another jig of different class', async () => {
        const run = new Run()
        class A extends Jig { init () { this._x = 1 } }
        class B extends Jig { get (a) { return Object.getOwnPropertyDescriptor(a, '_x').value }}
        function test (a, b) { expect(() => b.get(a)).to.throw('Cannot access private property _x') }
        const a = new A()
        const b = new B()
        test(a, b)
        await a.sync()
        const a2 = await run.load(a.location)
        const b2 = await run.load(b.location)
        test(a2, b2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        const b3 = await run.load(b.location)
        test(a3, b3)
      })

      // ----------------------------------------------------------------------

      it('available from another jig of same class', async () => {
        const run = new Run()
        class A extends Jig {
          init () { this._x = 1 }
          get (a) { return Object.getOwnPropertyDescriptor(a, '_x').value }
        }
        function test (a, b) { expect(b.get(a)).to.equal(1) }
        const a = new A()
        const b = new A()
        test(a, b)
        await a.sync()
        const a2 = await run.load(a.location)
        const b2 = await run.load(b.location)
        test(a2, b2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        const b3 = await run.load(b.location)
        test(a3, b3)
      })
    })

    // ------------------------------------------------------------------------
    // ownKeys
    // ------------------------------------------------------------------------

    describe('ownKeys', () => {
      it('includes internally', async () => {
        const run = new Run()
        class A extends Jig {
          init () { this._x = 1 }
          includes () { return Reflect.ownKeys(this).includes('_x') }
        }
        function test (a) { expect(a.includes()).to.equal(true) }
        const a = new A()
        test(a)
        await a.sync()
        const a2 = await run.load(a.location)
        test(a2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        test(a3)
      })

      // ----------------------------------------------------------------------

      it('filters externally', async () => {
        const run = new Run()
        class A extends Jig { init () { this._x = 1 } }
        function test (a) { expect(Reflect.ownKeys(a).includes('_x')).to.equal(false) }
        const a = new A()
        test(a)
        await a.sync()
        const a2 = await run.load(a.location)
        test(a2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        test(a3)
      })

      // ----------------------------------------------------------------------

      it('filters from another jig of different class', async () => {
        const run = new Run()
        class A extends Jig { init () { this._x = 1 } }
        class B extends Jig { includes (a) { return Reflect.ownKeys(a).includes('_x') } }
        function test (a, b) { expect(b.includes(a)).to.equal(false) }
        const a = new A()
        const b = new B()
        test(a, b)
        await a.sync()
        const a2 = await run.load(a.location)
        const b2 = await run.load(b.location)
        test(a2, b2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        const b3 = await run.load(b.location)
        test(a3, b3)
      })

      // ----------------------------------------------------------------------

      it('includes from another jig of same class', async () => {
        const run = new Run()
        class A extends Jig {
          init () { this._x = 1 }
          includes (a) { return Reflect.ownKeys(a).includes('_x') }
        }
        function test (a, b) { expect(b.includes(a)).to.equal(true) }
        const a = new A()
        const b = new A()
        test(a, b)
        await a.sync()
        const a2 = await run.load(a.location)
        const b2 = await run.load(b.location)
        test(a2, b2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        const b3 = await run.load(b.location)
        test(a3, b3)
      })
    })

    // ------------------------------------------------------------------------
    // Method
    // ------------------------------------------------------------------------

    describe('Method', () => {
      it('available internally', async () => {
        const run = new Run()
        class A extends Jig {
          f () { return this._g() }
          _g () { return 1 }
        }
        function test (a) { expect(a.f()).to.equal(1) }
        const a = new A()
        test(a)
        await a.sync()
        const a2 = await run.load(a.location)
        test(a2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        test(a3)
      })

      // ----------------------------------------------------------------------

      it('throws externally', async () => {
        const run = new Run()
        class A extends Jig { _f () { return 1 } }
        function test (a) { expect(() => a._f()).to.throw('Cannot access private property _f') }
        const a = new A()
        test(a)
        await a.sync()
        const a2 = await run.load(a.location)
        test(a2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        test(a3)
      })

      // ----------------------------------------------------------------------

      it('throws from different jig of different class', async () => {
        const run = new Run()
        class A extends Jig { _g () { return 1 } }
        class B extends Jig { f (a) { return a._g() } }
        function test (a, b) { expect(() => b.f(a)).to.throw('Cannot access private property _g') }
        const a = new A()
        const b = new B()
        test(a, b)
        await a.sync()
        const a2 = await run.load(a.location)
        const b2 = await run.load(b.location)
        test(a2, b2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        const b3 = await run.load(b.location)
        test(a3, b3)
      })

      // ----------------------------------------------------------------------

      it('available from different jig of same class', async () => {
        const run = new Run()
        class A extends Jig {
          _g () { return 1 }
          f (a) { return a._g() }
        }
        function test (a, b) { expect(b.f(a)).to.equal(1) }
        const a = new A()
        const b = new A()
        test(a, b)
        await a.sync()
        const a2 = await run.load(a.location)
        const b2 = await run.load(b.location)
        test(a2, b2)
        run.cache = new LocalCache()
        const a3 = await run.load(a.location)
        const b3 = await run.load(b.location)
        test(a3, b3)
      })
    })
  })

  // --------------------------------------------------------------------------
  // Code
  // --------------------------------------------------------------------------

  describe('Code', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
