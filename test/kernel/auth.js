/**
 * auth.js
 *
 * Tests for auth functionality
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { PrivateKey } = require('bsv')
const Run = require('../env/run')
const { Jig } = Run
const { expectTx } = require('../env/misc')
const unmangle = require('../env/unmangle')
const { stub } = require('sinon')
const { Code, LocalCache } = unmangle(Run)

// ------------------------------------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------------------------------------

describe('Auth', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // Code
  // --------------------------------------------------------------------------

  describe('Code', () => {
    it('spends code', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      function test (CA) {
        expect(CA.origin).not.to.equal(CA.location)
      }

      expectTx({
        nin: 1,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'AUTH',
            data: { $jig: 0 }
          }
        ]
      })

      expect(CA.auth()).to.equal(CA)
      await CA.sync()
      test(CA)

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('auths jig in method', async () => {
      const run = new Run()

      class A extends Jig { static f (b) { b.auth() } }
      class B extends Jig { }
      const CA = run.deploy(A)
      const b = new B()
      await CA.sync()
      await b.sync()

      expectTx({
        nin: 2,
        nref: 1,
        nout: 2,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 1 }, 'f', [{ $jig: 0 }]]
          }
        ]
      })

      function test (b) {
        expect(b.location).not.to.equal(b.origin)
      }

      CA.f(b)
      await CA.sync()
      test(b)

      const b2 = await run.load(b.location)
      test(b2)

      run.cache = new LocalCache()
      const b3 = await run.load(b.location)
      test(b3)
    })

    // --------------------------------------------------------------------------

    it('throws if auth jig destroyed in another transaction', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      CA.destroy()
      await CA.sync()

      expect(() => CA.auth()).to.throw('Cannot auth destroyed jig')
    })

    // --------------------------------------------------------------------------

    it('auth jig not synced', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CA.auth()
      await CA.sync()
    })

    // ------------------------------------------------------------------------

    it('auth in a static method', async () => {
      const run = new Run()
      class A { static f () { A.auth() } }
      const CA = run.deploy(A)
      await CA.sync()

      expectTx({
        nin: 1,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'AUTH',
            data: { $jig: 0 }
          }
        ]
      })

      CA.f()
      await CA.sync()
      await run.load(CA.location)
      run.cache = new LocalCache()
      await run.load(CA.location)
    })

    // ------------------------------------------------------------------------

    it('throws if auth non-code', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      const error = 'auth unavailable'
      expect(() => CA.auth.apply(A, [])).to.throw('auth unavailable')
      expect(() => Code.prototype.auth.call({})).to.throw(error)
      expect(() => Code.prototype.auth.call(class A { })).to.throw(error)
      expect(() => Code.prototype.auth.call(null)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if auth non-code children', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      await CA.sync()
      class B extends CA { }
      expect(() => B.auth()).to.throw('auth unavailable')
      expect(() => Code.prototype.auth.call(B)).to.throw('auth unavailable')
    })

    // ------------------------------------------------------------------------

    it('rollback if error', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      await CA.sync()
      stub(run.blockchain, 'broadcast').throwsException()
      CA.auth()
      await expect(CA.sync()).to.be.rejected
      expect(CA.location).to.equal(CA.origin)
      expect(CA.nonce).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it.skip('auth multiple in a batch', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('throws if send then auth in batch', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if destroy then auth in batch', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Jig
  // --------------------------------------------------------------------------

  describe('Jig', () => {
    it('auths jig', async () => {
      const run = new Run()

      class A extends Jig { }
      const a = new A()
      await a.sync()

      function test (CA) {
        expect(CA.origin).not.to.equal(CA.location)
      }

      expectTx({
        nin: 1,
        nref: 0,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'AUTH',
            data: { $jig: 0 }
          }
        ]
      })

      expect(a.auth()).to.equal(a)
      await a.sync()
      test(a)

      const a2 = await run.load(a.location)
      test(a2)

      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    })

    // ------------------------------------------------------------------------

    it('auths code in method', async () => {
      const run = new Run()

      class A extends Jig { f (B) { B.auth() } }
      class B { }
      const a = new A()
      const CB = run.deploy(B)
      await a.sync()
      await CB.sync()

      expectTx({
        nin: 2,
        nref: 1,
        nout: 2,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'CALL',
            data: [{ $jig: 1 }, 'f', [{ $jig: 0 }]]
          }
        ]
      })

      function test (B) {
        expect(B.location).not.to.equal(B.origin)
      }

      a.f(CB)
      await a.sync()
      test(CB)

      const CB2 = await run.load(CB.location)
      test(CB2)

      run.cache = new LocalCache()
      const CB3 = await run.load(CB.location)
      test(CB3)
    })

    // ------------------------------------------------------------------------

    it('throws if auth non-jig', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      expect(() => a.auth.apply({}, [])).to.throw('auth unavailable')
      expect(() => Jig.prototype.auth.apply(A, [])).to.throw('auth unavailable')
    })

    // ------------------------------------------------------------------------

    it('throws if undeployed', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { init () { this.auth() } }
      expect(() => new A()).to.throw('auth unavailable')
    })

    // ------------------------------------------------------------------------

    it('send and auth in same method', async () => {
      // auth is a request to happen on the owner at method start
      new Run() // eslint-disable-line
      class A extends Jig { f (owner) { this.owner = owner; this.auth() } }
      const a = new A()
      await a.sync()
      const owner = new PrivateKey().toPublicKey().toString()
      expect(() => a.f(owner)).not.to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if destroy and auth in same method', async () => {
      // destroy is a request to happen after the method ends
      new Run() // eslint-disable-line
      class A extends Jig { f () { this.destroy(); this.auth() } }
      const a = new A()
      await a.sync()
      expect(() => a.f()).not.to.throw()
    })

    // ------------------------------------------------------------------------

    it('auth twice in same method', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { this.auth(); this.auth() } }
      const a = new A()
      await a.sync()
      expect(() => a.f()).not.to.throw()
    })
  })

  // --------------------------------------------------------------------------
  // Berry
  // --------------------------------------------------------------------------

  describe('Berry', () => {
    it.skip('throws if auth undeployed berry class', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
