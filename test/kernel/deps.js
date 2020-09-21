/**
 * deps.js
 *
 * Tests for changing code deps dynamically
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Deps
// ------------------------------------------------------------------------------------------------

describe('Deps', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // Code
  // --------------------------------------------------------------------------

  describe('Code', () => {
    it('set deps from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { return B } // eslint-disable-line
        static g () { B = 2 } // eslint-disable-line
        static h () { A.deps.B = 3 }
      }
      A.deps = { B: 1 }

      const CA = run.deploy(A)
      expect(CA.f()).to.equal(1)
      await CA.sync()
      expect(CA.nonce).to.equal(1)

      CA.g()
      await CA.sync()
      expect(CA.f()).to.equal(2)
      expect(CA.deps.B).to.equal(2)
      expect(CA.nonce).to.equal(2)

      CA.h()
      expect(CA.f()).to.equal(3)
      expect(CA.deps.B).to.equal(3)
      await CA.sync()
      expect(CA.nonce).to.equal(3)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(3)
      expect(CA2.deps.B).to.equal(3)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(3)
      expect(CA3.deps.B).to.equal(3)
    })

    // ------------------------------------------------------------------------

    it('throws if set deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      A.deps = { B: 1 }
      const CA = run.deploy(A)
      expect(() => { CA.deps.B = 1 }).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('set inner deps from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { return B.n } // eslint-disable-line
        static g () { B.n = 2 } // eslint-disable-line
        static h () { A.deps.B.n = 3 }
      }
      A.deps = { B: { n: 1 } }

      const CA = run.deploy(A)
      expect(CA.f()).to.equal(1)
      await CA.sync()
      expect(CA.nonce).to.equal(1)

      CA.g()
      await CA.sync()
      expect(CA.f()).to.equal(2)
      expect(CA.deps.B.n).to.equal(2)
      expect(CA.nonce).to.equal(2)

      CA.h()
      expect(CA.f()).to.equal(3)
      expect(CA.deps.B.n).to.equal(3)
      await CA.sync()
      expect(CA.nonce).to.equal(3)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(3)
      expect(CA2.deps.B.n).to.equal(3)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(3)
      expect(CA3.deps.B.n).to.equal(3)
    })

    // ------------------------------------------------------------------------

    it('set inner intrinsic deps from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { return B.get(1) } // eslint-disable-line
        static g () { A.deps.B.set(1, 2) }
      }
      A.deps = { B: new Map() }

      const CA = run.deploy(A)
      await CA.sync()
      expect(CA.nonce).to.equal(1)

      CA.g()
      await CA.sync()
      expect(CA.f()).to.equal(2)
      expect(CA.deps.B.get(1)).to.equal(2)
      expect(CA.nonce).to.equal(2)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(2)
      expect(CA2.deps.B.get(1)).to.equal(2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(2)
      expect(CA3.deps.B.get(1)).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('throws if set inner deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      A.deps = { B: [0] }
      const CA = run.deploy(A)
      expect(() => { CA.deps.B[0] = 1 }).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('add deps from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { return B } // eslint-disable-line
        static g () { A.deps.B = 1 }
      }

      const CA = run.deploy(A)
      await CA.sync()
      expect(CA.nonce).to.equal(1)

      CA.g()
      await CA.sync()
      expect(CA.f()).to.equal(1)
      expect(CA.deps.B).to.equal(1)
      expect(CA.nonce).to.equal(2)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(1)
      expect(CA2.deps.B).to.equal(1)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(1)
      expect(CA3.deps.B).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('throws if add deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      expect(() => { CA.deps.B = 1 }).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('throws if add inner deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      A.deps = { B: { } }
      const CA = run.deploy(A)
      expect(() => { CA.deps.B.n = 1 }).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('delete deps from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { return typeof B !== 'undefined' ? B : undefined } // eslint-disable-line
        static g () { delete A.deps.B } // eslint-disable-line
      }
      A.deps = { B: 1 }

      const CA = run.deploy(A)
      expect(CA.f()).to.equal(1)
      await CA.sync()
      expect(CA.nonce).to.equal(1)

      CA.g()
      await CA.sync()
      expect(CA.f()).to.equal(undefined)
      expect(typeof CA.deps.B).to.equal('undefined')
      expect(CA.nonce).to.equal(2)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(undefined)
      expect(typeof CA2.deps.B).to.equal('undefined')

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(undefined)
      expect(typeof CA3.deps.B).to.equal('undefined')
    })

    // ------------------------------------------------------------------------

    it('throws if delete deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      A.deps = { B: { } }
      const CA = run.deploy(A)
      expect(() => { delete CA.deps.B }).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('delete inner deps from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { return B.n } // eslint-disable-line
        static g () { delete A.deps.B.n } // eslint-disable-line
      }
      A.deps = { B: { n: 1 } }

      const CA = run.deploy(A)
      expect(CA.f()).to.equal(1)
      await CA.sync()
      expect(CA.nonce).to.equal(1)

      CA.g()
      await CA.sync()
      expect(CA.f()).to.equal(undefined)
      expect(typeof CA.deps.B.n).to.equal('undefined')
      expect(CA.nonce).to.equal(2)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(undefined)
      expect(typeof CA2.deps.B.n).to.equal('undefined')

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(undefined)
      expect(typeof CA3.deps.B.n).to.equal('undefined')
    })

    // ------------------------------------------------------------------------

    it('throws if delete inner deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      A.deps = { B: { n: 1 } }
      class B extends A { static f () { delete A.deps.B.n } }
      const CB = run.deploy(B)
      expect(() => CB.f()).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('define deps from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { return B } // eslint-disable-line
        static g () { Object.defineProperty(A.deps, 'B', { configurable: true, enumerable: true, writable: true, value: 2 }) }
      }
      A.deps = { B: 1 }

      const CA = run.deploy(A)
      expect(CA.f()).to.equal(1)
      await CA.sync()
      expect(CA.nonce).to.equal(1)

      CA.g()
      await CA.sync()
      expect(CA.f()).to.equal(2)
      expect(CA.deps.B).to.equal(2)
      expect(CA.nonce).to.equal(2)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(2)
      expect(CA2.deps.B).to.equal(2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(2)
      expect(CA3.deps.B).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('throws if define deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      const desc = { configurable: true, enumerable: true, writable: true, value: 1 }
      expect(() => Object.defineProperty(CA.deps, 'B', desc)).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('define inner deps from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static f () { return B[0] } // eslint-disable-line
        static g () { Object.defineProperty(A.deps.B, '0', { configurable: true, enumerable: true, writable: true, value: 2 }) }
      }
      A.deps = { B: [1] }

      const CA = run.deploy(A)
      expect(CA.f()).to.equal(1)
      await CA.sync()
      expect(CA.nonce).to.equal(1)

      CA.g()
      await CA.sync()
      expect(CA.f()).to.equal(2)
      expect(CA.deps.B[0]).to.equal(2)
      expect(CA.nonce).to.equal(2)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(2)
      expect(CA2.deps.B[0]).to.equal(2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(2)
      expect(CA3.deps.B[0]).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('throws if define inner deps from outside', () => {
      const run = new Run()
      class A extends Jig { }
      A.deps = { B: { } }
      const CA = run.deploy(A)
      const desc = { configurable: true, enumerable: true, writable: true, value: 1 }
      expect(() => Object.defineProperty(CA.deps.B, 'n', desc)).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('set caller dep', async () => {
      const run = new Run()
      class A extends Jig {
        static f() { return caller } // eslint-disable-line
        static g () { A.deps.caller = 1 }
        static h () { caller = 2 } // eslint-disable-line
      }
      const CA = run.deploy(A)
      expect(CA.f()).to.equal(null)
      expect(typeof CA.deps.caller).to.equal('undefined')

      CA.g()
      expect(CA.f()).to.equal(1)
      expect(CA.deps.caller).to.equal(1)
      await run.sync()
      expect(CA.nonce).to.equal(2)

      CA.h()
      expect(CA.f()).to.equal(2)
      expect(CA.deps.caller).to.equal(2)
      await run.sync()
      expect(CA.nonce).to.equal(3)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(2)
      expect(CA2.deps.caller).to.equal(2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(2)
      expect(CA3.deps.caller).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('delete caller dep', async () => {
      const run = new Run()
      class A extends Jig {
        static f() { return caller } // eslint-disable-line
        static g () { delete A.deps.caller }
      }
      A.deps = { caller: 1 }
      const CA = run.deploy(A)
      expect(CA.f()).to.equal(1)
      expect(CA.deps.caller).to.equal(1)

      CA.g()
      expect(CA.f()).to.equal(null)
      expect(typeof CA.deps.caller).to.equal('undefined')
      await run.sync()
      expect(CA.nonce).to.equal(2)

      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(null)
      expect(typeof CA2.deps.caller).to.equal('undefined')

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(null)
      expect(typeof CA3.deps.caller).to.equal('undefined')
    })

    // ------------------------------------------------------------------------

    it('private deps available from inside', async () => {
      const run = new Run()
      class A extends Jig {
        static f() { return _B } // eslint-disable-line
        static g() { return this.deps._B } // eslint-disable-line
        static h() { _B = 2 } // eslint-disable-line
      }
      A.deps = { _B: 1 }
      const CA = run.deploy(A)
      expect(CA.f()).to.equal(1)
      expect(CA.g()).to.equal(1)
      CA.h()
      expect(CA.f()).to.equal(2)
      await run.sync()
      const CA2 = await run.load(CA.location)
      expect(CA2.f()).to.equal(2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      expect(CA3.f()).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('private deps unavailable from outside', async () => {
      const run = new Run()
      class A extends Jig { }
      A.deps = { _B: 1 }
      class B extends A { static f (A) { return A.deps._B } }
      const CA = run.deploy(A)
      const CB = run.deploy(B)
      expect(() => CA.deps._B).to.throw('Cannot access private property _B')
      expect(() => CB.f(CA)).to.throw('Cannot access private property _B')
      await run.sync()
      run.cache = new LocalCache()
      const CA2 = await run.load(CA.location)
      const CB2 = await run.load(CB.location)
      expect(() => CA2.deps._B).to.throw('Cannot access private property _B')
      expect(() => CB2.f(CA)).to.throw('Cannot access private property _B')
    })

    // ------------------------------------------------------------------------

    it('throws if delete deps object', () => {
      const run = new Run()
      class A extends Jig { static f () { delete this.deps } }
      const CA = run.deploy(A)
      expect(() => CA.f()).to.throw('Cannot delete deps')
    })

    // ------------------------------------------------------------------------

    it('throws if set deps object', () => {
      const run = new Run()
      class A extends Jig { static f () { this.deps = {} } }
      const CA = run.deploy(A)
      expect(() => CA.f()).to.throw('Cannot set deps')
    })

    // ------------------------------------------------------------------------

    it('throws if define deps object', () => {
      const run = new Run()
      class A extends Jig {
        static f () {
          Object.defineProperty(this, 'deps', { configurable: true, enumerable: true, writable: true, value: 2 })
        }
      }
      const CA = run.deploy(A)
      expect(() => CA.f()).to.throw('Cannot define deps')
    })

    // ------------------------------------------------------------------------

    it('throws if set prototype of deps object', () => {
      const run = new Run()
      class A extends Jig { static f () { Object.setPrototypeOf(A.deps, {}) } }
      const CA = run.deploy(A)
      expect(() => CA.f()).to.throw('setPrototypeOf disabled')
    })

    // ------------------------------------------------------------------------

    it.skip('throws if define getter deps', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('throws if define non-configurable deps', () => {

    })
  })

  // --------------------------------------------------------------------------
  // Static code
  // --------------------------------------------------------------------------

  describe('Static code', () => {
    // Cannot be changed
  })

  // ------
  // TODO after upgrade
  // Syncs
  // Unifies
})

// ------------------------------------------------------------------------------------------------
