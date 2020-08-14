/**
 * code.js
 *
 * Tests for Code functionality once deployed
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { Transaction } = require('bsv')
const Run = require('../env/run')
const { expectTx } = require('../env/misc')
const unmangle = require('../env/unmangle')
const { Code, Jig, Berry, LocalCache } = unmangle(Run)
const { payFor } = require('../env/misc')

// Written Tests:
//
// Jig
//  - Code methods not present
//  - Can assign properties to code methods (only upgrade)
//  - Getter that sets
//  - Ownership: Create object, pass into another method, set on other jig, then set on current jig => fail
//
// Code
//  - defineProperty disabled
//  - getters and setters either allowed, or not allowed
//  - Code methods cannot be deleted, or redefined, either from inside or outside
//  - Code that was previously deployed, so a ref
//  - Cannot set to "presets" or "deps" in a static method, or "sealed"? Or maybe you can set sealed.

// Code functions are not available inside functions
// Unfiled
// Constructing Code objects inside... they would normally construct sandbox. How to do base?
//      Need for arb objects
// Spend all stack when set
// Spend all stack when delete
// Spend all stack when create too
// Handle auth and destroy
// Borrowing
// Cache protocol
// Inheritance and upgrading parents
// TODO: Delete a parent class property from a child?
// Classes should always operate on themselves
// Test set properties on child when there is a similar property on parent class
// Same for delete. There's a comment in membrane about this.
// Call auth in a jig
// Owner is parent ... for new jigs
// Async updates

// TODO Deploy
//  -Presets are assigned on locals, but not until synced
//  -Failures, reverts

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// Methods available on all code instances
const CODE_METHODS = ['upgrade', 'sync', 'destroy', 'auth']

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

describe('Code', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // toString
  // --------------------------------------------------------------------------

  describe('toString', () => {
    it('should return source code for class', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(CA.toString().startsWith('class A')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('should return source code for function', () => {
      const run = new Run()
      function f () { }
      const cf = run.deploy(f)
      expect(cf.toString().startsWith('function f')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('should return source code for jig class', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      expect(CA.toString().startsWith('class A extends Jig')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('should return soure code for child code class', () => {
      const run = new Run()
      class A { }
      class B extends A { }
      const CB = run.deploy(B)
      expect(CB.toString().startsWith('class B')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('should return source code for child non-code class', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B extends CA { }
      expect(B.toString().startsWith('class B')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('should return same method for different code', () => {
      const run = new Run()
      class A { }
      function f () { }
      const CA = run.deploy(A)
      const cf = run.deploy(f)
      expect(CA.toString).to.equal(cf.toString)
      expect(CA.toString()).not.to.equal(cf.toString())
    })
  })

  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  describe('get', () => {
    it('adds invisible code methods to class', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CODE_METHODS.forEach(name => expect(typeof CA[name]).to.equal('function'))
      CODE_METHODS.forEach(name => expect(Object.getOwnPropertyNames(CA).includes(name)).to.equal(false))
    })

    // ------------------------------------------------------------------------

    it('adds invisible code methods to function', () => {
      const run = new Run()
      function f () { }
      const cf = run.deploy(f)
      CODE_METHODS.forEach(name => expect(typeof cf[name]).to.equal('function'))
      CODE_METHODS.forEach(name => expect(Object.getOwnPropertyNames(cf).includes(name)).to.equal(false))
    })

    // ------------------------------------------------------------------------

    it('code methods for class are always the same', () => {
      const run = new Run()
      class A { }
      class B { }
      const CA = run.deploy(A)
      const CB = run.deploy(B)
      expect(CA.upgrade).to.equal(CA.upgrade)
      expect(CA.sync).to.equal(CB.sync)
    })

    // ------------------------------------------------------------------------

    it('code methods for class are frozen', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CODE_METHODS.forEach(name => expect(Object.isFrozen(CA[name])))
    })

    // ------------------------------------------------------------------------

    it('does not have code methods', () => {
      CODE_METHODS.forEach(method => {
        expect(method in Jig).to.equal(false)
        expect(method in Berry).to.equal(false)
      })
    })

    // ------------------------------------------------------------------------

    it('same method is returned every time', () => {
      const run = new Run()
      class A { static f () { } }
      const CA = run.deploy(A)
      expect(typeof CA.f).to.equal('function')
      expect(CA.f).to.equal(CA.f)
    })

    // ------------------------------------------------------------------------

    it('same method is returned for child code', () => {
      const run = new Run()
      class A { static f () { } }
      const CA = run.deploy(A)
      class B extends CA {}
      const CB = run.deploy(B)
      expect(typeof CB.f).to.equal('function')
      expect(CB.f).to.equal(CA.f)
    })

    // ------------------------------------------------------------------------

    it('initial bindings are unreadable', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(() => CA.location).to.throw('Cannot read location: undetermined')
      expect(() => CA.origin).to.throw('Cannot read origin: undetermined')
      expect(() => CA.nonce).to.throw('Cannot read nonce: undetermined')
      expect(() => CA.owner).to.throw('Cannot read owner: unbound')
      expect(() => CA.satoshis).to.throw('Cannot read satoshis: unbound')
    })

    // ------------------------------------------------------------------------

    it('name is class or function name', () => {
      const run = new Run()
      class A { }
      expect(run.deploy(A).name).to.equal('A')
      function f () { }
      expect(run.deploy(f).name).to.equal('f')
      class B extends A { }
      expect(run.deploy(B).name).to.equal('B')
    })
  })

  // --------------------------------------------------------------------------
  // instanceof
  // --------------------------------------------------------------------------

  describe('instanceof', () => {
    it('deployed classes returns true', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(CA instanceof Code).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('deployed functions returns true', () => {
      const run = new Run()
      function f () { }
      const cf = run.deploy(f)
      expect(cf instanceof Code).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('non-code return false', () => {
      expect(class A { } instanceof Code).to.equal(false)
      expect(function f () { } instanceof Code).to.equal(false)
      expect(undefined instanceof Code).to.equal(false)
      expect(true instanceof Code).to.equal(false)
      expect({} instanceof Code).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('native code return true', () => {
      expect(Jig instanceof Code).to.equal(true)
      expect(Berry instanceof Code).to.equal(true)
    })
  })

  // --------------------------------------------------------------------------
  // getOwnPropertyDescriptor
  // --------------------------------------------------------------------------

  describe('getOwnPropertyDescriptor', () => {
    it('returned undefined for code methods', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CODE_METHODS.forEach(name => expect(Object.getOwnPropertyDescriptor(CA, name)).to.equal(undefined))
    })
  })

  // --------------------------------------------------------------------------
  // isExtensible
  // --------------------------------------------------------------------------

  describe('isExtensible', () => {
    it('returns true', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(Object.isExtensible(CA)).to.equal(true)
    })
  })

  // --------------------------------------------------------------------------
  // setPrototypeOf
  // --------------------------------------------------------------------------

  describe('setPrototypeOf', () => {
    it('throws if change externally', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(() => Object.setPrototypeOf(CA, {})).to.throw()
    })

    // ------------------------------------------------------------------------

    it.skip('throws if change internally', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('allowed to change on non-code child', () => {
      const run = new Run()
      class A {}
      const CA = run.deploy(A)
      class B extends CA { }
      Object.setPrototypeOf(B, {})
    })
  })

  // --------------------------------------------------------------------------
  // Destroy
  // --------------------------------------------------------------------------

  describe('destroy', () => {
    it('destroys code', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      function test (CA) {
        expect(CA.location.endsWith('_d0')).to.equal(true)
        expect(CA.owner).to.equal(null)
        expect(CA.satoshis).to.equal(0)
      }

      expectTx({
        nin: 1,
        nref: 0,
        nout: 0,
        ndel: 1,
        ncre: 0,
        exec: [
          {
            op: 'DESTROY',
            data: { $jig: 0 }
          }
        ]
      })

      expect(CA.destroy()).to.equal(CA)
      expect(CA.owner).to.equal(null)
      expect(CA.satoshis).to.equal(0)

      await CA.sync()
      test(CA)

      const CA2 = await run.load(CA.location)
      test(CA2)

      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('cannot destroy non-jig children', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      class B extends CA { }
      expect(() => B.destroy()).to.throw('Destroy unavailable')
    })

    // ------------------------------------------------------------------------

    it('destroy twice', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      CA.destroy()
      await CA.sync()
      const lastLocation = CA.location

      expect(CA.destroy()).to.equal(CA)
      await CA.sync()
      expect(CA.location).to.equal(lastLocation)
    })

    // ------------------------------------------------------------------------

    it('cannot destroy non-code', () => {
      const error = 'Destroy unavailable'
      expect(() => Code.prototype.destroy.call({})).to.throw(error)
      expect(() => Code.prototype.destroy.call(class A { })).to.throw(error)
      expect(() => Code.prototype.destroy.call(null)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it.skip('destroy in a static method', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('destroy code in a jig method', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('destroy multiple in a batch', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('create and destroy in same transaction', () => {

    })
  })

  // --------------------------------------------------------------------------
  // Auth
  // --------------------------------------------------------------------------

  describe('auth', () => {
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

    it('cannot auth non-jig children', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      class B extends CA { }
      expect(() => B.auth()).to.throw('Auth unavailable')
    })

    // ------------------------------------------------------------------------

    it('throws if auth jig destroyed in another transaction', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      CA.destroy()
      await CA.sync()

      expect(() => CA.auth()).to.throw('Cannot auth destroyed jig')
    })

    // ------------------------------------------------------------------------

    it('auth jig not synced', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CA.auth()
      await CA.sync()
    })

    // ------------------------------------------------------------------------

    it('cannot auth non-code', () => {
      const error = 'Auth unavailable'
      expect(() => Code.prototype.auth.call({})).to.throw(error)
      expect(() => Code.prototype.auth.call(class A { })).to.throw(error)
      expect(() => Code.prototype.auth.call(null)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it.skip('throws if auth jig destroyed in same transaction', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('auth in a static method', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('auth code in a jig method', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('auth multiple in a batch', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('create and auth in same transaction', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('throws if auth new jig', () => {

    })

    // ------------------------------------------------------------------------

    it.skip('throws if auth transferred jig', () => {

    })
  })

  describe.skip('caller', () => {
    // TODO
  })

  describe.skip('sync', () => {
    // Only waits for current record
    // TODO: Check records
    // TODO: Sync a destroyed jig

    it('deploys a class and syncs it', async () => {
      const run = new Run()
      class A {}
      run.deploy(A)
      await run.sync()
      const A2 = await run.load(A.location)
      expect(A2.toString()).to.equal(A.toString())
      expect(A2.origin).to.equal(A.origin)
      expect(A2.location).to.equal(A.location)
    })

    it('publishes after dependent transaction', async () => {
      const run = new Run()

      class A { }
      class B extends A { }
      A.B = B

      run.deploy(A)
      await run.sync()

      await run.load(A.location)

      const B2 = await run.load(B.location)

      class C extends B2 { }
      run.deploy(C)
      await run.sync()
    })

    it('should sync with warning when UTXO is incorrectly spent', async () => {
      const run = new Run()

      class A { }
      const C = run.deploy(A)

      await C.sync()
      const location = C.location

      const utxos = await run.blockchain.utxos(run.owner.address)
      const tx = new Transaction().from(utxos)
      const paid = await payFor(tx, run)
      const signed = paid.sign(run.owner.privkey)
      await run.blockchain.broadcast(signed.toString('hex'))

      await C.sync()
      expect(C.location).to.equal(location)
    })
  })
  describe.skip('activate', () => {
    it('simple activate test', async () => {
      const run = new Run()
      class A { }
      run.deploy(A)
      await run.sync()
      const location = A.location

      run.deactivate()
      expect(typeof A.location).to.equal('undefined')

      run.activate()
      expect(A.location).to.equal(location)
    })
  })

  describe.skip('call', () => {
    it('calls static get method on jig', async () => {
      const run = new Run()
      class A extends Jig { static f (x) { return 123 + x } }
      const C = run.deploy(A)
      await C.sync()
      expect(C.f(1)).to.equal(124)
      expect(C.origin).to.equal(C.location)
    })

    it('calls static set method on jig', async () => {
      const run = new Run()
      class A extends Jig { static f (x) { this.x = x } }
      const C = run.deploy(A)
      await C.sync()
      C.f(1)
      expect(C.x).to.equal(1)
      await C.sync()
      expect(C.location).not.to.equal(C.origin)

      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      const C2 = await run2.load(C.location)

      expect(C.location).to.equal(C2.location)
      expect(C.x).to.equal(C2.x)
    })

    // TODO: Move to deploy
    it('allowed to set native class as dependency', async () => {
      const run = new Run()
      class A extends Jig { static f (x) { this.x = x } }
      A.deps = { Jig }
      const C = run.deploy(A)
      await C.sync()
    })

    it('calls static method with passthrough and without this on non-jig', async () => {
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
  })

  describe.skip('get', () => {
    it('returns the same method twice', async () => {
      const run = new Run()
      class A { static f () { return 123 } }
      const C = run.deploy(A)
      await C.sync()
      expect(C.f).to.equal(C.f)
      expect(C.f()).to.equal(123)

      // Move these to separate tests
      // C.f.x = 1
      /*
      class B {
        static g () { this.x = 1 }
        static h () { this.g.x = 1 }
      }
      const D = run.deploy(B)
      await D.sync()
      // D.g()
      D.h()
      */
    })
  })
})

// ------------------------------------------------------------------------------------------------
